import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceCsv = path.join(root, 'Background/Schools/school-data.csv');
const outDir = path.join(root, 'public/data');
const technicalPilotRoot = path.join(root, 'Background/Schools/BL_IU_Technical/Piloto escuelas');
const SCHOOL_PROJECT_TYPE = 'captacion_agua_de_lluvia_scall';
const SCHOOL_PROJECT_TYPE_LABEL = 'Captación de agua de lluvia (SCALL)';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

function toNum(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickKey(record, candidates) {
  const keys = Object.keys(record);
  const norm = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const candidate of candidates) {
    if (record[candidate] !== undefined) return candidate;
  }
  for (const candidate of candidates) {
    const normalizedCandidate = norm(candidate);
    const direct = keys.find((k) => norm(k) === normalizedCandidate);
    if (direct) return direct;
  }
  for (const pattern of candidates) {
    const match = keys.find((k) => k.includes(pattern));
    if (match) return match;
  }
  for (const pattern of candidates) {
    const normalizedPattern = norm(pattern);
    const match = keys.find((k) => norm(k).includes(normalizedPattern));
    if (match) return match;
  }
  return null;
}

function pickCoord(record) {
  const latKey = pickKey(record, ['LATITUDE', '_CAPTURA_LA_UBICACION_latitude', 'UBICACION_latitude']);
  const lonKey = pickKey(record, ['LONGITUDE', '_CAPTURA_LA_UBICACION_longitude', 'UBICACION_longitude']);
  const lat = toNum(latKey ? record[latKey] : null);
  const lon = toNum(lonKey ? record[lonKey] : null);
  if (lat !== null && lon !== null) return { lat, lon };

  const rawKey = pickKey(record, ['CAPTURA_LA_UBICACION']);
  const raw = rawKey ? record[rawKey] : null;
  if (!raw) return { lat: null, lon: null };
  const matches = String(raw).match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return { lat: null, lon: null };
  return { lat: Number(matches[0]), lon: Number(matches[1]) };
}

function sanitizeHeader(header) {
  return header
    .normalize('NFD')
    .replace(/[^\w\s/*-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/\*/g, 'STAR')
    .replace(/\//g, '_')
    .replace(/^-/, '');
}

function around(lat, lon, sizeDeg = 0.08) {
  const minLat = lat - sizeDeg;
  const maxLat = lat + sizeDeg;
  const minLon = lon - sizeDeg;
  const maxLon = lon + sizeDeg;

  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat]
  ];
}

function relFromRoot(absPath) {
  return path.relative(root, absPath).replaceAll(path.sep, '/');
}

function parsePrecipitationCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 3) return null;

  const coordLine = lines[0] || '';
  const lonMatch = coordLine.match(/LON:\s*(-?\d+(?:\.\d+)?)/i);
  const latMatch = coordLine.match(/LAT:\s*(-?\d+(?:\.\d+)?)/i);

  const headers = lines[1].split(',').map((x) => x.trim());
  const years = headers.slice(1).map((y) => Number(y)).filter((n) => Number.isFinite(n));
  const maxByYear = Object.fromEntries(years.map((y) => [String(y), 0]));

  let maxDailyMm = 0;

  for (const line of lines.slice(2)) {
    const cols = line.split(',');
    for (let i = 1; i < cols.length && i < headers.length; i += 1) {
      const year = headers[i];
      const value = Number(cols[i] || 0);
      if (!Number.isFinite(value)) continue;
      if (value > (maxByYear[year] || 0)) maxByYear[year] = value;
      if (value > maxDailyMm) maxDailyMm = value;
    }
  }

  const sortedYears = years.sort((a, b) => a - b);
  const latestYear = sortedYears[sortedYears.length - 1];

  return {
    sourceFile: relFromRoot(filePath),
    stationLon: lonMatch ? Number(lonMatch[1]) : null,
    stationLat: latMatch ? Number(latMatch[1]) : null,
    years: sortedYears,
    annualCumulativeMaxMm: Object.fromEntries(
      Object.entries(maxByYear).map(([year, mm]) => [year, Number(mm.toFixed(2))])
    ),
    latestYear,
    latestYearTotalMm: latestYear ? Number((maxByYear[String(latestYear)] || 0).toFixed(2)) : null,
    maxDailyMm: Number(maxDailyMm.toFixed(2))
  };
}

