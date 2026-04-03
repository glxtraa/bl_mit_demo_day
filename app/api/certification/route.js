import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { listSensorRecords } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

const ROOT = process.cwd();
const schoolsPath = path.join(ROOT, 'public/data/schools.cleaned.json');
const basinsPath = path.join(ROOT, 'public/data/hydrobasins_l6_schools.geojson');

function quarterFromDate(dateLike) {
  const d = new Date(dateLike);
  const month = Number.isNaN(d.getTime()) ? 1 : d.getUTCMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractLegacyType(filename = '') {
  const parts = String(filename).split('/');
  return parts[1] || 'unknown';
}

function normalizeLocalRecord(record) {
  const data = record?.data || {};
  return {
    id: record?.id || crypto.randomUUID(),
    type: record?.type || 'unknown',
    deviceId: data?.tlaloque_id || null,
    timestamp: toIso(data?.used_at || data?.catched_at || record?.createdAt),
    pulses: Number.isFinite(Number(data?.pulses)) ? Number(data.pulses) : null,
    meters: Number.isFinite(Number(data?.meters)) ? Number(data.meters) : null,
    createdAt: toIso(record?.createdAt),
    source: 'local-store'
  };
}

function normalizeLegacyRecord(record) {
  const content = record?.content || {};
  const data = content?.data || {};
  return {
    id: content?.id || crypto.randomUUID(),
    type: extractLegacyType(record?.filename),
    deviceId: data?.tlaloque_id || null,
    timestamp: toIso(data?.used_at || data?.catched_at || content?.created_at || record?.uploadedAt),
    pulses: Number.isFinite(Number(data?.pulses)) ? Number(data.pulses) : null,
    meters: Number.isFinite(Number(data?.meters)) ? Number(data.meters) : null,
    createdAt: toIso(content?.created_at || record?.uploadedAt),
    source: 'sscap-api'
  };
}

function pointInRing(lon, lat, ring = []) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (
      yi !== undefined &&
      yj !== undefined &&
      xi !== undefined &&
      xj !== undefined &&
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lon, lat, geometry) {
  if (!geometry?.type || !Array.isArray(geometry?.coordinates)) return false;
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates;
    if (!pointInRing(lon, lat, outer)) return false;
    return !holes.some((hole) => pointInRing(lon, lat, hole));
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => {
      const [outer, ...holes] = poly;
      if (!pointInRing(lon, lat, outer)) return false;
      return !holes.some((hole) => pointInRing(lon, lat, hole));
    });
  }
  return false;
}

function basinIdFromFeature(feature, fallback = 'UNIDENTIFIED') {
  return (
    feature?.properties?.BASIN_ID ||
    feature?.properties?.PFAF_ID ||
    feature?.properties?.HYBAS_ID ||
    feature?.properties?.name ||
    fallback
  );
}

