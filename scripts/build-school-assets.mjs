import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceCsv = path.join(root, 'Background/Schools/school-data.csv');
const outDir = path.join(root, 'public/data');

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
    projectType: index % 2 === 0 ? 'leak_reduction_efficiency' : 'desalination_treatment',
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
    }
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
  evidenceFiles: school.evidence.photoUrl ? [school.evidence.photoUrl] : [],
  certificationReviewer: 'Pending assignment',
  methodologyStatus: 'draft',
  notes: school.evidence.notes || ''
}));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'schools.cleaned.json'), JSON.stringify(schools, null, 2));
fs.writeFileSync(path.join(outDir, 'projects.seed.json'), JSON.stringify(projectsSeed, null, 2));
fs.writeFileSync(
  path.join(outDir, 'basins.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: basinFeatures }, null, 2)
);

console.log(`Wrote ${schools.length} schools, ${projectsSeed.length} projects, ${basinFeatures.length} basin polygons.`);
