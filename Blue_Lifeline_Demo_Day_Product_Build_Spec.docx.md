**BLUE LIFELINE**

**Demo Day Product Build Spec**

June 17 MIT Startup Exchange Demo Day | Development team handoff | Version 1.0

Prepared for: Product, engineering, data, certification operations, and design  •  Prepared by: Strategy / product direction

| This document defines the build target for Demo Day. Goal: Show one complete, credible workflow from metered project activity to retirement and reporting. Key principle: Blue Lifeline is a verification and transaction platform for water outcomes — not a speculative token product. Naming: Use Verified Water Benefits (VWB) and Water Benefit Tokens (WBTs) throughout the product, copy, and code comments. |
| :---- |

**1\. Product definition and Demo Day objective**

Blue Lifeline should be presented as the trust layer for water replenishment and water-benefit markets. The platform helps corporate buyers support eligible water projects and prove the resulting impact through metering, certification, controlled issuance, retirement, and reporting.

For Demo Day, the product must demonstrate that Blue Lifeline can convert approved project-side water outcomes into auditable Water Benefit Tokens (WBTs), allow an approved buyer to retire those WBTs, and immediately generate a credible retirement record and report.

| Working definitions Verified Water Benefits (VWB): Approved, quantified water outcomes from eligible projects, backed by meter data, project evidence, and certification review. Water Benefit Tokens (WBTs): Permissioned digital instruments that represent approved VWBs and can be allocated, transferred between approved parties, and retired. Retirement: The irreversible action that removes WBTs from circulation and ties them to a buyer, project, date, volume, and report. |
| :---- |

**2\. Demo Day scope: what must be live**

The team should build and polish one end-to-end path. Do not spread effort across broad marketplace, trading, or token-liquidity features. The required path is below.

| ID | Capability | Must be live? | Reason it matters |
| :---: | :---- | :---: | :---- |
| 01 | Project onboarding record | **Yes** | Creates the project object, shows project type, location, status, and links the project to evidence and meter devices. |
| 02 | Meter data ingestion | **Yes** | Shows that the system can ingest real or replayed IoT flow data tied to a specific project and time period. |
| 03 | Certification review workspace | **Yes** | Makes the approval process visible and credible; issuance must occur only after review. |
| 04 | VWB eligibility / issuance engine | **Yes** | Converts approved eligible volume into issued WBTs using rules and audit logs. |
| 05 | Permissioned buyer portal | **Yes** | Demonstrates controlled access, compliance-by-design, and enterprise readiness. |
| 06 | Retirement / burn flow | **Yes** | This is the value moment for the buyer and the centerpiece of the demo. |
| 07 | Retirement certificate and report | **Yes** | Turns the transaction into something corporates can use internally and externally. |
| 08 | Secondary trading / AMM | **No** | Not needed for the June 17 story and would dilute effort. |
| 09 | Consumer-facing logo automation | **No** | Can be described, but not required in the demo. |

**3\. End-to-end user flow that the demo must show**

**1\. Project registration**: internal admin creates or imports a project profile with project type, location, expected water outcome type, and supporting documentation.

**2\. Device association**: one or more Blue Lifeline meters are linked to the project and start sending data, either live or via approved replay mode for the demo.

**3\. Evidence intake**: the system stores site documents, images, permits, engineering data, and any methodology-specific inputs needed for certification.

**4\. Certification review**: a reviewer sees the evidence packet, AI-generated recommendations, outstanding gaps, and approves or rejects issuance readiness.

**5\. Issuance**: once approved, the system calculates eligible verified volume and issues WBTs to the project account with a full audit trail.

**6\. Buyer action**: an approved buyer signs in, views available WBTs, acquires the desired quantity, and retires them.

**7\. Report generation**: retirement triggers creation of a certificate and report showing project, volume, dates, methodology/version, and claim-safe language.

| Demo Day success condition A skeptical corporate audience should be able to understand in under 60 seconds: what is being measured, who approved it, what got issued, what got retired, and what report came out of it. |
| :---- |

**4\. Detailed feature requirements**

**4.1 Project onboarding and project profile**

**Functional requirements**

* Create a project object with the following minimum fields: project ID, project name, project type, basin or location, country, site coordinates, operator, status, linked device IDs, evidence files, certification reviewer, methodology status, and notes.  
* Support at least two project types in the data model even if only one is demoed: desalination / water treatment and leak reduction / efficiency.  
* Allow a reviewer to see project timeline, uploaded evidence, and issuance history from one screen.

**Acceptance criteria**

* A new project can be created in under 3 minutes.  
* The project record clearly shows whether it is draft, under review, approved, suspended, or rejected.  
* Every issued WBT can be traced back to a project record and device.

**4.2 Meter data ingestion and device layer**

**Functional requirements**

* Ingest flow data from Blue Lifeline meter events or from a replay file that mimics production device output.  
* Store timestamp, device ID, project ID, cumulative reading, incremental reading, unit, and data quality flag.  
* Provide a simple device health status: online, delayed, offline, or suspect.

