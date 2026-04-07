# 04 - Spec Alignment and Gaps

Reference spec: `Blue_Lifeline_MVP_Webapp_Product_Definition_Concise.docx.md` (root)

## Implemented alignment

- Project onboarding record: present.
- Certification workspace with human approval: present.
- Issuance only after approval: present.
- Buyer retirement and report generation: present.
- Permissioned buyer restriction (unapproved buyer cannot retire): present.
- Map section with basins: present and retained.
- Multi-type project support in data model: present.
- Reviewer decision metadata includes reviewer, decision, timestamp, methodology version, comments: present.

## Partially implemented / demo-mode approximation

- Blockchain issuance is represented as auditable app records, not full production ledger integration.
- Marketplace is minimal and embedded in current workflow (no separate inventory marketplace page).
- AI modules are represented as deterministic + assistive recommendation patterns rather than full modular AI service boundaries.
- Persistence is demo-grade (`/tmp`) instead of durable production storage.

## Suggested next implementation pass

1. Add a dedicated project detail panel with:
- project timeline
- linked evidence
- issuance history

2. Expand buyer portal into separate screen:
- inventory filters by basin/technology/promoter
- issuance batch detail cards

3. Add explicit device quality flags in UI:
- online/delayed/offline/suspect with timestamps

4. Add exportable certification audit package download endpoint.

5. If needed for investor demo:
- add one ledger adapter interface with mock/prod switch.
