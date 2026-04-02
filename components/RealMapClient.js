'use client';

import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Pane, Popup, TileLayer, Tooltip } from 'react-leaflet';

function schoolCoords(school) {
  if (typeof school?.lat !== 'number' || typeof school?.lon !== 'number') return null;
  return [school.lat, school.lon];
}

function getBounds(schools, basins) {
  const points = [];
  for (const school of schools) {
    const c = schoolCoords(school);
    if (c) points.push(c);
  }

  for (const feature of basins?.features || []) {
    const geometry = feature?.geometry;
    if (!geometry) continue;
    if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates || []) {
        for (const coord of ring || []) points.push([coord[1], coord[0]]);
      }
    }
    if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates || []) {
        for (const ring of poly || []) {
          for (const coord of ring || []) points.push([coord[1], coord[0]]);
        }
      }
    }
  }

  if (!points.length) return [[19.1, -99.0], [19.6, -98.7]];

  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)]
  ];
}

function basinLabel(feature) {
  const props = feature?.properties || {};
  return props.HYBAS_ID || props.basinId || 'Unknown basin';
}

export default function RealMapClient({ schools, basins, selectedDeviceId }) {
  const mappedSchools = useMemo(() => schools.filter((s) => schoolCoords(s)), [schools]);
  const bounds = useMemo(() => getBounds(mappedSchools, basins), [mappedSchools, basins]);

  return (
    <div className="mapLeaflet">
      <MapContainer bounds={bounds} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Pane name="basins" style={{ zIndex: 410 }}>
          <GeoJSON
            key={`basins-${(basins?.features || []).length}`}
            data={basins}
            style={() => ({
              color: '#0c9ccb',
              weight: 2,
              fillColor: '#0c9ccb',
              fillOpacity: 0.14
            })}
            onEachFeature={(feature, layer) => {
              const props = feature?.properties || {};
              layer.bindTooltip(`${basinLabel(feature)}${props.school_count ? ` · schools: ${props.school_count}` : ''}`);
              layer.bindPopup(`<b>Basin</b>: ${basinLabel(feature)}<br/><b>Source</b>: ${props.source || 'HydroBASINS'}`);
            }}
          />
        </Pane>

        <Pane name="schools" style={{ zIndex: 450 }}>
          {mappedSchools.map((school) => {
            const coord = schoolCoords(school);
            const active = school?.meter?.deviceId === selectedDeviceId;
            return (
              <CircleMarker
                key={school.schoolId}
                center={coord}
                radius={active ? 10 : 7}
                pathOptions={{
                  color: active ? '#b43434' : '#0b556f',
                  fillColor: active ? '#e75b5b' : '#12708e',
                  fillOpacity: 0.92,
                  weight: 1
                }}
              >
                <Tooltip>{school.schoolName}</Tooltip>
                <Popup>
                  <div>
                    <strong>{school.schoolName}</strong>
                    <br />
                    {school.municipio}, {school.estado}
                    <br />
                    Basin: {school.basinId}
                    <br />
                    Device: {school?.meter?.deviceId}
                    <br />
                    Reading: {school?.meter?.latestReadingM3 ?? 0} m3
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>
      </MapContainer>
    </div>
  );
}