function buildTechnicalIndex() {
  const index = new Map();
  if (!fs.existsSync(technicalPilotRoot)) return index;

  const schoolDirs = fs
    .readdirSync(technicalPilotRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d/.test(d.name))
    .map((d) => d.name);

  for (const schoolId of schoolDirs) {
    const baseDir = path.join(technicalPilotRoot, schoolId);
    const allFiles = [];

    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fp = path.join(dir, item.name);
        if (item.isDirectory()) walk(fp);
        else allFiles.push(fp);
      }
    }

    walk(baseDir);

    const pdfs = allFiles.filter((f) => f.toLowerCase().endsWith('.pdf'));
    const images = allFiles.filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
    const precipitationFile = allFiles.find((f) => /precipitation_data/i.test(path.basename(f)) && f.endsWith('.csv'));

    index.set(schoolId, {
      basePath: relFromRoot(baseDir),
      fileCount: allFiles.length,
      pdfCount: pdfs.length,
      imageCount: images.length,
      reportFiles: pdfs.map((f) => ({
        name: path.basename(f),
        path: relFromRoot(f)
      })),
      photoSamples: images.slice(0, 3).map((f) => relFromRoot(f)),
      precipitation: precipitationFile ? parsePrecipitationCsv(precipitationFile) : null
    });
  }

  return index;
}

const csvText = fs.readFileSync(sourceCsv, 'utf8');
const rows = parseCsv(csvText);
if (rows.length < 2) {
  throw new Error('School CSV has no data rows');
}

const headers = rows[0].map(sanitizeHeader);
const records = rows.slice(1).map((row) => {
  const record = {};
  for (let i = 0; i < headers.length; i += 1) {
    record[headers[i]] = row[i] ?? '';
  }
  return record;
});
const technicalBySchoolId = buildTechnicalIndex();

const schools = records.map((record, index) => {
  const schoolIdKey = pickKey(record, ['ID_USUARIOSTAR']);
  const schoolNameKey = pickKey(record, ['NOMBRE_DE_LA_ESCUELA', 'CENTRO_COMUNITARIOSTAR']);
  const municipioKey = pickKey(record, ['TERRITORIAL_MUNICIPIO']);
  const meterNumberKey = pickKey(record, ['NUMERO_DE_MEDIDOR']);
  const meterReadingKey = pickKey(record, ['LECTURA_DEL_MEDIDOR_EN_M_CUBICOS', 'M3_USADOS']);
  const meterHealthKey = pickKey(record, ['EL_MEDIDOR_FUNCIONA_CORRECTAMENTE']);
  const photoKey = pickKey(record, ['FOTO_DEL_MEDIDOR_URL']);
  const notesKey = pickKey(record, ['NOTAS_DE_SEGUIMIENTO_A_MEDIDOR_REMOTO']);
  const followUpKey = pickKey(record, ['FECHA_DE_SEGUIMIENTO']);
  const scallKey = pickKey(record, ['ESTAN_USANDO_EL_SCALL']);

  const schoolId = (schoolIdKey ? record[schoolIdKey] : '') || `school-${index + 1}`;
  const schoolName = (schoolNameKey ? record[schoolNameKey] : '') || `School ${index + 1}`;
  const municipio = (municipioKey ? record[municipioKey] : '') || 'Unknown';
  const estado = record.ESTADO || 'Unknown';
  const meterNumber = (meterNumberKey ? record[meterNumberKey] : '') || schoolId;
  const meterReading = toNum(meterReadingKey ? record[meterReadingKey] : null) ?? 0;
  const coord = pickCoord(record);

  return {
    schoolId,
    schoolName,
    municipio,
    estado,
    projectType: SCHOOL_PROJECT_TYPE,
    projectTypeLabel: SCHOOL_PROJECT_TYPE_LABEL,
    projectStatus: 'under_review',
    basinId: municipio.toUpperCase().replace(/\s+/g, '-'),
    operator: record.NOMBRE_DE_QUIEN_REGISTRA || 'Unknown',
    lat: coord.lat,
    lon: coord.lon,
    meter: {
      deviceId: `tlaloque-${schoolId}`,
      meterNumber,
      status: String(meterHealthKey ? record[meterHealthKey] : '').toUpperCase().includes('NO') ? 'suspect' : 'online',
      latestReadingM3: meterReading
    },
    evidence: {
      photoUrl: (photoKey ? record[photoKey] : '') || '',
      notes: (notesKey ? record[notesKey] : '') || ''
    },
    raw: {
      lastFollowUpDate: (followUpKey ? record[followUpKey] : '') || '',
      scallInUse: (scallKey ? record[scallKey] : '') || ''
    },
    technical: technicalBySchoolId.get(schoolId) || null
  };
});

