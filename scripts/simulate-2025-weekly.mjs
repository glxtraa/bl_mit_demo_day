import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const schoolsPath = path.join(ROOT, 'public/data/schools.cleaned.json');
const outputDir = path.join(ROOT, 'tmp');
const outputPayloadPath = path.join(outputDir, 'sscap_2025_weekly_payload.json');
const outputSummaryPath = path.join(outputDir, 'sscap_2025_weekly_summary.json');
const outputApiDownloadPath = path.join(outputDir, 'sscap_2025_weekly_api_download.json');

const args = new Set(process.argv.slice(2));
const shouldSend = args.has('--send');
const apiBaseArg = process.argv.find((x) => x.startsWith('--api-base='))?.split('=')[1];
const apiBase = (apiBaseArg || process.env.SSCAP_API_BASE_URL || '').replace(/\/$/, '');
const apiToken = process.env.SSCAP_API_TOKEN || '';

if (!fs.existsSync(schoolsPath)) {
  throw new Error('Missing public/data/schools.cleaned.json. Run npm run prepare:data first.');
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8')).filter(
  (s) => s?.meter?.deviceId && typeof s.lat === 'number' && typeof s.lon === 'number'
);

function hashToInt(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function schoolModel(schoolId) {
  const h = hashToInt(schoolId);
  const areaM2 = 140 + (h % 300); // 140-439 m2
  const efficiency = 0.76 + ((h % 13) / 100); // 0.76-0.88
  const tankCapacityM3 = 12 + (h % 32); // 12-43 m3
  const maxLevelMeters = 2.2;
  const weeklyDemandM3 = 2.3 + ((h % 17) / 10); // 2.3-3.9
  return { areaM2, efficiency, tankCapacityM3, maxLevelMeters, weeklyDemandM3 };
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

async function fetchDailyRain2025(lat, lon) {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  url.searchParams.set('parameters', 'PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('start', '20250101');
  url.searchParams.set('end', '20251231');
  url.searchParams.set('format', 'JSON');

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`NASA POWER daily request failed (${res.status})`);
  }
  const json = await res.json();
  const raw = json?.properties?.parameter?.PRECTOTCORR || {};
  return {
    requestUrl: String(url),
    daily: Object.entries(raw)
      .map(([k, v]) => ({ key: k, mm: Number(v) }))
      .filter((x) => /^\d{8}$/.test(x.key) && Number.isFinite(x.mm) && x.mm >= 0)
  };
}

function mondayUtc(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dow + 1);
  return d;
}

function buildWeeklySeries(daily) {
  const byWeek = new Map();
  for (const row of daily) {
    const d = new Date(Date.UTC(Number(row.key.slice(0, 4)), Number(row.key.slice(4, 6)) - 1, Number(row.key.slice(6, 8))));
    const w = mondayUtc(d);
    const k = toIsoDate(w);
    if (!byWeek.has(k)) {
      byWeek.set(k, { weekStart: k, weekEnd: toIsoDate(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + 6))), rainMm: 0 });
    }
    byWeek.get(k).rainMm += row.mm;
  }
  return [...byWeek.values()]
    .map((w) => ({ ...w, rainMm: Number(w.rainMm.toFixed(3)) }))
    .filter((w) => w.weekStart.startsWith('2025-') || w.weekEnd.startsWith('2025-'))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function schoolTermFactor(weekStartIso) {
  const m = Number(weekStartIso.slice(5, 7));
  if (m === 7 || m === 8) return 0.62; // summer break
  if (m === 12) return 0.74;
  return 1;
}

function round2(n) {
  return Number(n.toFixed(2));
}

function clamp(n, low, high) {
  return Math.max(low, Math.min(high, n));
}

