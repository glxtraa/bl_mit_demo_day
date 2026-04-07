# 01 - System Overview

## End-to-end workflow implemented

1. Project onboarding (Step 1)
- Create project record with `projectName`, `promoter`, `projectType`, basin, coordinates, status.
- Supports multiple project types in model:
  - `captacion_agua_de_lluvia_scall`
  - `desalination_water_treatment`
  - `leak_reduction_efficiency`

2. Basin map + school dossier (Step 2)
- Real OSM map with school markers.
- Real HydroBASINS layer only (no fallback).
- Basin map remains a dedicated section in the flow.
- School dossier file download links via `/api/dossier-file`.

3. Meter ingestion + replay (Step 3)
- Local replay (`/api/simulate`) generates `utilizado/captado/nivel`.
- Optional forwarding to external SSCAP API if env vars exist.
- Seasonal multiplier from NASA POWER rain profiles.

4. Certification workspace (Step 4)
- Data source can be:
  - API (`/api/certification` GET), or
  - Uploaded JSON (`/api/certification` POST), or
  - Hosted demo JSON button.
- Pipeline:
  - read records
  - dedupe
  - map `tlaloque_id` to basin via school lat/lon and HydroBASINS polygons
  - aggregate by basin + quarter
- Charts:
  - basin totals (used m3)
  - quarterly used per basin (multi-basin selectable)
  - captured water over time per basin (multi-basin selectable)
- Human review controls with reviewer comments.

5. Issuance (Step 5)
- Issuance gated by:
  - project review approval
  - basin+quarter aggregate approval
- Uses `eligibleVolume = aggregatedUtilizadoM3 * 0.85`.

6. Buyer + retirement (Step 6)
- Permissioned buyer constraint enforced.
- Retirement updates balance and produces certificate/report payload.

7. Certificate + audit (Step 7)
- Stores report via `/api/reports`.
- Displays timeline + generated report data.

## Core APIs in this app

- `POST /api/utilizado`
- `POST /api/captado`
- `POST /api/nivel`
- `POST /api/simulate`
- `GET /api/download`
- `GET|POST /api/certification`
- `POST /api/events`
- `POST /api/reports`
- `GET /api/dossier-file`

## Persistence model

- Demo persistence uses `/tmp` JSON store in `lib/serverStore.js`.
- Suitable for demo traceability, not production durability.
