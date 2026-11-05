# GHS Label Quick Search

Free GHS chemical lookup and label-printing utility for lab, operations, and
safety-adjacent workflows.

The app helps users search by CAS number or chemical name, review available
GHS hazard information, verify SDS/reference links, export results, and prepare
printable label outputs. It is designed as a fast reference and workflow tool,
not as a legal compliance authority.

## Production

- Frontend: https://ghs.yuchelab.com
- Backend health: https://ghs-api.yuchelab.com/api/health
- Current runtime version: `1.10.0`
- Deployment: Cloudflare Pages frontend and Railway backend, accepted only
  when both report the expected runtime commit

## How It Is Built

GHS Label Quick Search is built and maintained by one chemist, Yu-Che Lin
(PhD, organic electronic materials), working with AI coding agents. The owner
sets product and safety rules; agents implement them under written specs, and
a second agent reviews and verifies each release.

- Started January 2026; first prototyped on an AI app builder, then moved to a
  self-owned React + FastAPI stack.
- About 500 backend tests and 1,550 frontend test cases, plus docs,
  i18n-parity, bundle-budget, and print-contract checks in CI.
- A release is accepted only when the frontend build and the backend health
  endpoint report the same full commit, the latest on `main` that changes the
  runtime, and the production QA scripts (health, search UI, PDF canary) pass.
  If only the upstream data source is down, QA reports that separately.
- Safety rules are written as contracts first and then enforced by tests; for
  example, printing is blocked when a required GHS pictogram fails to load
  (see [PRINT_LABEL_CONTRACT.md](./PRINT_LABEL_CONTRACT.md)).

The longer write-up is in [docs/CASE_STUDY.md](./docs/CASE_STUDY.md).

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
- PubChem GHS lookup (mostly aggregated ECHA C&L notifications). The main
  classification is the report that has pictograms and the most company
  reports; other reports are shown when they disagree. A local dictionary maps
  common and Chinese names to CAS numbers and never supplies hazard data.
- Multiple GHS classification comparison where upstream data differs.
- SDS/reference links with role-aware ordering.
- Excel and CSV export.
- Bilingual English/Traditional Chinese UI.
- Purpose-first label print flow with three public outputs: A4/Letter complete
  labels, QR small labels, and identification small labels, with live preview,
  recent prints, lab profile, and prepared-solution support. Prepared-solution
  labels combine the parent's hazards with a non-water solvent's, never reduced
  for dilution, and every label says so if the solvent's hazards could not be
  retrieved.
- Admin-gated pilot tools for dictionary/manual-reference maintenance and
  optional workspace sync.

## Data Sources

The app combines:

- PubChem REST API data, including GHS classifications (mostly aggregated
  ECHA C&L notifications). The main classification is chosen by: has
  pictograms, then most company reports, then ECHA source, then more hazard
  statements, then PubChem's order.
- A local chemical dictionary with CAS/name mappings (names only, no hazard
  data), plus short substance scope notes where a common name and the GHS data
  cover different forms (for example 7647-01-0 is hydrogen chloride, including
  the gas).
- Optional admin-curated aliases, manual entries, and reference links.

Source ranking, authority boundaries, SDS/reference behavior, QR target rules,
and telemetry limits are documented in
[DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md](./DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md).

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend environment defaults are in [backend/.env.example](./backend/.env.example).
For local browser testing, create `backend/.env` from that example and keep
both frontend origins allowed:

```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Single-worker local/dev deployments use in-memory rate limiting. Before
scaling the backend to multiple workers or instances, configure shared
rate-limit storage with `RATE_LIMIT_STORAGE_URI`, `LIMITS_STORAGE_URI`, or
`REDIS_URL` so public endpoint limits remain consistent across instances.

### Frontend

```bash
cd frontend
npx npm@11.6.2 ci
npm run dev
```

Use Node 22. The lockfile matches the npm version pinned in
`frontend/package.json`, so install with that version as shown.

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
README.md                           user entry point
AGENTS.md, CLAUDE.md                coding-agent bootstrap (CLAUDE.md points to AGENTS.md)
PRINT_LABEL_CONTRACT.md             what a printed label must and must not contain
DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md
                                    source roles, authority, and curation boundaries
SECURITY.md, LICENSE                private vulnerability reporting; MIT license
Dockerfile.ghs-backend              Railway backend image (Chromium and CJK fonts for PDF)

backend/                            FastAPI service, Python 3.11
  server.py                         app, PubChem client, search, export, and print-PDF routes
  chemical_dict.py                  local CAS and Chinese/English name dictionaries
  pilot_store.py                    SQLite store: manual entries, aliases, reference links,
                                    correction requests, miss-query retention
  pilot_admin_routes.py             admin-gated dictionary curation and correction review
  api_models.py                     Pydantic request and response models
  api_validation.py                 bounded payloads, CAS normalization, safe-URL checks
  export_helpers.py                 CSV/XLSX export with formula-injection neutralization
  pdf_render.py                     server-side label PDF rendering (Playwright Chromium)
  agent_label_summary.py            read-only agent_label_summary.v0 response contract
  observability.py                  bounded, structured log events and telemetry
  resource_limits.py                request-body size limits for public JSON endpoints
  candidate_discovery.py            review-only Chinese-name candidate discovery
  inventory_workbook_audit.py       dry-run audit of lab inventory workbooks
  inventory_handoff_import.py       audit handoff packet into the admin queue (dry run default)
  seed_dictionary_identity_audit.py PubChem identity audit of the seed dictionary
  seed_dictionary_identity_exemptions.py
                                    reviewed exemptions for that audit
  h_code_coverage_audit.py,
  p_code_coverage_audit.py          H- and P-statement wording coverage audits
  p_code_translations.py            Traditional Chinese P-statement wording
  substance_scope_notes.py          what a CAS entry's GHS data covers, printed on complete labels
  scripts/                          maintainer command-line wrappers for the audits above
  test_*.py                         pytest suite

frontend/                           React 19 + Vite single-page app, Node 22
  src/                              components/, hooks/, utils/ (print, export, SDS helpers),
                                    i18n/ (English and Traditional Chinese), tests
  public/                           static assets, llms.txt, Cloudflare Pages _headers
  scripts/                          i18n, docs-drift, bundle-budget, and production QA scripts
  plugins/, package.json, ...       build and tooling configuration

docs/
  CASE_STUDY.md                     how the project was specified, built, and verified
  maintainers/                      planning, status, QA, and design notes (see below)
  superpowers/                      per-slice design specs and implementation plans
  evidence/                         dated hardening and migration evidence
  design-mockups/, assets/          UI design exploration and preview images

qa/
  evidence/                         recorded QA reports, screenshots, and generated PDFs
  fixtures/                         sanitized, synthetic QA input files

.github/
  workflows/                        CI and scheduled production QA
  scripts/                          change classification and expected-SHA resolution
  ISSUE_TEMPLATE/, CODEOWNERS       data-correction and workflow-request forms; code owner
```

## Maintainer Documents

Planning, status, QA, and design notes live in
[docs/maintainers/](./docs/maintainers/README.md); the canonical entry point is
[PROJECT_STATUS_AND_NEXT_PLAN.md](./docs/maintainers/PROJECT_STATUS_AND_NEXT_PLAN.md).
Coding agents start at [AGENTS.md](./AGENTS.md).

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

The code is released under the [MIT License](./LICENSE). Hazard data comes
from PubChem and the sources listed in
[DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md](./DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md);
check each source's own terms before reusing the data.

This tool is provided as a reference aid. It does not replace SDS review,
supplier labels, professional judgment, or local regulatory requirements.
