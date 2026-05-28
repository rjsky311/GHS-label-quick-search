# GHS Label Quick Search - Agent Bootstrap

Use this file as the fast project orientation for Codex sessions. The
canonical planning entry point is `PROJECT_STATUS_AND_NEXT_PLAN.md`; read it
before choosing the next autonomous product slice.

## Project Overview

- Purpose: free public GHS lookup and label-printing utility for lab,
  operations, teaching, and safety-adjacent users.
- Core user job: batch lookup first, then batch print, export, and
  data-correction/admin triage.
- Stack: React 19 + Tailwind CSS + Radix UI + Vite frontend; FastAPI +
  Python 3.11 backend.
- **Current Version**: v1.10.0. Do not version-bump unless explicitly asked.
- GitHub: `rjsky311/GHS-label-quick-search` (private).
- Deployment: Zeabur auto-deploys from `main`.
- Frontend: https://ghs-frontend.zeabur.app
- Backend: https://ghs-backend.zeabur.app

## Current Product Rules

- Current public print model has exactly three outputs:
  - Complete A4/Letter label.
  - QR small label.
  - Identification small label.
- Complete labels carry full H/P content and QR lookup links.
- Small labels carry identity and GHS pictograms only; do not add H/P text to
  small labels without a new product decision.
- Printed hazard labels must never silently omit available GHS pictograms.
- QR or supplemental labels must not replace required visual hazard
  communication.
- Keep safety-critical label content free of ads or promotional copy.
- The app is a reference tool; it must keep SDS, supplier labels, and local
  regulation authority boundaries visible.

## Planning And Scope Selection

- Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first.
- `NEXT_PRODUCT_WORK.md` is only the short live queue.
- `NEXT_REMAINING_PRODUCT_WORK.md` is detailed backlog context, not the
  priority selector.
- `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` is shipped/monitoring, not an open
  implementation target.
- `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` is the current print-product contract.
- `PRODUCT_REQUIREMENTS_DECISIONS.md` pins current product decisions.
- `PRODUCT_SCOPE_GATE.md` defines the project-level "grill me" scope gate for
  broad or ambiguous product changes.
- Open a new slice only from concrete evidence: user screenshot/PDF/Excel,
  production QA failure, CI/deployment failure, admin queue evidence, export
  handoff confusion, or a code-review finding.
- Every opened slice must state source, affected user job, expected proof, and
  stop condition before implementation.
- Do not continue Batch-First, print polish, admin tooling, or refactoring by
  inertia after the shipped monitoring baseline.
- Explicitly: do not continue by backlog inertia.

## Zeabur Infrastructure

- Project ID: `696262d991818d5fd97058b3`
- Environment ID: `696262d9a7aaff0c1152b3d6`
- Frontend service ID: `69626873d9479ab33ad4590e`
- Live service names are `ghs-frontend` and `ghs-backend`.
- `zeabur.yaml` service names should stay aligned with those live names.
- `zbpack.ghs-frontend.json` pins the monorepo frontend app directory
  (`frontend`), build command, and static output (`build`).
- The live frontend service also mirrors non-sensitive build settings through
  `ZBPACK_APP_DIR`, `ZBPACK_BUILD_COMMAND`, `ZBPACK_OUTPUT_DIR`, and
  `VITE_BACKEND_URL`.

## Architecture

```text
User Browser
  -> React 19 + Tailwind + Radix UI + Vite
  -> axios calls to ${VITE_BACKEND_URL}/api
  -> FastAPI backend on Zeabur, port 8001
  -> PubChem REST API plus local dictionaries/admin curation
```

Frontend state currently lives mostly in `frontend/src/App.jsx`, with
persistence, selection, sorting, print, and modal workflows factored into
hooks and helpers. Prefer adding behavior as a hook, util, or focused
component instead of widening `App.jsx`.

Important frontend areas:

- `frontend/src/components/ResultsTable.jsx`: results, batch workflow summary,
  review reasons, export preview, and table actions.
- `frontend/src/components/LabelPrintModal.jsx`: print modal shell. Keep new
  print UI behavior in `frontend/src/components/label-print/` where possible.
- `frontend/src/utils/printLabels.js`: print HTML generation and handoff.
- `frontend/src/utils/printLabelStyles.js`: printable label CSS.
- `frontend/src/utils/printPreviewStyles.js`: preview-only CSS.
- `frontend/src/utils/printBatchPlanner.js`: fixed-stock batch planning.
- `frontend/src/utils/printContentModel.js`: print content contract.
- `frontend/src/utils/printFitEngine.js`: readiness/fit checks.
- `frontend/src/utils/printLayoutInspection.js`: rendered overflow inspection.
- `frontend/src/utils/exportData.js` and `frontend/src/utils/exportRows.js`:
  export preview/download contracts.
- `frontend/src/components/pilot/`: admin/pilot dashboard sections.