const byBasin = new Map();
for (const school of schools) {
  if (school.lat === null || school.lon === null) continue;
  if (!byBasin.has(school.basinId)) byBasin.set(school.basinId, []);
  byBasin.get(school.basinId).push(school);
}

const basinFeatures = [];
for (const [basinId, group] of byBasin.entries()) {
  const lats = group.map((s) => s.lat);
  const lons = group.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const onePoint = minLat === maxLat && minLon === maxLon;
  const polygon = onePoint
    ? around(minLat, minLon)
    : [
        [minLon - 0.05, minLat - 0.05],
        [maxLon + 0.05, minLat - 0.05],
        [maxLon + 0.05, maxLat + 0.05],
        [minLon - 0.05, maxLat + 0.05],
        [minLon - 0.05, minLat - 0.05]
      ];

  basinFeatures.push({
    type: 'Feature',
    properties: {
      basinId,
      municipality: group[0].municipio,
      state: group[0].estado,
      schoolCount: group.length,
      riskClass: Math.min(4, Math.floor(group.length / 2) + 1),
      source: 'Derived from school clusters for Demo Day map overlay'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [polygon]
    }
  });
}

const projectsSeed = schools.map((school, i) => ({
  projectId: `BL-PROJ-${String(i + 1).padStart(3, '0')}`,
  projectName: school.schoolName,
  projectType: school.projectType,
  location: {
    basinId: school.basinId,
    municipality: school.municipio,
    state: school.estado,
    country: 'Mexico',
    lat: school.lat,
    lon: school.lon
  },
  operator: school.operator,
  status: 'under_review',
  linkedDeviceIds: [school.meter.deviceId],
  evidenceFiles: [
    ...(school.evidence.photoUrl ? [school.evidence.photoUrl] : []),
    ...((school.technical?.reportFiles || []).map((x) => x.path))
  ],
  certificationReviewer: 'Pending assignment',
  methodologyStatus: 'draft',
  notes: school.evidence.notes || '',
  technicalSummary: school.technical
    ? {
        reportCount: school.technical.pdfCount,
        imageCount: school.technical.imageCount,
        latestYearRainMm: school.technical.precipitation?.latestYearTotalMm ?? null
      }
    : null
}));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'schools.cleaned.json'), JSON.stringify(schools, null, 2));
fs.writeFileSync(path.join(outDir, 'projects.seed.json'), JSON.stringify(projectsSeed, null, 2));
fs.writeFileSync(
  path.join(outDir, 'basins.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: basinFeatures }, null, 2)
);

console.log(`Wrote ${schools.length} schools, ${projectsSeed.length} projects, ${basinFeatures.length} basin polygons.`);
