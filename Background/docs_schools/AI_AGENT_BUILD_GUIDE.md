# AI Agent Build Guide: CSV-to-Map HydroBASINS School Monitoring App

This guide explains how to rebuild a project similar to this one from scratch, including practical decisions, assumptions, and pitfalls discovered during implementation.

## 1. Project Goal

Build a Vercel-ready single-user web app that:

- Uses CSV as backend input (manual upload + default static CSV)
- Maps school locations
- Displays meter/media/status/risk data per school
- Overlays HydroBASINS Level 6 polygons that contain schools
- Supports bilingual UI (English/Spanish)
- Provides incremental and cumulative basin-level meter aggregation over time

## 2. Final Stack (what worked)

- Next.js App Router (`next@14`)
- React + React Leaflet + Leaflet
- PapaParse for CSV parsing
- `shpjs` + Turf point-in-polygon for HydroBASINS extraction script
- No DB (static files + client parsing)

Reasoning:

- Next.js deploys cleanly to Vercel
- Leaflet is lightweight for polygon + marker overlays
- PapaParse handles very wide CSVs and duplicate headers robustly
- `shpjs` avoids requiring local GDAL/QGIS toolchain

## 3. Repository Layout

- `app/` UI pages and global styles
- `components/` Map and aggregated tab UI
- `lib/` parsing, i18n, aggregation logic
- `public/data/seguimiento.csv` default dataset
- `public/data/hydrobasins_l6_schools.geojson` derived basin overlay
- `public/data/hydrobasins_l6_datacenters.geojson` data-center basin overlay
- `public/data/basin_risk_comparison.json` Aqueduct risk for school basins
- `public/data/datacenter_basin_risk_comparison.json` Aqueduct risk for data-center basins
- `public/data/mexico_datacenters_estimated.json` provider markers + sources + water disclosures
- `public/data/hydrologic_interconnection.json` basin interconnection flags + evidence links
- `scripts/extract-hydrobasins.mjs` one-shot basin extraction pipeline
- `BL_Schools_HydroBASINS_Colab.ipynb` standalone Colab analysis notebook

## 4. Data Realities You Must Handle

### 4.1 CSV quirks

The survey export is very wide (~300+ columns), includes duplicate header names, and mixed completeness.

Actions:

- Parse with `Papa.parse(..., { header: true, skipEmptyLines: true })`
- Use explicit field maps for critical columns
- Always implement fallback keys for lat/lon (`LATITUDE`, `_CAPTURA...`)
- Add fallback parsing from `CAPTURA LA UBICACION` blob if split lat/lon missing

### 4.2 School identity across visits

You need a stable key to build time series.

Rule used:

- Prefer `ID USUARIO*`
- Else use `schoolName|municipio`

### 4.3 Meter identity across visits

Need meter key to calculate increments.

Rule used:

- Prefer `NUMERO DE MEDIDOR`
- Else fallback to school key

## 5. Core Features Implemented

### 5.1 Map tab

- Marker map of schools with valid coordinates
- Search/filter by school name, ID, municipio
- Separate unmapped school list
- Click row => detail modal
- Marker popup includes status, risk, meter data, media thumbnails/links

### 5.2 HydroBASINS overlay

- Draws Level-6 polygons from `public/data/hydrobasins_l6_schools.geojson`
- Styled by Aqueduct risk class color scale
- Hover tooltip and popup with basin metadata
- Toggle show/hide basins
- Initial map fit prioritizes basin extent when visible

### 5.3 Data center layer (Mexico)

- Provider-specific markers for Google/AWS/Microsoft (estimated coordinates)
- Popup includes provider/region, basin IDs, in-school-basin flag, and announcement source
- Supports water-needs and disclosure-source links (Google RFI + AWS/Microsoft RFI-like disclosures)
- Draws separate data-center basin polygons from `public/data/hydrobasins_l6_datacenters.geojson`
- Data-center basin polygons are also risk-colored via Aqueduct

### 5.4 Aggregated tab

Basin-level aggregation of meter usage over time with:

- Incremental time series plot
- Cumulative time series plot
- Data table by date and basin
- Unmatched schools grouped under `UNIDENTIFIED` basin

### 5.5 i18n