**Acceptance criteria**

* Data appears in the project dashboard within seconds or via replay controls.  
* The system can isolate a time window and show the eligible underlying volume for that window.  
* An operator can identify the exact meter source behind an issuance event.

**4.3 Certification review workspace**

**Functional requirements**

* Build a reviewer screen that shows project documents, device history, methodology recommendation, AI flags, missing evidence, and approval controls.  
* Separate AI recommendations from final reviewer decisions. The UI must make human approval explicit.  
* Capture reviewer name, decision, timestamp, comments, and version of the methodology used.

**Acceptance criteria**

* A reviewer can approve, reject, or request more information.  
* The platform stores a decision log and does not allow issuance without an approval state.  
* The team can demonstrate why a specific project or volume was considered eligible.

**4.4 Issuance engine for VWB to WBT conversion**

**Functional requirements**

* The issuance engine should calculate approved eligible volume, not raw flow volume. This is a critical product principle.  
* For the demo, support a rules-based issuance method with configurable conversion logic and an approval dependency.  
* Write issuance records to the ledger layer and to the application database with the same reference ID.

**Acceptance criteria**

* The platform creates a visible issuance event only after approval.  
* Issuance records include source project, volume, time period, reviewer, and methodology version.  
* A user can view total issued, available, and retired balances.

**4.5 Permissioned buyer portal**

**Functional requirements**

* Support buyer accounts with approval status, company identity, and role-based permissions.  
* Present a buyer view that shows available WBTs, project metadata, issuance date, and retirement actions.  
* If the ERC-3643 layer is used, keep the blockchain complexity behind the UI and surface only the controls that matter to enterprise users.

**Acceptance criteria**

* An unapproved user cannot access transfer or retirement actions.  
* A buyer can see what is being purchased and from which project it originated.  
* The buyer experience feels enterprise-ready, not crypto-native.

**4.6 Retirement workflow**

**Functional requirements**

* Support retirement from the buyer portal with confirmation of quantity, buyer entity, purpose, and acknowledgement text.  
* Retirement must be irreversible in the user flow and must create an immutable audit record.  
* The retirement screen should show the before-and-after token balance.

**Acceptance criteria**

* A retired quantity cannot be transferred again.  
* The system records who retired the WBTs, when, and for what project-backed volume.  
* The demo can complete the retirement action live without manual engineering intervention.

**4.7 Retirement certificate and reporting**

**Functional requirements**

* Generate a downloadable certificate plus a fuller report page immediately after retirement.  
* The report must include: buyer, project, location, device reference, issuance batch, volume retired, retirement date, methodology/version, reviewer, and claim-safe wording.  
* Store reports so they can be retrieved later from both buyer and admin views.

**Acceptance criteria**

* The report is generated in under 10 seconds.  
* The output is clear enough to show in the demo and polished enough to send to a corporate contact after the event.  
* Every figure shown in the report can be traced back to system records.

**5\. AI-enabled components the team should build into the workflow**

AI should accelerate review, improve consistency, and reduce manual effort — but it must not make final certification or issuance decisions on its own. The platform should combine AI assistance with deterministic rules and human approval.

| AI module | Purpose | Type | Human in loop? | Minimum output |
| :---- | :---- | :---: | :---: | :---- |
| VWBA method assistant | Suggests likely VWBA category, indicator, and data inputs for a project based on documents and project type. | LLM \+ rules | **Yes** | Method recommendation with confidence and missing data list |
| Certification evidence copilot | Reads uploaded evidence, extracts key facts, flags gaps, and drafts a reviewer checklist. | LLM | **Yes** | Structured evidence summary and risk flags |
| Issuance guardrail checker | Checks whether required fields, reviewer approvals, and issue constraints are satisfied before issuance. | Rules / ML | **Yes** | Pass / fail \+ reasons |
| Claim-safe report writer | Drafts retirement report language that aligns with approved methodology and avoids unsupported claims. | LLM \+ policy prompts | **Yes** | Narrative summary for final reviewer approval |
| Meter anomaly detector | Flags suspicious spikes, dropouts, or inconsistent patterns before they flow into issuance logic. | Rules / ML | **Yes** | Data quality flag and anomaly explanation |

**5.1 AI module details and implementation guidance**

**VWBA method assistant**

* Input: project type, uploaded documents, site description, location, engineering notes, project photos, and meter metadata.  
* Output: recommended method family, candidate volumetric indicator, list of missing inputs, and confidence score.  
* Implementation note: start with prompt-based document extraction plus a deterministic mapping table. Do not rely on a free-form model answer alone.

**Certification evidence copilot**

* Input: permits, site visit notes, contracts, technical specs, geolocation, device records, and methodology form fields.  
* Output: one-page summary, extracted facts, missing evidence, inconsistency flags, and questions for the reviewer.  
* Implementation note: this should save reviewer time by turning unstructured documents into a structured checklist.

**Claim-safe report writer**

