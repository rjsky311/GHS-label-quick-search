# GHS Label Quick Search

Free GHS chemical lookup and label-printing utility for lab, operations, and
safety-adjacent workflows.

The app helps users search by CAS number or chemical name, review available
GHS hazard information, verify SDS/reference links, export results, and prepare
printable label outputs. It is designed as a fast reference and workflow tool,
not as a legal compliance authority.

## Production

- Frontend: https://ghs-frontend.zeabur.app
- Backend health: https://ghs-backend.zeabur.app/api/health
- Current runtime version: `1.10.0`
- Deployment: Zeabur auto-deploys from `main`

## Safety Boundary

This project is a safety-supporting reference utility. Users should verify
label content against the current supplier SDS, official regulatory sources,
workplace rules, and local law before operational use.

Important boundaries:

- Missing upstream data must not be treated as "no hazards."
- Printed hazard labels must preserve available GHS pictograms.
- QR small labels and identification small labels do not replace a complete
  A4/Letter label with full H/P content.
- Brand, support, education, or conversion surfaces must stay outside
  safety-critical printed label content.

## Main Capabilities

- CAS and English/Chinese name search.
- PubChem GHS lookup with local dictionary fallback for common names.
- Multiple GHS classification comparison where upstream data differs.
- SDS/reference links with role-aware ordering.
- Excel and CSV export.
- Bilingual English/Traditional Chinese UI.
- Purpose-first label print flow with three public outputs: A4/Letter complete
  labels, QR small labels, and identification small labels, with live preview,
  recent prints, lab profile, and prepared-solution support.
- Admin-gated pilot tools for dictionary/manual-reference maintenance and
  optional workspace sync.

## Data Sources

The app combines:

- PubChem REST API data.
- A local chemical dictionary with CAS/name mappings.
- Optional admin-curated aliases, manual entries, and reference links.

Source ranking, authority boundaries, SDS/reference behavior, QR target rules,
and telemetry limits are documented in
[DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md](./DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md).

## Maintainer Planning

The canonical planning entry point is
[PROJECT_STATUS_AND_NEXT_PLAN.md](./PROJECT_STATUS_AND_NEXT_PLAN.md). The
current post-95 target ranking is
[POST_95_REPRIORITIZATION.md](./POST_95_REPRIORITIZATION.md). The shipped
post-95 target owner doc is
[PILOT_OPERATIONS_READY_PLAN.md](./PILOT_OPERATIONS_READY_PLAN.md), with pilot
operator checks in [PILOT_RUNBOOK.md](./PILOT_RUNBOOK.md). The shipped
short-term evidence pass is
[PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md](./PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md).
The latest Batch-First productization owner doc is
[BATCH_FIRST_LAB_PILOT_V1_PLAN.md](./BATCH_FIRST_LAB_PILOT_V1_PLAN.md), now in
shipped/monitoring status; use it as evidence for new monitoring-driven slices.
The shipped 95% lab-ready pilot evidence packet is
[LAB_READY_PILOT_95_PLAN.md](./LAB_READY_PILOT_95_PLAN.md). Use
[PRODUCT_SCOPE_GATE.md](./PRODUCT_SCOPE_GATE.md) before broad product-direction
changes.

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend environment defaults are in [backend/.env.example](./backend/.env.example).
Single-worker local/dev deployments use in-memory rate limiting. Before
scaling the backend to multiple workers or instances, configure shared
rate-limit storage with `RATE_LIMIT_STORAGE_URI`, `LIMITS_STORAGE_URI`, or
`REDIS_URL` so public endpoint limits remain consistent across instances.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Frontend environment defaults are in [frontend/.env.example](./frontend/.env.example).
For local development, `VITE_BACKEND_URL` normally points to
`http://localhost:8001`.

## Useful Commands

Backend:

```bash
cd backend
python -m py_compile server.py api_models.py api_validation.py export_helpers.py
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm test -- --runInBand
npm run test:i18n
npm run test:docs
npm run build
npm run qa:bundle-budget
npm run test:print-contract
```

`qa:bundle-budget` runs after `npm run build` in CI and guards the initial app
chunk plus the critical lazy print/admin chunks. Treat a failure as evidence
for targeted code splitting; do not split stable first-screen code by default.

Production QA:

```bash
cd frontend
npm run qa:production-health
npm run qa:production-search-ui
npm run qa:production-product
```

Docs-only changes should at minimum pass:

