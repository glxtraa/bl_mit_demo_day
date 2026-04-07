# 05 - Spec Traceability Matrix

Reference: `Blue_Lifeline_MVP_Webapp_Product_Definition_Concise.docx.md`

## Legend

- `Implemented`: available in current demo.
- `Partial`: present in simplified/demo form.
- `Gap`: not yet implemented.

## A. Core workflow traceability

| Spec requirement | Status | Where implemented |
| --- | --- | --- |
| Admin creates promoter and project | Implemented | Step 1 onboarding UI with `promoter` + project fields in [app/page.js](/Users/lamat/Documents/OpenAI/bl_mit_demo_day/app/page.js) |
| Certification reviews project data | Implemented | Step 4 certification workspace + AI assist + reviewer controls |
| Human approval is explicit | Implemented | Step 4 `Human approve / Request info / Reject` + review record metadata |
| WBT issuance from approved certification | Implemented | Step 5 issuance gated by review + aggregate approval |
| Offtaker purchase/buyer action | Implemented | Step 6 marketplace inventory filters + issuance-batch purchase action |
| Retirement and reporting | Implemented | Step 6 retirement + Step 7 report/certificate payload |

## B. Detailed feature traceability

| Spec section | Requirement | Status | Where implemented |
| --- | --- | --- | --- |
| 4.1 Project onboarding | Project object with ID/type/location/status/evidence/device links | Implemented | Project state + seeded school/device links + Step 1 |
| 4.1 Project onboarding | Support at least 2 project types in model | Implemented | `PROJECT_TYPES` (3 values) in [app/page.js](/Users/lamat/Documents/OpenAI/bl_mit_demo_day/app/page.js) |
| 4.1 Project onboarding | Show timeline/evidence/issuance history | Partial | Timeline + issuance list present; evidence shown via dossier in Step 2 |
| 4.2 Meter ingestion | Ingest real/replay flow data | Implemented | `/api/simulate`, `/api/utilizado`, `/api/captado`, `/api/nivel` |
| 4.2 Meter ingestion | Store timestamp/device/project/increment/quality flags | Partial | timestamp/device/increment stored; explicit quality flags simplified |
| 4.2 Meter ingestion | Device health statuses | Implemented | `online/delayed/suspect` shown in UI status pills |
| 4.3 Certification | Reviewer screen with docs/device/method flags/gaps | Implemented | Step 4 + dossier + AI recommendation/missing evidence |
| 4.3 Certification | Human decision log with reviewer/time/version/comments | Implemented | Review object includes reviewer, decision, timestamp, methodologyVersion, comments |
| 4.4 Issuance engine | Eligible volume (not raw) | Implemented | Aggregated `utilizado` basin-quarter * 0.85 |
| 4.4 Issuance engine | Approval dependency before issuance | Implemented | Requires project review + aggregate approval |
| 4.4 Issuance engine | Issuance records with trace fields | Implemented | Issuance includes project/basin/quarter/reviewer/method/version |
| 4.5 Permissioned buyer | Unapproved users blocked | Implemented | Retirement blocked for unapproved buyer |
| 4.5 Permissioned buyer | Buyer sees source metadata | Implemented | Step 6 inventory cards show batch/project/basin/type/promoter source fields |
| 4.6 Retirement | Irreversible retirement flow + before/after balance | Implemented | Step 6 flow + KPI balances |
| 4.7 Reporting | Report generated immediately with required fields | Implemented | `/api/reports` and Step 7 output |

## B2. MVP module deliverables check (latest spec)

| MVP module | Deliverable from spec | Status |
| --- | --- | --- |
| Admin | Admin dashboard | Implemented |
| Admin | Create promoter form | Implemented (`promoter` field in onboarding) |
| Admin | Create project form | Implemented |
| Admin | Document uploader | Partial (dossier downloads + uploaded certification JSON; no generic evidence uploader UI yet) |
| Admin | Project detail page | Implemented (tabbed detail panel) |
| Certification | Data ingestion pipeline | Implemented |
| Certification | AI review engine | Partial (assistive recommendation + checklist style output) |
| Certification | Certification summary page | Implemented |
| Certification | Human approval screen | Implemented |
| Certification | Exportable audit package | Partial (`/api/download` + report JSON; no single packaged zip export endpoint) |
| Blockchain | Mint from approved certification | Implemented (app-layer issuance) |
| Blockchain | Token batch page | Implemented (issuance list in Blockchain module) |
| Blockchain | Metadata registry | Implemented (issuance metadata persisted in app records) |
| Blockchain | Issuance history | Implemented |
| Marketplace | Inventory list | Implemented |
| Marketplace | Filters | Implemented (basin/type/promoter) |
| Marketplace | Token batch detail | Implemented (inventory rows by issuance batch) |
| Marketplace | Purchase action | Implemented |
| Customer Account | Goal setup | Gap |
| Customer Account | Holdings dashboard | Implemented |
| Customer Account | Burn flow | Implemented |
| Customer Account | Retirement reports | Implemented |
| Map | Map with pins | Implemented |
| Map | Filters | Partial (school selector + multi-basin chart selectors; full map filter toolbar can be expanded) |
| Map | Project detail link | Implemented (map selection drives project/school detail) |

## C. AI component traceability

| AI module from spec | Status | Implementation |
| --- | --- | --- |
| VWBA method assistant | Partial | `runAiReviewRecommendation` with recommendation + confidence + missing list |
| Certification evidence copilot | Partial | Dossier surface + missing evidence + reviewer comments; no full extraction pipeline UI |
| Issuance guardrail checker | Implemented | Issuance blocked unless review approved + aggregate approved |
| Claim-safe report writer | Partial | Claim-safe language template included in generated certificate/report |
| Meter anomaly detector | Partial | Meter status flags exist; no dedicated anomaly model view |

## D. Map and basin requirement

| Requirement | Status | Where implemented |
| --- | --- | --- |
| Interactive map with projects/basins remains in product | Implemented | Step 2 `Basin vs School Localization` |
| Real basins (no demo fallback) | Implemented | Requires `public/data/hydrobasins_l6_schools.geojson` |
| Basin-aware filtering/aggregation | Implemented | Certification and issuance aggregated by basin+quarter |

## E. Data and certification pipeline traceability

| Requirement | Status | Where implemented |
| --- | --- | --- |
| Read SSCAP API data | Implemented | `/api/certification` GET with optional external SSCAP source |
| Upload file as alternative source | Implemented | Step 4 `Upload Download JSON` + `Use Hosted Demo File` |
| Remove duplicates | Implemented | `/api/certification` dedupe pass |
| Map `tlaloque_id` to basin using lat/lon | Implemented | School device map + HydroBASINS point-in-polygon |
| Aggregate by basin and quarter | Implemented | `/api/certification` aggregates + Step 4 charts |
| Visualize basin trends over time | Implemented | Step 4 multi-basin quarterly + captured timeseries charts |

## F. Known gaps for next pass

1. Rich project detail page with first-class evidence and issuance history tabs (currently snapshot-style panel).
2. Durable storage replacing `/tmp` for production-like persistence.
3. Full blockchain ledger adapter visibility (currently demo-grade issuance records).
