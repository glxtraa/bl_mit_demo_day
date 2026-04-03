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
    source: record?.source || 'local-store'
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
    source: record?.source || 'sscap-api'
  };
}

function normalizeGenericRecord(record) {
  if (record?.data && record?.type) return normalizeLocalRecord(record);
  if (record?.content && record?.filename) return normalizeLegacyRecord(record);
  if (record?.deviceId && record?.type) {
    return {
      id: record?.id || crypto.randomUUID(),
      type: record.type,
      deviceId: record.deviceId,
      timestamp: toIso(record.timestamp),
      pulses: Number.isFinite(Number(record?.pulses)) ? Number(record.pulses) : null,
      meters: Number.isFinite(Number(record?.meters)) ? Number(record.meters) : null,
      createdAt: toIso(record.createdAt || record.timestamp),
      source: record?.source || 'uploaded-file'
    };
  }
  return null;
}

function extractAndNormalizeRecords(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    const normalized = input.map(normalizeGenericRecord).filter(Boolean);
    if (normalized.length) return normalized;

    // Support weekly simulation payload rows where each row carries captado/utilizado/nivel objects.
    const expanded = [];
    for (const row of input) {
      if (!row?.captado?.tlaloque_id || !row?.utilizado?.tlaloque_id || !row?.nivel?.tlaloque_id) continue;
      expanded.push(
        normalizeGenericRecord({
          type: 'captado',
          deviceId: row.captado.tlaloque_id,
          pulses: row.captado.pulses,
          timestamp: row.captado.catched_at,
          createdAt: row.captado.catched_at,
          source: 'uploaded-weekly-payload'
        }),
        normalizeGenericRecord({
          type: 'utilizado',
          deviceId: row.utilizado.tlaloque_id,
          pulses: row.utilizado.pulses,
          timestamp: row.utilizado.used_at,
          createdAt: row.utilizado.used_at,
          source: 'uploaded-weekly-payload'
        }),
        normalizeGenericRecord({
          type: 'nivel',
          deviceId: row.nivel.tlaloque_id,
          meters: row.nivel.meters,
          timestamp: row.nivel.catched_at,
          createdAt: row.nivel.catched_at,
          source: 'uploaded-weekly-payload'
        })
      );
    }
    return expanded.filter(Boolean);
  }
  if (Array.isArray(input?.records)) {
    const direct = input.records.map(normalizeGenericRecord).filter(Boolean);
    if (direct.length) return direct;
    return extractAndNormalizeRecords(input.records);
  }
  if (Array.isArray(input?.data)) return input.data.map(normalizeLegacyRecord).filter(Boolean);
  if (input?.downloadPayload) return extractAndNormalizeRecords(input.downloadPayload);
  return [];
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
  return String(
    feature?.properties?.BASIN_ID ||
    feature?.properties?.PFAF_ID ||
    feature?.properties?.HYBAS_ID ||
    feature?.properties?.name ||
    fallback
  );
}

function loadMaps() {
  const schools = fs.existsSync(schoolsPath) ? JSON.parse(fs.readFileSync(schoolsPath, 'utf8')) : [];
  const basins = fs.existsSync(basinsPath) ? JSON.parse(fs.readFileSync(basinsPath, 'utf8')) : { features: [] };
  return { schools, basins };
}

function buildCertificationResult(normalized, schools, basins, sources) {
  const deduped = [];
  const seen = new Set();
  const sorted = normalized
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
      if (match) basinId = basinIdFromFeature(match, basinId);
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
    .sort((a, b) => String(a.basinId).localeCompare(String(b.basinId)) || String(a.quarter).localeCompare(String(b.quarter)));

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
    .sort((a, b) => b.usedM3 - a.usedM3 || String(a.basinId).localeCompare(String(b.basinId)));

  return {
    generatedAt: new Date().toISOString(),
    pipeline: {
      fetched: normalized.length,
      deduplicated: deduped.length,
      duplicatesRemoved: normalized.length - deduped.length,
      mappedToSchools: enriched.filter((r) => r.schoolId).length,
      mappedToBasins: enriched.filter((r) => r.basinId && r.basinId !== 'UNIDENTIFIED').length
    },
    sources,
    records: enriched,
    aggregates,
    basinTotals
  };
}

export async function GET() {
  try {
    const { schools, basins } = loadMaps();
    const local = listSensorRecords().map((r) => normalizeLocalRecord({ ...r, source: 'local-store' }));
    const all = [...local];
    const sources = [{ name: 'local-store', fetched: local.length }];

    if (process.env.SSCAP_API_BASE_URL) {
      try {
        const base = process.env.SSCAP_API_BASE_URL.replace(/\/$/, '');
        const res = await fetch(`${base}/api/download`, {
          headers: process.env.SSCAP_API_TOKEN ? { authorization: `Bearer ${process.env.SSCAP_API_TOKEN}` } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          const remote = extractAndNormalizeRecords({
            records: Array.isArray(json?.records) ? json.records : undefined,
            data: Array.isArray(json?.data) ? json.data : undefined
          }).map((r) => ({ ...r, source: 'sscap-api' }));
          all.push(...remote);
          sources.push({ name: 'sscap-api', fetched: remote.length, endpoint: `${base}/api/download` });
        } else {
          sources.push({ name: 'sscap-api', fetched: 0, error: `HTTP ${res.status}` });
        }
      } catch (error) {
        sources.push({ name: 'sscap-api', fetched: 0, error: String(error?.message || error) });
      }
    }

    return NextResponse.json(buildCertificationResult(all, schools, basins, sources));
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to build certification dataset' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const sourceName = body?.sourceName || 'uploaded-file';
    const normalized = extractAndNormalizeRecords(body?.downloadPayload || body);
    if (!normalized.length) {
      return NextResponse.json({ error: 'No usable records found in uploaded JSON.' }, { status: 400 });
    }
    const { schools, basins } = loadMaps();
    return NextResponse.json(buildCertificationResult(normalized, schools, basins, [{ name: sourceName, fetched: normalized.length }]));
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to process uploaded certification JSON' }, { status: 400 });
  }
}