export async function GET() {
  try {
    const schools = fs.existsSync(schoolsPath) ? JSON.parse(fs.readFileSync(schoolsPath, 'utf8')) : [];
    const basins = fs.existsSync(basinsPath) ? JSON.parse(fs.readFileSync(basinsPath, 'utf8')) : { features: [] };
    const localRecords = listSensorRecords().map(normalizeLocalRecord);

    const sources = [{ name: 'local-store', fetched: localRecords.length }];
    const all = [...localRecords];

    if (process.env.SSCAP_API_BASE_URL) {
      try {
        const base = process.env.SSCAP_API_BASE_URL.replace(/\/$/, '');
        const res = await fetch(`${base}/api/download`, {
          headers: process.env.SSCAP_API_TOKEN ? { authorization: `Bearer ${process.env.SSCAP_API_TOKEN}` } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          const remoteList = Array.isArray(json?.records)
            ? json.records.map(normalizeLocalRecord)
            : Array.isArray(json?.data)
              ? json.data.map(normalizeLegacyRecord)
              : [];
          all.push(...remoteList);
          sources.push({ name: 'sscap-api', fetched: remoteList.length, endpoint: `${base}/api/download` });
        } else {
          sources.push({ name: 'sscap-api', fetched: 0, error: `HTTP ${res.status}` });
        }
      } catch (error) {
        sources.push({ name: 'sscap-api', fetched: 0, error: String(error?.message || error) });
      }
    }

    const deduped = [];
    const seen = new Set();
    const sorted = all
      .filter((r) => r.deviceId && r.timestamp && r.type !== 'unknown')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    for (const r of sorted) {
      const key = [r.type, r.deviceId, r.timestamp, r.pulses ?? '', r.meters ?? ''].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    const schoolByDevice = new Map(
      schools
        .filter((s) => s?.meter?.deviceId)
        .map((s) => [s.meter.deviceId, { schoolId: s.schoolId, schoolName: s.schoolName, lat: s.lat, lon: s.lon, fallbackBasinId: s.basinId }])
    );

    const enriched = deduped.map((r) => {
      const school = schoolByDevice.get(r.deviceId) || null;
      const lat = school?.lat;
      const lon = school?.lon;
      let basinId = school?.fallbackBasinId || 'UNIDENTIFIED';
      if (typeof lat === 'number' && typeof lon === 'number') {
        const match = (basins?.features || []).find((f) => pointInPolygon(lon, lat, f?.geometry));
        if (match) {
          basinId = basinIdFromFeature(match, basinId);
        }
      }
      return {
        ...r,
        schoolId: school?.schoolId || null,
        schoolName: school?.schoolName || null,
        lat: typeof lat === 'number' ? lat : null,
        lon: typeof lon === 'number' ? lon : null,
        basinId
      };
    });

    const aggMap = new Map();
    for (const r of enriched) {
      if (r.type !== 'utilizado' || !Number.isFinite(r.pulses)) continue;
      const quarter = quarterFromDate(r.timestamp);
      const key = `${r.basinId}::${quarter}`;
      const usedM3 = Math.max(0, Number((r.pulses / 100).toFixed(3)));
      if (!aggMap.has(key)) {
        aggMap.set(key, {
          basinId: r.basinId,
          quarter,
          usedM3: 0,
          eligibleM3: 0,
          records: 0,
          schools: new Set(),
          devices: new Set()
        });
      }
      const row = aggMap.get(key);
      row.usedM3 += usedM3;
      row.records += 1;
      if (r.schoolId) row.schools.add(r.schoolId);
      row.devices.add(r.deviceId);
    }

    const aggregates = [...aggMap.values()]
      .map((row) => ({
        basinId: row.basinId,
        quarter: row.quarter,
        usedM3: Number(row.usedM3.toFixed(2)),
        eligibleM3: Number((row.usedM3 * 0.85).toFixed(2)),
        records: row.records,
        schoolIds: [...row.schools],
        deviceIds: [...row.devices]
      }))
      .sort((a, b) => a.basinId.localeCompare(b.basinId) || a.quarter.localeCompare(b.quarter));

    const basinTotalsMap = new Map();
    for (const row of aggregates) {
      if (!basinTotalsMap.has(row.basinId)) {
        basinTotalsMap.set(row.basinId, { basinId: row.basinId, usedM3: 0, eligibleM3: 0, records: 0 });
      }
      const t = basinTotalsMap.get(row.basinId);
      t.usedM3 += row.usedM3;
      t.eligibleM3 += row.eligibleM3;
      t.records += row.records;
    }
    const basinTotals = [...basinTotalsMap.values()]
      .map((t) => ({
        ...t,
        usedM3: Number(t.usedM3.toFixed(2)),
        eligibleM3: Number(t.eligibleM3.toFixed(2))
      }))
      .sort((a, b) => b.usedM3 - a.usedM3);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      pipeline: {
        fetched: all.length,
        deduplicated: deduped.length,
        duplicatesRemoved: all.length - deduped.length,
        mappedToSchools: enriched.filter((r) => r.schoolId).length,
        mappedToBasins: enriched.filter((r) => r.basinId && r.basinId !== 'UNIDENTIFIED').length
      },
      sources,
      records: enriched,
      aggregates,
      basinTotals
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to build certification dataset' }, { status: 500 });
  }
}