```bash
git diff --check
cd frontend
npm run test:docs
```

## Project Structure

```text
backend/
  server.py              FastAPI routes, PubChem client, admin APIs
  api_models.py          Pydantic API payload/response models
  api_validation.py      Bounded payload constants and validation helpers
  export_helpers.py      CSV/XLSX export safety and pilot summary helpers
  chemical_dict.py       Local CAS/name dictionaries and aliases
  test_name_search.py    Backend regression tests

frontend/
  src/components/        React UI components
  src/hooks/             Local persistence, workflow, modal, and admin hooks
  src/utils/             Print, export, SDS, governance, and workflow helpers
  src/i18n/              English and Traditional Chinese locales
  scripts/               QA and production verification scripts

.github/workflows/      CI and production QA workflows
zeabur.yaml             Zeabur deployment configuration
zbpack.ghs-frontend.json
                        Zeabur service-specific frontend monorepo build config
```

## Maintainer Entry Points

Use these files before starting product or safety-critical changes:

- [AGENTS.md](./AGENTS.md) - coding-agent bootstrap context, architecture, and
  current runtime state.
- [PROJECT_STATUS_AND_NEXT_PLAN.md](./PROJECT_STATUS_AND_NEXT_PLAN.md) -
  canonical current status, priority order, and done criteria.
- [PILOT_OPERATIONS_READY_PLAN.md](./PILOT_OPERATIONS_READY_PLAN.md) - shipped
  post-95 product target for small pilot operations, triage, export utility,
  and QA cadence.
- [PILOT_RUNBOOK.md](./PILOT_RUNBOOK.md) - pilot operator checklist and
  finding-classification guide.
- [PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md](./PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md) -
  shipped short-term evidence pass for representative pilot evidence, export
  usability, data-quality next steps, maintainability boundaries, and
  historical-doc cleanup.
- [BATCH_FIRST_LAB_PILOT_V1_PLAN.md](./BATCH_FIRST_LAB_PILOT_V1_PLAN.md) -
  shipped/monitoring Batch-First owner doc for batch review flow, batch label
  confidence, batch export, correction/admin triage, and bounded
  maintainability evidence.
- [NEXT_PRODUCT_WORK.md](./NEXT_PRODUCT_WORK.md) - short evidence-triggered
  live queue for choosing the next slice.
- [PRODUCT_SCOPE_GATE.md](./PRODUCT_SCOPE_GATE.md) - project-level "grill me"
  workflow for aligning broad or ambiguous product decisions before
  implementation.
- [FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md](./FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md) -
  future non-physical-print tracker while real-printer validation is deferred.
- [SCIENTIFIC_AGENT_SKILLS_EVALUATION.md](./SCIENTIFIC_AGENT_SKILLS_EVALUATION.md) -
  optional scientific lookup skill whitelist and install-risk review.
- [AUTONOMOUS_WORKFLOW.md](./AUTONOMOUS_WORKFLOW.md) - continuation, verification,
  push, and stop rules.
- [PRINT_LABEL_CONTRACT.md](./PRINT_LABEL_CONTRACT.md) - print safety contract.
- [BATCH_LABEL_PRINT_REFACTOR_PLAN.md](./BATCH_LABEL_PRINT_REFACTOR_PLAN.md) -
  fixed-stock, purpose-first batch label printing plan.
- [PRINT_OUTPUT_REFACTOR_PLAN.md](./PRINT_OUTPUT_REFACTOR_PLAN.md) - current print
  workflow baseline.
- [PHYSICAL_PRINT_VALIDATION_CHECKLIST.md](./PHYSICAL_PRINT_VALIDATION_CHECKLIST.md) -
  deferred real-printer validation checklist.

## Reporting Corrections

Report data corrections separately from workflow or feature requests:

- Data corrections:
  [data-correction issue template](https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction)
- Workflow requests:
  [workflow-request issue template](https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=workflow-request.yml&labels=workflow-request)

Useful correction evidence includes:

- CAS number and chemical name.
- Supplier SDS URL or official source.
- Current app output.
- Expected hazard statement, pictogram, signal word, or reference link.
- Local regulatory context, if relevant.

Manual dictionary and reference-link changes should remain reviewable,
admin-gated, and traceable.

## License And Use

No license file is currently included. Treat the code and data as private unless
the project owner publishes an explicit license.

This tool is provided as a reference aid. It does not replace SDS review,
supplier labels, professional judgment, or local regulatory requirements.