function buildSchoolSimulation(school, rain) {
  const model = schoolModel(school.schoolId);
  const weekly = buildWeeklySeries(rain.daily);
  const rows = [];
  let storageM3 = model.tankCapacityM3 * 0.35;

  for (let i = 0; i < weekly.length; i += 1) {
    const w = weekly[i];
    const weekKey = `${school.schoolId}-${w.weekStart}-${i}`;
    const noise = ((hashToInt(weekKey) % 21) - 10) / 100; // -0.10..0.10
    const capturedM3Raw = (w.rainMm / 1000) * model.areaM2 * model.efficiency * (1 + noise);
    const capturedM3 = clamp(round2(Math.max(0, capturedM3Raw)), 0, model.tankCapacityM3 * 1.5);

    storageM3 = clamp(storageM3 + capturedM3, 0, model.tankCapacityM3);
    const demand = round2(model.weeklyDemandM3 * schoolTermFactor(w.weekStart));
    const utilizedM3 = round2(Math.min(storageM3, demand));
    storageM3 = round2(clamp(storageM3 - utilizedM3, 0, model.tankCapacityM3));
    const levelMeters = round2((storageM3 / model.tankCapacityM3) * model.maxLevelMeters);

    rows.push({
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      deviceId: school.meter.deviceId,
      basinId: school.basinId,
      lat: school.lat,
      lon: school.lon,
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      rainMm: w.rainMm,
      capturedM3,
      utilizedM3,
      storageM3,
      levelMeters,
      captado: {
        tlaloque_id: school.meter.deviceId,
        pulses: Math.max(0, Math.round(capturedM3 * 100)),
        catched_at: `${w.weekEnd}T18:00:00.000Z`
      },
      utilizado: {
        tlaloque_id: school.meter.deviceId,
        pulses: Math.max(0, Math.round(utilizedM3 * 100)),
        used_at: `${w.weekEnd}T18:05:00.000Z`
      },
      nivel: {
        tlaloque_id: school.meter.deviceId,
        meters: levelMeters,
        catched_at: `${w.weekEnd}T18:10:00.000Z`
      }
    });
  }

  return {
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    deviceId: school.meter.deviceId,
    requestUrl: rain.requestUrl,
    model,
    weeks: rows
  };
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiToken ? { authorization: `Bearer ${apiToken}` } : {})
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  return { ok: res.ok, status: res.status };
}

const simulations = [];
for (const school of schools) {
  const rain = await fetchDailyRain2025(school.lat, school.lon);
  const sim = buildSchoolSimulation(school, rain);
  simulations.push(sim);
  console.log(`Simulated ${sim.weeks.length} weekly records for ${school.schoolId}`);
}

const allWeekly = simulations.flatMap((s) => s.weeks);
const payload = {
  generatedAt: new Date().toISOString(),
  year: 2025,
  source: {
    provider: 'NASA POWER',
    parameter: 'PRECTOTCORR',
    unit: 'mm/day',
    docs: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'
  },
  schools: simulations.map((s) => ({
    schoolId: s.schoolId,
    schoolName: s.schoolName,
    deviceId: s.deviceId,
    requestUrl: s.requestUrl,
    model: s.model,
    weeks: s.weeks.length
  })),
  records: allWeekly
};

const summary = {
  generatedAt: payload.generatedAt,
  year: 2025,
  schoolCount: simulations.length,
  weeklyRecords: allWeekly.length,
  apiPayloads: allWeekly.length * 3,
  totalsBySchool: simulations.map((s) => ({
    schoolId: s.schoolId,
    schoolName: s.schoolName,
    capturedM3: round2(s.weeks.reduce((sum, w) => sum + w.capturedM3, 0)),
    utilizedM3: round2(s.weeks.reduce((sum, w) => sum + w.utilizedM3, 0)),
    maxLevelMeters: round2(Math.max(...s.weeks.map((w) => w.levelMeters)))
  }))
};

const apiDownloadLike = {
  generatedAt: payload.generatedAt,
  records: [],
  events: [],
  reports: []
};

for (const row of allWeekly) {
  const metadata = {
    ip: 'simulated-2025',
    city: row.schoolName || 'Unknown',
    country: 'MX',
    userAgent: 'simulation-2025-weekly'
  };
  apiDownloadLike.records.push({
    id: crypto.randomUUID(),
    type: 'captado',
    data: row.captado,
    metadata,
    createdAt: row.captado.catched_at
  });
  apiDownloadLike.records.push({
    id: crypto.randomUUID(),
    type: 'utilizado',
    data: row.utilizado,
    metadata,
    createdAt: row.utilizado.used_at
  });
  apiDownloadLike.records.push({
    id: crypto.randomUUID(),
    type: 'nivel',
    data: row.nivel,
    metadata,
    createdAt: row.nivel.catched_at
  });
}

fs.writeFileSync(outputPayloadPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(outputSummaryPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(outputApiDownloadPath, JSON.stringify(apiDownloadLike, null, 2));

console.log(`Wrote payload: ${outputPayloadPath}`);
console.log(`Wrote summary: ${outputSummaryPath}`);
console.log(`Wrote API download-like file: ${outputApiDownloadPath}`);

if (shouldSend) {
  if (!apiBase) {
    throw new Error('Missing API base URL. Pass --api-base=https://... or set SSCAP_API_BASE_URL.');
  }

  let sent = 0;
  let failed = 0;
  for (const row of allWeekly) {
    const jobs = [
      ['/api/captado', row.captado],
      ['/api/utilizado', row.utilizado],
      ['/api/nivel', row.nivel]
    ];
    for (const [route, body] of jobs) {
      const res = await postJson(`${apiBase}${route}`, body);
      if (res.ok) sent += 1;
      else {
        failed += 1;
        console.warn(`Failed ${route} for ${row.schoolId} ${row.weekStart}: HTTP ${res.status}`);
      }
    }
  }
  console.log(`Send complete. Sent: ${sent}, Failed: ${failed}, Base: ${apiBase}`);
}