* Input: retirement event, approved methodology, project metadata, reviewer decision, and allowed claims library.  
* Output: report summary text, plain-English explanation of what was retired, and a compliant disclaimer block.  
* Implementation note: use templates plus AI refinement. Final copy should be locked down by policy rules.

| Important AI rule AI can recommend; humans approve. Certification approval, issuance approval, and external claims approval must remain human-controlled actions with full audit logs. |
| :---- |

**6\. Suggested system architecture and core services**

The June 17 version does not need a fully scaled production architecture, but it should already express the long-term product shape. The minimum architecture should include the components below.

* Application layer: admin console, reviewer console, buyer portal, authentication and permissions.  
* Project and evidence service: stores project objects, documents, notes, statuses, and approval records.  
* Meter ingestion service: receives or replays device events, validates schema, applies data quality checks, and stores time-series records.  
* AI services layer: document extraction, VWBA recommendation, claim-safe report drafting, anomaly detection.  
* Issuance engine: deterministic rules engine that calculates eligible volume and triggers issuance only after approvals are satisfied.  
* Ledger / token layer: ERC-3643-compatible or similarly permissioned ledger layer for issuance, allocation, transfer, and retirement.  
* Reporting service: generates retirement certificates, downloadable reports, and event-level audit views.  
* Audit and monitoring: immutable event log covering data ingestion, approvals, issuance, transfers, retirement, and report generation.

**7\. Data model: minimum entities**

| Entity | Minimum fields | Notes |
| :---- | :---- | :---- |
| Project | ID, type, operator, location, basin, status, methodology status, linked devices | Primary origin for all benefit records |
| Device | ID, project ID, model, install date, status, telemetry settings | Should support multiple devices per project |
| Meter event | Timestamp, device ID, project ID, reading, delta, unit, quality flag | Immutable source events |
| Evidence file | Project ID, file type, uploader, date, extracted facts, review status | Feeds AI and reviewer UI |
| Review decision | Reviewer, timestamp, decision, reasons, methodology version, comments | Required prior to issuance |
| Issuance batch | ID, project ID, period, approved eligible volume, reviewer, method version | Links the physical event to tokens |
| WBT record | Token ID or batch ID, owner, balance, status, issuance reference | Permissioned digital instrument |
| Retirement event | Buyer, timestamp, quantity, purpose, certificate ID, report ID | Must be final and traceable |

**8\. Compliance, security, and product guardrails**

* Use permissioned access by default. Admin, reviewer, operator, and buyer should have distinct roles and action rights.  
* Maintain KYC / AML alignment in account onboarding if the ledger layer is exposed to external entities.  
* Never issue tokens directly from raw meter flow without a review and rules check.  
* Persist full audit logs for evidence uploads, approvals, issuance, transfer, retirement, and report generation.  
* Separate demo mode from production logic if using replayed data. The user interface must still look authentic, but the backend should preserve the distinction.  
* Do not allow AI-generated copy to bypass human review where the output may create an external claim.

**9\. Suggested delivery sequence from now to Demo Day**

Engineering should sequence work around the demo path, not around subsystems in isolation. The order below reduces integration risk and keeps the team oriented toward a visible result.

1. Sprint 1: finalize product language, define entities, create project object, meter event schema, and approval states.  
2. Sprint 2: connect or simulate device ingestion, build project dashboard, and render visible event history.  
3. Sprint 3: build certification workspace, evidence ingestion, and the first AI-assisted review summary.  
4. Sprint 4: implement issuance engine and ledger integration, then expose balances in admin and buyer views.  
5. Sprint 5: complete buyer retirement flow, certificate generation, and report generation.  
6. Sprint 6: harden permissions, polish the demo, pre-load data, and rehearse the full flow repeatedly.

**10\. Open product decisions that should be resolved immediately**

* What exact naming will appear in the UI: “Verified Water Benefits”, “Water Benefit Tokens”, or both? Recommended: use both, with a short glossary in-product.  
* What project type will be used in the live demo? Recommended: use the project with the strongest available evidence and clearest story, even if the long-term platform supports multiple types.  
* What is the exact issuance logic for the demo? Recommended: pick one well-defined rules path and document it clearly instead of over-generalizing.  
* Will the team show the blockchain layer directly? Recommended: only show it if it adds trust instantly; otherwise keep it backstage and show the business outcome.  
* What report format will be generated on-stage? Recommended: one certificate view plus one fuller detail report page.

**Appendix A. Demo script checklist**

* Open a real project profile with visible location, device, and status.  
* Show incoming meter events and the current verified eligible volume.  
* Open the certification workspace and point to the reviewer approval.  
* Show the issuance record and available WBT balance.  
* Switch to the buyer view and retire WBTs.  
* Open the certificate and report generated from the retirement event.  
* Close by restating that Blue Lifeline makes water outcomes measurable, approved, auditable, and usable.

Working basis for this specification: Blue Lifeline deck, supporting VWBA materials, water replenishment reporting context, Climate Bonds water criteria, and permissioned token standards reviewed during product framing.