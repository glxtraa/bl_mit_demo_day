import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

const schoolsPath = arg('--schools', path.join(process.cwd(), 'public/data/schools.cleaned.json'));
const basinsPath = arg('--basins');
const outputPath = arg('--output', path.join(process.cwd(), 'public/data/hydrobasins_l6_schools.geojson'));

if (!basinsPath) {
  console.error('Missing --basins <path-to-hydrobasins-geojson>');
  process.exit(1);
}

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
      const [outer, ...holes] = polygon;
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
    return false;
  }

  return false;
}

const schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
const basins = JSON.parse(fs.readFileSync(basinsPath, 'utf8'));

const mappedSchools = schools.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
const matched = new Map();

for (const school of mappedSchools) {
  const point = [school.lon, school.lat];
  for (const feature of basins.features || []) {
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

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));

console.log(`Matched ${mappedSchools.length} schools into ${out.features.length} HydroBASINS polygons.`);
console.log(`Wrote ${outputPath}`);