Important backend areas:

- `backend/server.py`: core FastAPI app and search orchestration.
- `backend/api_models.py`: Pydantic payload schemas.
- `backend/api_validation.py`: bounded validation, CAS normalization, safe URL
  checks, miss-query sanitization, candidate sanitization.
- `backend/pilot_admin_routes.py`: admin ops, dictionary curation, correction
  intake/review, miss-query retention, workspace route factory.
- `backend/export_helpers.py`: CSV/XLSX trust headers, formula-injection
  neutralization, trusted Chinese-name filtering, XLSX pilot summary.
- `backend/inventory_workbook_audit.py` and
  `backend/scripts/audit_inventory_workbook.py`: maintainer-only dry-run audit
  for real lab inventory workbooks. Use it to turn user-provided Excel files
  into parser/data-governance evidence, an `actionQueue`, and optional
  handoff CSV/README files without importing public dictionary data.
- `backend/chemical_dict.py`: local dictionary data.

## Key Commands

Run frontend commands from `frontend/`:

```powershell
npm test -- --runInBand
npm run test:i18n
npm run test:docs
npm run build
npm run qa:bundle-budget
npm run test:print-contract
npm run qa:print-pdf
npm run qa:production-health
npm run qa:zeabur-deployment
npm run qa:production-search-ui
npm run qa:production-batch-print
npm run qa:production-product
```

Run backend commands from `backend/`:

```powershell
python -m py_compile server.py api_models.py api_validation.py export_helpers.py
python -m pytest -q
python scripts\audit_inventory_workbook.py <path-to-xlsx>
python scripts\audit_inventory_workbook.py <path-to-xlsx> --handoff-dir <output-dir>
```

The inventory audit output is review-only. Use `summary`, `actionQueue`,
`examples`, and `--handoff-dir` CSVs to decide whether the next slice is
workbook cleanup, parser QA, seed-dictionary coverage, or admin/manual-entry
review; never treat workbook Chinese names as approved public data.

Docs-only baseline:

```powershell
git diff --check
```

When verifying production freshness, set the expected SHA:

```powershell
$env:PRODUCTION_HEALTH_EXPECTED_GIT_SHA=(git rev-parse HEAD)
npm run qa:production-health
```

## Critical Safety Lessons

- PubChem transient failures must surface as upstream retry states, not as
  empty hazard data.
- GHS dedup must include pictograms, signal word, H-codes, and source; do not
  dedup by pictograms alone.
- Print HTML must escape all interpolated text and attributes.
- CSV/XLSX exports must neutralize formula injection for every cell.
- Reference links and QR targets must be explicit safe `http` or `https`
  URLs.
- Admin/manual data must stay reviewed, bounded, and auditable before it can
  affect public lookup, labels, exports, or QR targets.
- Missing trusted Chinese names should be treated as curation issues; do not
  display English as fake Chinese.
- Public correction intake is for data-quality issues, not a general support
  inbox.
- `useFocusTrap` should avoid rebuilding traps on every parent render; keep
  close handlers in refs where needed.

## Deployment And QA Lessons

- Do not reintroduce yarn, CRA, CRACO, or `REACT_APP_*`.
- Keep i18next 23.x, react-i18next 14.x, and language detector 7.x unless a
  dependency-refresh task explicitly changes them.
- If Zeabur production is stale, run `qa:zeabur-deployment` before heavier
  product QA.
- If a Zeabur deployment is stuck before build start with no build log, treat
  it as a platform/integration bucket after one redeploy attempt, not a
  frontend build regression.
- If GitHub Actions fails during checkout with an access/account 403, treat CI
  as externally blocked until repository or account access is restored.

## Current Completion Posture

- 95% Lab-Ready Pilot: shipped.
- Pilot Operations Ready: shipped.
- Pilot Evidence And Maintainability Pass: shipped.
- Batch-First Lab Pilot v1: shipped/monitoring.
- Real physical printing remains deferred until actual paper, label stock,
  printer scaling, thermal quality, QR scanning, and pictogram readability can
  be tested.
- Code splitting, docs consolidation, CI/production QA, and maintainability are
  in maintenance mode. Reopen them only when evidence shows a real blocker or
  the next product change touches that boundary.

## How To Continue

1. Read `PROJECT_STATUS_AND_NEXT_PLAN.md`.
2. Check `git status --short --branch`.
3. Verify current CI/deployment state if the work depends on production.
4. Select the next slice from evidence, not from broad backlog wording.
5. Define proof before editing: test command, QA gate, production clickthrough,
   generated artifact, or owner-doc checkpoint.
6. Keep edits scoped to the user job: batch review, batch label print, export
   handoff, correction/admin triage, lookup trust, or production reliability.
7. Update docs only when behavior, acceptance criteria, QA gates, or workflow
   assumptions actually change.