- Full English/Spanish toggle
- Shared translation dictionary in `lib/i18n.js`
- Labels wired in map, modal, legend, basin popups, aggregated tab

### 5.6 Status and risk UX

- Compact icon badges for meter health and risk
- Legend panel explains all icons and score ranges

## 6. HydroBASINS Pipeline (critical)

### 6.1 Official dataset used

- `https://data.hydrosheds.org/file/hydrobasins/standard/hybas_na_lev06_v1c.zip`

### 6.2 Extraction approach

1. Parse default school CSV and collect unique mapped school points.
2. Load Level-6 shapefile via `shpjs`.
3. For each school point, run Turf `booleanPointInPolygon` against basin features.
4. Keep only matched basin polygons.
5. Store school IDs/names in basin properties for popup linking.
6. Emit compact GeoJSON to `public/data/hydrobasins_l6_schools.geojson`.

### 6.3 Command

```bash
npm run extract:basins
```

### 6.4 Additional basin outputs

- School basins: `public/data/hydrobasins_l6_schools.geojson`
- Data-center basins: `public/data/hydrobasins_l6_datacenters.geojson`

For data-center basin extraction, use the same HydroBASINS source and filter by known `HYBAS_ID` values from provider estimated points.

## 7. Aqueduct Risk Overlay (school + data-center basins)

Use:

- `scripts/compare-aqueduct-basins.py`

Generate school basin comparison:

```bash
python3 scripts/compare-aqueduct-basins.py \
  --basins public/data/hydrobasins_l6_schools.geojson \
  --output public/data/basin_risk_comparison.json
```

Generate data-center basin comparison:

```bash
python3 scripts/compare-aqueduct-basins.py \
  --basins public/data/hydrobasins_l6_datacenters.geojson \
  --output public/data/datacenter_basin_risk_comparison.json
```

Map styling should use Aqueduct category color mapping (`0..4`) for both basin layers.

## 8. Aggregation Assumptions (must keep explicit)

These are intentionally recorded in UI and README:

1. Per meter, incremental usage = current reading - previous reading.
2. If first reading for a meter, first reading is used as incremental value.
3. If reading missing but `M3 USADOS` exists, use `M3 USADOS` directly.
4. If computed delta is negative (reset/replacement), fallback to current reading.
5. Schools without coordinates or without basin match are grouped as `Unidentified basin`.

## 9. Risk Score Model (compact and explainable)

Risk is a heuristic from high-signal fields:

- SCALL usage
- Meter health (issue/unknown)
- Canceled activities/classes
- Restricted sanitation access
- Poor water quality responses
- User burden (bring/pay water)
- Water-scarcity statement

Outputs:

- `riskScore` 0-100
- `riskLevel` low/medium/high
- `riskReasons` list (for modal explanations)

## 10. Important limitation: “official basin names”

HydroBASINS Level-6 (and Level-1 tested) does not include name attributes in official properties.

Therefore:

- Keep official identifier fields (`HYBAS_ID`, `PFAF_ID`) as canonical labels
- Explicitly show: official name not available in HydroBASINS data

Do not fabricate names.

## 11. UI/UX Decisions That Helped

- Keep Map and Aggregated as separate tabs
- Always show a data quality summary (`records`, `mapped`, `no coordinates`)
- Make status icon-only with a legend to reduce visual noise
- Show media and meter data together to support visual verification
- Clickable timeline entries in modal to inspect visit evolution
- Add dedicated cards for:
  - Aqueduct risk class scale (`Risk class 0..4`)
  - Data-center water disclosures and sources
  - Hydrologic interconnection evidence by basin

## 12. Build/Runtime Notes

### 11.1 Node version

Use Node >= 18.17 (Node 20 recommended).

### 11.2 Fonts

In restricted build environments, `next/font/google` can fail if Google is unreachable.

Resilient fallback used here:

- CSS `@import` font URL (runtime fetch) instead of build-time `next/font` fetch

### 11.3 Network limitations during agent runs

If npm registry access is unavailable, avoid adding new dependencies mid-task. Prefer built-in symbols/styles for icons.

## 13. Hydrologic Interconnection Dataset

Use `public/data/hydrologic_interconnection.json` to store basin-level evidence flags:

- `shared_aquifer_risk` (boolean)
- `transfer_system_dependent` (boolean)
- `summary` (human-readable interpretation)
- `sources[]` (title/type/url)

Recommended official sources:

- CONAGUA aquifer availability geovisor
- CONAGUA systems portal
- CONAGUA open data portal
- Official transfer-system communiques (e.g., Cutzamala updates)
- NOM-011-CONAGUA method reference

## 14. Minimal Rebuild Sequence (from empty folder)

1. Init Next.js project structure and dependencies.
2. Add default CSV in `public/data/`.
3. Implement CSV parser with field maps + lat/lon fallbacks.
4. Build map component with markers + popups.
5. Add upload + filter + mapped/unmapped lists + detail modal.
6. Add meter/media extraction.
7. Add risk score model + icon legend.
8. Add i18n dictionary + language toggle.
9. Add HydroBASINS extraction script + overlay.
10. Add Aggregated tab with incremental + cumulative series.
11. Record assumptions in UI + README.
12. Add Mexico data-center markers + provider styles.
13. Add Aqueduct comparison output for both school and data-center basins.
14. Add hydrologic interconnection evidence dataset and sidebar panel.
15. Run `npm run build` before handoff.

## 15. Verification Checklist

- [ ] Map loads with default CSV
- [ ] Uploaded CSV overrides in-session dataset
- [ ] Unmapped schools appear in dedicated list
- [ ] Marker popup shows meter/media/risk
- [ ] Basin polygons draw and can be toggled
- [ ] Initial map view fits full basin when shown
- [ ] Data-center markers are provider-colored and visible
- [ ] Data-center basin polygon is drawn and risk-colored
- [ ] Aqueduct legend shows explicit risk class numbers (0..4)
- [ ] Data-center popup includes disclosure links and source labels
- [ ] Hydrologic interconnection card shows flags and evidence links
- [ ] Aggregated tab shows incremental and cumulative plots
- [ ] Unidentified basin bucket appears when needed
- [ ] English/Spanish toggle updates all key UI labels
- [ ] Assumptions visible in Aggregated tab and README
- [ ] `npm run build` passes

## 16. Useful Commands

```bash
# run app
npm install
npm run dev

# production build check
npm run build

# regenerate HydroBASINS overlay after CSV update
npm run extract:basins

# generate Aqueduct risk comparison for school basins
python3 scripts/compare-aqueduct-basins.py \
  --basins public/data/hydrobasins_l6_schools.geojson \
  --output public/data/basin_risk_comparison.json

# generate Aqueduct risk comparison for data-center basins
python3 scripts/compare-aqueduct-basins.py \
  --basins public/data/hydrobasins_l6_datacenters.geojson \
  --output public/data/datacenter_basin_risk_comparison.json
```

## 17. Suggested Next Enhancements

- Persist uploads server-side (API route + storage) for multi-session continuity
- Add basin hover highlighting + click-to-filter schools
- Add anomaly flags for reading drops/resets and meter replacement events
- Add downloadable aggregated CSV/JSON exports

## 18. Colab Notebook Packaging Notes

To keep Colab reproducible and standalone:

- Embed a default CSV text payload directly in the notebook.
- Keep optional manual upload path (`USE_UPLOAD = True`) so users can replace data.
- Read CSV from `StringIO(csv_text)` so both embedded and uploaded flows share the same parser path.
- Clearly label inferred vs sourced basin/risk layers in notebook outputs.
- Include external context layers in map output for parity with app:
  - Mexico hyperscaler data-center points + matched HydroBASINS + Aqueduct risk
  - Google RFI inferred points + matched HydroBASINS + Aqueduct risk (including Dallas reference)
- Keep embedded default CSV synchronized with `public/data/seguimiento.csv` (exact text parity check recommended).
- Harden meter parsing with real header variants seen in field exports, including:
  - `LECTURA DEL MEDIDOR (EN M CUBICOS)`
  - `¿EL MEDIDOR FUNCIONA CORRECTAMENTE?`
  - `NUMERO DE MEDIDOR`
- Add defensive fallbacks in aggregation/map cells when optional columns are missing (`meter_number`, `meter_status`, `m3_used`, `school_key`).
- Print selected meter columns at runtime to make schema drift visible to users.
