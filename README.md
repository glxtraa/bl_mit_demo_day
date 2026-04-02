# Blue Lifeline Demo Day App

Vercel-ready end-to-end demo for MIT Demo Day covering:
- Project onboarding
- Meter data ingestion (local APIs + simulated replay)
- Certification workspace (AI recommendation + explicit human approval)
- Issuance (VWB eligibility -> WBT)
- Permissioned buyer retirement
- Certificate/report generation
- Basin vs school localization map using provided school dataset

## 1) Prepare data assets

```bash
npm install
npm run prepare:data
```

This builds:
- `public/data/schools.cleaned.json`
- `public/data/projects.seed.json`
- `public/data/basins.geojson`

from `Background/Schools/school-data.csv`.

## 2) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 3) API endpoints in this app

- `POST /api/utilizado`
- `POST /api/captado`
- `POST /api/nivel`
- `POST /api/simulate` (generates measurements and sends them to local APIs; can also forward to existing API)
- `POST /api/reports` (persist generated certificate/report)
- `GET /api/download` (returns all ingested records, audit events, and reports)

## 4) Forward simulation data to existing SSCAP API

Set env vars (locally in `.env.local`, in Vercel Project Settings for deployment):

- `SSCAP_API_BASE_URL` = your existing API base URL (for example `https://sscap-api.vercel.app`)
- `SSCAP_API_TOKEN` = optional bearer token if your API requires it

When you click **Simulate + send to APIs**, the app sends data to:
- local demo APIs (`/api/utilizado`, `/api/captado`, `/api/nivel`)
- existing API (`$SSCAP_API_BASE_URL/api/*`) when configured

## 5) Vercel deployment

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add env vars from `.env.example` in Vercel settings.
4. Deploy.

## Notes

- Data persistence in this demo uses `/tmp` JSON storage in server routes for simple demo traceability.
- `/api/download` is the audit/debug endpoint for the full flow in one payload.
- Basin polygons are derived from school geographic clusters for demo localization and not official HydroBASINS boundaries.
