import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const schoolsPath = path.join(ROOT, 'public/data/schools.cleaned.json');
const outputPath = path.join(ROOT, 'public/data/rain_seasonality.json');

if (!fs.existsSync(schoolsPath)) {
  throw new Error('Missing public/data/schools.cleaned.json. Run npm run prepare:data first.');
}

const schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8')).filter(
  (s) => typeof s.lat === 'number' && typeof s.lon === 'number'
);

function quarterFromMonth(month) {
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

async function fetchMonthlyPrecip(lat, lon) {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/monthly/point');
  url.searchParams.set('parameters', 'PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('start', '2001');
  url.searchParams.set('end', '2025');
  url.searchParams.set('format', 'JSON');

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`NASA POWER request failed (${res.status}) for lat=${lat}, lon=${lon}`);
  }

  const json = await res.json();
  const raw = json?.properties?.parameter?.PRECTOTCORR || {};
  const values = Object.entries(raw)
    .map(([ym, mm]) => ({ ym, mm: Number(mm) }))
    .filter((x) => Number.isFinite(x.mm) && x.mm >= 0 && /^\d{6}$/.test(x.ym));

  if (!values.length) {
    throw new Error(`No PRECTOTCORR values for lat=${lat}, lon=${lon}`);
  }

  return { url: String(url), values };
}

function summarize(values) {
  const monthBuckets = new Map();
  const quarterBuckets = new Map([
    ['Q1', []],
    ['Q2', []],
    ['Q3', []],
    ['Q4', []]
  ]);

  for (const { ym, mm } of values) {
    const month = Number(ym.slice(4, 6));
    if (!monthBuckets.has(month)) monthBuckets.set(month, []);
    monthBuckets.get(month).push(mm);
    quarterBuckets.get(quarterFromMonth(month)).push(mm);
  }

  const monthlyAvgMmPerDay = {};
  for (let m = 1; m <= 12; m += 1) {
    const arr = monthBuckets.get(m) || [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    monthlyAvgMmPerDay[String(m).padStart(2, '0')] = Number(avg.toFixed(3));
  }

  const annualMean = Object.values(monthlyAvgMmPerDay).reduce((a, b) => a + b, 0) / 12 || 1;
  const monthlySeasonalityIndex = Object.fromEntries(
    Object.entries(monthlyAvgMmPerDay).map(([m, mm]) => [m, Number((mm / annualMean).toFixed(3))])
  );

  const quarterlyAvgMmPerDay = {};
  for (const [q, arr] of quarterBuckets.entries()) {
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    quarterlyAvgMmPerDay[q] = Number(avg.toFixed(3));
  }

  return { monthlyAvgMmPerDay, monthlySeasonalityIndex, quarterlyAvgMmPerDay };
}

const output = {
  source: {
    provider: 'NASA POWER',
    parameter: 'PRECTOTCORR',
    unit: 'mm/day',
    docs: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/'
  },
  generatedAt: new Date().toISOString(),
  schools: {}
};

for (const school of schools) {
  try {
    const { url, values } = await fetchMonthlyPrecip(school.lat, school.lon);
    output.schools[school.schoolId] = {
      schoolName: school.schoolName,
      lat: school.lat,
      lon: school.lon,
      requestUrl: url,
      ...summarize(values)
    };
    console.log(`Loaded rain profile for ${school.schoolId}`);
  } catch (error) {
    output.schools[school.schoolId] = {
      schoolName: school.schoolName,
      lat: school.lat,
      lon: school.lon,
      error: error.message
    };
    console.warn(`Rain profile failed for ${school.schoolId}: ${error.message}`);
  }
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outputPath}`);
