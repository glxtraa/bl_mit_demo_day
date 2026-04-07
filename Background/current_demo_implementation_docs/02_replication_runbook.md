# 02 - Replication Runbook

## Prerequisites

- Node 20+
- npm
- Internet access for HydroBASINS and NASA POWER fetch scripts

## Install

```bash
npm install
```

## Build core school/project assets

```bash
npm run prepare:data
```

Outputs:
- `public/data/schools.cleaned.json`
- `public/data/projects.seed.json`

## Build real HydroBASINS layer

```bash
npm run fetch:hydrobasins
```

Output used by map:
- `public/data/hydrobasins_l6_schools.geojson`

## Build rain seasonality profile

```bash
npm run fetch:rain
```

Output:
- `public/data/rain_seasonality.json`

## Generate 2025 weekly simulation

```bash
npm run simulate:2025
```

Outputs:
- `tmp/sscap_2025_weekly_payload.json`
- `tmp/sscap_2025_weekly_summary.json`
- `tmp/sscap_2025_weekly_api_download.json`

Hosted demo copies:
- `public/data/sscap_2025_weekly_api_download.json`
- `public/data/sscap_2025_weekly_summary.json`

## Run app locally

```bash
npm run dev
```

Open: `http://localhost:3000`

## Optional: send 2025 simulation to external SSCAP API

```bash
npm run simulate:2025:send -- --api-base=https://your-sscap-api
```

Env vars (optional):
- `SSCAP_API_BASE_URL`
- `SSCAP_API_TOKEN`

## Vercel deploy

1. Push repo.
2. Import project in Vercel.
3. Set env vars (if needed).
4. Deploy.

The hosted demo file can then be loaded from Step 4 (`Use Hosted Demo File`).
