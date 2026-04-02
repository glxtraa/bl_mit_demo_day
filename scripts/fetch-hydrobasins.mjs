import fs from 'node:fs';
import path from 'node:path';
import shp from 'shpjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const RAW_DIR = path.join(DATA_DIR, 'hydrobasins_raw');
const ZIP_PATH = path.join(RAW_DIR, 'hybas_na_lev06_v1c.zip');
const RAW_GEOJSON_PATH = path.join(DATA_DIR, 'hybas_na_lev06_v1c.geojson');
const OUTPUT_PATH = path.join(DATA_DIR, 'hydrobasins_l6_schools.geojson');
const SCHOOLS_PATH = path.join(DATA_DIR, 'schools.cleaned.json');
const HYDROBASINS_URL = 'https://data.hydrosheds.org/file/hydrobasins/standard/hybas_na_lev06_v1c.zip';

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonGeom(point, geometry) {
  if (!geometry) return false;

  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates || [];
    if (!outer || !pointInRing(point, outer)) return false;
    for (const hole of holes) {
      if (pointInRing(point, hole)) return false;
    }
    return true;
  }

  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates || []) {
      const [outer, ...holes] = polygon || [];
      if (!outer || !pointInRing(point, outer)) continue;
      let inHole = false;
      for (const hole of holes) {
        if (pointInRing(point, hole)) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }

  return false;
}

function asFeatureCollection(parsed) {
  if (!parsed) return { type: 'FeatureCollection', features: [] };
  if (parsed.type === 'FeatureCollection') return parsed;

  if (Array.isArray(parsed)) {
    const fc = parsed.find((x) => x?.type === 'FeatureCollection');
    if (fc) return fc;
  }

  return { type: 'FeatureCollection', features: [] };
}

async function ensureZip() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  if (fs.existsSync(ZIP_PATH)) return;

  console.log('Downloading HydroBASINS Level 6...');
  const response = await fetch(HYDROBASINS_URL);
  if (!response.ok) {
    throw new Error(`Failed to download HydroBASINS zip: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(ZIP_PATH, Buffer.from(arrayBuffer));
}

async function main() {
  if (!fs.existsSync(SCHOOLS_PATH)) {
    throw new Error('Missing schools.cleaned.json. Run: npm run prepare:data');
  }

  await ensureZip();

  console.log('Parsing shapefile from zip via shpjs (no GDAL)...');
  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const parsed = await shp(zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength));
  const basins = asFeatureCollection(parsed);

  if (!basins.features.length) {
    throw new Error('No basin features parsed from HydroBASINS zip.');
  }

  fs.writeFileSync(RAW_GEOJSON_PATH, JSON.stringify(basins));
  console.log(`Saved raw GeoJSON: ${RAW_GEOJSON_PATH}`);

  const schools = JSON.parse(fs.readFileSync(SCHOOLS_PATH, 'utf8'));
  const mappedSchools = schools.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');

  const matched = new Map();
  for (const school of mappedSchools) {
    const point = [school.lon, school.lat];

    for (const feature of basins.features) {
      if (pointInPolygonGeom(point, feature.geometry)) {
        const basinId = feature?.properties?.HYBAS_ID || feature?.properties?.PFAF_ID || feature?.id || crypto.randomUUID();

        if (!matched.has(basinId)) {
          matched.set(basinId, {
            ...feature,
            properties: {
              ...(feature.properties || {}),
              source: 'HydroBASINS Level 6 (matched to school points)',
              matched_school_ids: [],
              matched_school_names: []
            }
          });
        }

        const basinFeature = matched.get(basinId);
        basinFeature.properties.matched_school_ids.push(school.schoolId);
        basinFeature.properties.matched_school_names.push(school.schoolName);
        break;
      }
    }
  }

  const out = {
    type: 'FeatureCollection',
    features: Array.from(matched.values()).map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        school_count: feature.properties.matched_school_ids.length
      }
    }))
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Matched ${mappedSchools.length} schools into ${out.features.length} HydroBASINS polygons.`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
