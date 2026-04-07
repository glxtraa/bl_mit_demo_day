# Blue Lifeline Demo - Current Implementation Docs

This folder documents the current state of the Demo Day web app, all implemented features, and exact replication steps.

## Files in this folder

- `01_system_overview.md`: Product workflow and module behavior implemented so far.
- `02_replication_runbook.md`: Commands to rebuild datasets and run locally/Vercel.
- `03_data_sources_and_formats.md`: Data inputs, generated files, and upload formats.
- `04_spec_alignment_and_gaps.md`: Alignment against the latest MVP spec and remaining gaps.
- `05_spec_traceability_matrix.md`: Requirement-by-requirement mapping from spec to implementation.

## Quick replication

```bash
npm install
npm run prepare:data
npm run fetch:hydrobasins
npm run fetch:rain
npm run simulate:2025
npm run dev
```

Then open `http://localhost:3000`.

## Demo upload file (hosted in app)

- `/data/sscap_2025_weekly_api_download.json`
- `/data/sscap_2025_weekly_summary.json`

These are generated from 2025 weekly simulation and can be loaded in Step 4 (`Use Hosted Demo File` or upload manually).
