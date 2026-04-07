# 03 - Data Sources and Formats

## Source datasets

1. School registry and technical dossier
- `Background/Schools/school-data.csv`
- `Background/Schools/BL_IU_Technical/**`

2. HydroBASINS polygons
- Downloaded by script and matched to school points.
- UI uses: `public/data/hydrobasins_l6_schools.geojson`

3. Rainfall data
- NASA POWER API
- Monthly profiles for seasonality:
  - `public/data/rain_seasonality.json`
- Daily history (2025) for weekly simulation generation.

## Certification input formats accepted

`/api/certification` accepts:

1. App-native `/api/download` style
```json
{
  "generatedAt": "...",
  "records": [{ "type": "utilizado|captado|nivel", "data": {...}, "createdAt": "..." }],
  "events": [],
  "reports": []
}
```

2. Legacy SSCAP export style
```json
{
  "data": [{ "filename": "sscap/utilizado/...", "content": { "data": {...} } }]
}
```

3. Weekly simulation payload style
```json
{
  "records": [
    {
      "captado": {...},
      "utilizado": {...},
      "nivel": {...}
    }
  ]
}
```

## Recommended upload file for demo

- `public/data/sscap_2025_weekly_api_download.json`

This is the closest to what `/api/download` returns and is available from hosted static assets.

## Conversion assumptions used in simulation

- 1 pulse = 0.01 m3 for simulated captado/utilizado payload creation.
- Weekly aggregation based on Monday-start UTC weeks.
- 2025 values use NASA POWER daily `PRECTOTCORR`.
