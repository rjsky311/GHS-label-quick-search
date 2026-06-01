# Project Status And Next Plan

This is the canonical planning entry point for the project. Read this file
first when choosing the next autonomous product slice. Use the linked planning
and QA files only after this file has set the priority.

The priority order below is a default decision system, not a permanent
autopilot. Use `AUTONOMOUS_WORKFLOW.md` to re-rank after several completed
slices, after 10-20 commits cluster around one workstream, or when user
feedback shows that another product bottleneck has become more important.

Active print simplification baseline: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` is the
canonical product model for label-printing work. It replaces the prior
first-level print UI model with exactly three outputs: complete A4/Letter
label, QR small label, and identification small label.

Scientific lookup skill evaluation: `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`
records the reviewed `K-Dense-AI/scientific-agent-skills` repository and the
current decision to avoid full installation. Reopen that file only for future
data-governance, dictionary-cleanup, SDS/reference, or literature-checking
work.

Product scope gate: `PRODUCT_SCOPE_GATE.md` defines the project-level
"grill me" workflow for large or ambiguous product decisions. Use it before
changing product direction, label-printing models, data trust boundaries,
workflow simplification, or multi-surface UX behavior when the acceptance
standard is not already clear.

Proactive insight habit: `AUTONOMOUS_WORKFLOW.md` requires each meaningful
work slice to surface newly noticed blind spots, repeated-fix patterns,
workstream imbalance, or QA/user-purpose mismatches, then record actionable
insights in docs, tests, QA checks, or the backlog.

Current product requirements decisions: `PRODUCT_REQUIREMENTS_DECISIONS.md`
pins the 2026-05-22 requirements alignment for target users, priority order,
three-output labels, Chinese-name candidate handling, in-app correction intake,
batch workflow acceptance, and completion standard. Read it before converting
the current data-governance or correction-intake direction into code.

Post-95 target selection: `POST_95_REPRIORITIZATION.md` records the current
re-rank after the 95% Lab-Ready Pilot target shipped. Use it after this file
when choosing the next major product slice. The latest post-95 owner doc is
`PILOT_OPERATIONS_READY_PLAN.md`; it is now the shipped Pilot Operations Ready
baseline, with the operator-facing checklist in `PILOT_RUNBOOK.md`.
`LAB_READY_PILOT_95_PLAN.md` is the shipped 95% evidence packet, not an active
unfinished target.

Current major productization baseline: `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` is
now the shipped/monitoring owner doc for the latest batch-first round, not an
open implementation target. Use it after the shipped pilot evidence docs as
the evidence baseline for new monitoring-driven slices in batch review flow,
batch label confidence, batch export usefulness, correction/admin triage, or
bounded maintainability work that directly supports those workflows.

Shipped short-term evidence: `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`
records the representative pilot-evidence audit, export conclusion,
data-quality next-step recommendation, maintainability audit, and historical
doc cleanup. Treat it as evidence for the current target, not as the active
unfinished slice.

## 1. Product Positioning

GHS Label Quick Search is a free public GHS lookup and label-printing utility.
Its first job is to help lab, operations, and safety-adjacent users search a
chemical, understand the hazard source, preview the correct label output, and
print without becoming layout experts.

The product may support brand visibility, support requests, education, and
future indirect monetization, but those surfaces must stay outside
safety-critical label content. Printed GHS labels are not ad inventory.

Core product promises:

- Search should quickly return useful chemical identity, GHS classification,
  SDS/reference paths, and export/print actions.
- Batch lookup is the highest-value daily workflow: users should be able to
  paste a chemical list and understand valid, duplicate, invalid, unresolved,
  printable, continuation, and exportable items without learning the internal
  data model.
- Preview should show the actual output role: Complete A4/Letter label,
  QR small label, Identification small label, same-output continuation, or
  blocked output with a concrete recovery path.
- Print output must preserve available GHS pictograms on hazard labels. QR,
  brand surfaces, or supplemental labels must not replace required visual
  hazard communication.
- Label printing should converge on the simplified three-output model in
  `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` instead of exposing internal template,
  purpose, density, H-code, and stock-planning concepts to ordinary users.
- The app must remain honest about its authority boundary: it is a reference
  tool, and users should verify against SDS, supplier labels, and local rules.

## 2. Current Baseline

Runtime/code version is `1.10.0`. Do not version-bump without an explicit
request.

Production:

- Frontend: https://ghs-frontend.zeabur.app
- Backend: https://ghs-backend.zeabur.app
- Zeabur auto-deploys on push to `main`.
- Zeabur's live service names are `ghs-frontend` and `ghs-backend`. The
  `zeabur.yaml` service names now match those live names. The frontend service
  also has a root-level `zbpack.ghs-frontend.json` so Zeabur can resolve the
  monorepo app directory (`frontend`), build command, and static output
  directory for the actual frontend service. The live frontend service also
  mirrors those settings through non-sensitive `ZBPACK_APP_DIR`,
  `ZBPACK_BUILD_COMMAND`, `ZBPACK_OUTPUT_DIR`, and `VITE_BACKEND_URL`
  variables because Zeabur service metadata can remain blank even when the
  deployment should consume buildpack configuration.

Current baseline capabilities:

- Vite/npm frontend build and FastAPI backend are aligned for Zeabur.
- The 95% Lab-Ready Pilot target has shipped. `LAB_READY_PILOT_95_PLAN.md` is
  the evidence packet for that milestone. The shipped post-95 target selection
  lives in `POST_95_REPRIORITIZATION.md`, and the shipped post-95 target owner
  doc is `PILOT_OPERATIONS_READY_PLAN.md`. The latest batch-first
  productization target is also shipped/monitoring in
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`; new work should be selected from fresh
  monitoring evidence instead of continuing that implementation by inertia.
- Product priority is now explicit: batch lookup -> batch print, batch export,
  data correction/governance, single lookup polish, then brand/support polish.
- Print workflow now exposes the simplified three-output model on the first
  screen: Complete A4/Letter label, QR small label, and Identification small
  label. Legacy stock/template complexity remains internal or advanced only.
- A4 and Letter are complete primary outputs with full H/P text and QR back to
  this product's lookup page. QR small labels use 62 x 40 mm; identification
  small labels use 70 x 24 mm.
- Batch search can now plan, preview, and print a fixed-stock batch with
  per-item fit categories, representative previews, acknowledged
  reduced/continuation scope, and deployed production QA evidence. Keep future
  changes aligned with `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
- Batch review, export preview, and admin triage now share the same
  data-quality terminology for missing trusted Chinese names, upstream retry
  states, no-GHS data, and source conflicts. Admin triage consumes the shared
  data-quality label helper directly, so users and maintainers do not see
  different names for the same action bucket.
- Batch export handoff now preserves both the number of review signals and the
  first recommended action in backend CSV/XLSX, frontend export preview, and
  local CSV fallback. Production search UI QA now asserts those columns and the
  preview explanation, so the handoff cannot silently drift back to
  reason-only exports.
- The simplified print UX baseline follows `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`:
  one batch output type at a time, no first-level purpose/card sprawl, and
  small-label continuation on the same output instead of recommending mixed A4
  recovery.
- `PRINT_LABEL_CONTRACT.md` defines the print safety contract.
- `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` defines the current batch-print product
  contract: purpose-first, one physical stock per batch, per-item fit report,
  representative preview, explicit reduced/continuation print scope,
  excluded-list handling, and deployed batch QA.
- `NEXT_REMAINING_PRODUCT_WORK.md` holds the detailed execution backlog for the
  current product work blocks.
- `AUTONOMOUS_WORKFLOW.md` defines when to continue, verify, push, deploy, and
  stop for user input.
- `PRODUCT_SCOPE_GATE.md` defines how to align broad or ambiguous work before
  implementation without relying on hidden memory or repeated chat context.

Current validation gates:

- Docs-only: `git diff --check`
- Docs drift: `npm run test:docs` from `frontend/`
- Frontend: `npm test -- --runInBand`, `npm run test:i18n`, `npm run build`
- Print contract: `npm run test:print-contract`
- Print PDF QA: `npm run qa:print-pdf`
- Production availability and freshness: `npm run qa:production-health`
  (frontend HTML, current Vite asset, `/build-info.json`, backend
  `/api/health`, bounded retries, Zeabur request IDs). When
  `PRODUCTION_HEALTH_EXPECTED_GIT_SHA`, `PRINT_QA_EXPECTED_GIT_SHA`, or
  `GITHUB_SHA` is present, this gate fails if the deployed build metadata does
  not match the expected commit.
- Production deploy freshness: `npm run qa:zeabur-deployment` checks whether
  Zeabur has a `RUNNING` frontend deployment for the expected git SHA and
  writes `build/zeabur-deployment-report.json`. Run it before heavier
  production QA when `qa:production-health` reports stale `/build-info.json`
  metadata or when Zeabur deployment status is uncertain. If production remains
  on an older Vite asset and Zeabur has no deployment for the latest `main`
  commit,
  use `npx zeabur service redeploy --id 69626873d9479ab33ad4590e --env-id
  696262d9a7aaff0c1152b3d6 --yes --json --interactive=false`, then wait for
  `npm run qa:zeabur-deployment` to report `ok: true` before heavier
  production QA.
  If the new deployment stays before build start (`startedAt` unset) or has no
  build log, do not treat that as a frontend build failure; classify it as a
  Zeabur/GitHub integration or platform-scheduling blocker and keep production
  verification blocked until `/build-info.json` proves the expected git SHA.
  If Zeabur creates a deployment before build start while the service metadata
  shows an empty root directory or missing build/output settings, confirm
  `zeabur.yaml` uses the live service names, the service-name-specific
  `zbpack.ghs-frontend.json` is present on `main`, and the frontend service
  exposes the matching `ZBPACK_*` build variables, then redeploy and re-run
  this gate.
  The Production Print QA workflow now runs this probe in its always-run
  evidence phase and the production summary consumes
  `build/zeabur-deployment-report.json` when present. Use the summary's
  deployment-freshness block and failure bucket before deciding whether a QA
  email needs product-code work, a Zeabur redeploy, or dashboard/integration
  inspection.
  If `/build-info.json` is unreadable but no expected SHA was supplied,
  `qa:production-health` stays an availability check but records a warning;
  do not use that weaker pass as proof that production is on the latest commit.
  If GitHub Actions fails during `actions/checkout` with a 403/account access
  message, treat CI as externally blocked and rerun only after repository or
  account access is restored.
- Production search UI: `npm run qa:production-search-ui` (desktop
  search/detail, source/trust surfaces, no-GHS data-state boundary,
  export-preview trust/review columns, row-level multiple-GHS confirmation
  action, detail-to-prepared modal keyboard/focus checks, batch messy-paste
  normalization including spreadsheet numeric CAS and leading-zero workbook
  artifacts, `?cas=` QR-return hydration, plus 390px narrow read-first result
  and detail-comparison checks; bounded first-search retry for transient
  deployed load/search delays)
- Production print handoff: `npm run qa:production-smoke`,
  `npm run qa:production-primary`, `npm run qa:production-compact`,
  `npm run qa:production-multi-chemical`, `npm run qa:production-print`
- Production fixed-stock batch print: `npm run qa:production-batch-print`
  (fixed-stock scope, print handoff, and multiple-GHS pre-handoff warning)
- Prepared production workflow: `npm run qa:production-prepared`
- Whole product closure: `npm run qa:production-product`
- Backend: `python -m py_compile server.py api_models.py api_validation.py export_helpers.py`
  and `python -m pytest -q`

Current completion snapshot:

- **Stable automated baseline**: CI, production availability QA, production
  product QA, production search UI QA, production print handoff, prepared
  production QA, print contract/PDF QA, reference-link safety checks, and
  modal keyboard containment are all represented by repeatable gates.
- **Evidence-driven monitoring checkpoint 2026-05-30**: this historical
  checkpoint recorded a clean product-code baseline on `main` at `bc56672`,
  green GitHub CI, Zeabur production serving
  `bc56672332a970e2f09ca5d9c66f2913be3a1d7f`, and expected-SHA
  `npm run qa:production-health` passing at that time. Do not treat that SHA
  as the current deployment; use the expected-SHA production health and
  Zeabur deployment gates to prove current freshness. The current operating
  mode remains monitoring/maintenance: open a new product slice only from
  concrete user, production, admin, export, or code-review evidence.
- **Post-95 re-rank checkpoint 2026-05-24**:
  `POST_95_REPRIORITIZATION.md` reviewed the last 20 commits and moved the
  next default target from broad lab-ready closure to a small pilot observation
  and operator loop. The main reason is that the controlled 95% gates are now
  green; the next product risk is whether real pilot usage creates actionable
  correction, data-quality, export, UX, or production-reliability work without
  manual chat-driven triage.
- **Pilot Operations Ready checkpoint 2026-05-24**:
  `PILOT_OPERATIONS_READY_PLAN.md` owned the post-95 product target, and
  `PILOT_RUNBOOK.md` defines the daily/weekly maintainer checklist for small
  real pilots. This target is shipped as the post-95 baseline. The next product
  slice should be selected from pilot evidence, admin/export usability gaps, or
  blockers, not from the old P0-P4 list by inertia.
- **Pilot Evidence And Maintainability checkpoint 2026-05-25**:
  `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` shipped. It recorded
  representative production/pilot evidence, data-quality next-step selection,
  batch export usability, low-risk maintainability boundaries, and
  historical-doc cleanup.
- **Batch-First Lab Pilot v1 checkpoint 2026-05-26**:
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` is now the shipped/monitoring owner doc.
  It converted the shipped evidence into a closeable productization target:
  batch-first review clarity, three-output batch label confidence, practical
  export handoff, correction/admin triage, and bounded maintainability.
  The closure audit moved this target from `Open` to `Shipped / Monitoring`;
  future work should come from new monitoring evidence, not from continuing
  Batch-First implementation by inertia.
- **Real inventory audit evidence checkpoint 2026-06-01**:
  the maintainer-only workbook audit was rerun on a large user-provided lab
  roster and converted into a non-authoritative QA evidence fixture. The audit
  found 3,000 valid CAS rows, 1,635 unique valid CAS numbers, 246 invalid CAS
  cells, 121 CAS cleanup signals, 52 seed-dictionary gaps, and 4 workbook
  Chinese-name candidates. Treat this as parser/data-governance evidence only:
  it proves batch cleanup and triage pressure, not approved public dictionary
  data.
- **Batch-first clarity slice checkpoint 2026-05-25**:
  batch review clarity, batch export scope, and admin triage next-action
  visibility shipped in `20b5745`. `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` records
  measurable success indicators and verification gates for that slice. Local
  tests/build/docs checks and deployed production health, bundle, search UI,
  lab-ready batch, and product QA gates passed after `20b5745`.
- **Maintainability extraction checkpoint 2026-05-25**:
  bounded low-risk slices are shipped. Admin triage, candidate evidence,
  curation status helpers, print-modal helper/config, print advanced controls,
  print output/readiness summaries, print continuation pagination, H/P
  statement prioritization, print stylesheet generation, print overflow
  inspection, print lifecycle/QA handoff helpers, required image preflight,
  label output selection, stock-size summary/picker rendering,
  output-plan detail rendering, label preview panel rendering,
  selected-label controls, preview diagnostics, batch fit/report UI,
  correction request review sections, backend export trust/summary code,
  backend API schemas, backend bounded payload validation, and backend
  pilot/admin routes now have separate modules while preserving existing
  API/test contracts. Historical line counts from this checkpoint are not the
  current source of truth; run a fresh line-count scan before opening any
  large-file refactor. Treat this checkpoint as a map of responsibility
  boundaries: print orchestration/styles/preview, label-print modal sections,
  batch fit/report UI, correction/admin review sections, backend export trust,
  backend API validation, and pilot/admin persistence.
  Remaining large-file work should be selected only when it directly supports
  the next batch, data-governance, print, or admin workflow change.
- **Documentation audit checkpoint 2026-05-25**:
  active docs were refreshed after the latest extraction slices. The simplified
  label model now treats `?cas=` QR return hydration as implemented baseline,
  the remaining maintainability candidates no longer list already-split
  pagination/stylesheet/print-lifecycle/output-plan/stock-size
  selector/selected-label-controls/preview-panel/preview-diagnostics work as
  unfinished, and future compact renderer checks are scoped to the three public
  outputs before reopening older internal stock families.
- **Repository hygiene and bundle checkpoint 2026-05-25**:
  the dirty worktree has been classified into reviewable scopes:
  maintainability extraction, backend/API boundary extraction, frontend
  print/admin component extraction, tests, and docs. The frontend app shell now
  lazy-loads non-first-screen surfaces such as result tables, sidebars, detail
  and comparison modals, export preview, prepared-solution modal, print modal,
  and admin dashboard. Export download logic is also isolated behind a dynamic
  import while CSV escaping and export preview rows stay in light shared utils.
  `npm run build` now emits no 500 kB chunk warning and the heavy
  print/admin/detail/export surfaces are separated from the first-screen app
  shell. Use the current `build/bundle-budget-report.json` output as the
  source of truth for exact chunk sizes; do not copy historical chunk numbers
  forward as acceptance criteria. Keep future code-splitting work
  evidence-based rather than splitting stable first-screen code by default.
- **Bundle-budget gate checkpoint 2026-05-27**:
  `npm run qa:bundle-budget` now records `build/bundle-budget-report.json`
  after `npm run build` and fails only on meaningful chunk-boundary regressions:
  the initial app chunk, lazy print modal, lazy print engine, and lazy pilot
  dashboard must stay within explicit raw/gzip budgets and remain separate
  chunks. Use this as the code-splitting guardrail instead of reopening
  maintainability work solely because the bundle "feels large". GitHub CI runs
  this gate after the frontend production build so the boundary is enforced on
  push and PRs, not just as a local suggestion.
- **State-check checkpoint 2026-05-28**:
  the repository is in monitoring/maintenance mode unless fresh evidence opens
  a product slice. `main` was clean and recent GitHub CI runs were green.
  Expected-SHA `npm run qa:production-health` passed against
  `dd732eb5215d9ea8399b4ddbf119cd373a7f7b02`, proving Zeabur served the
  current frontend build metadata and the backend health endpoint was healthy.
  `npm run qa:production-batch-print` passed against the deployed default
  51-CAS batch fixture, exercising fixed-stock batch modal handoff, export
  preview trust/review fields, multiple-GHS warning copy, and print handoff
  metadata. `npm run build` and `npm run qa:bundle-budget` passed; use the
  generated bundle-budget report for exact raw/gzip chunk values. Treat this
  as evidence that the current product baseline is deployable and split enough
  for now, not as permission to keep adding polish by inertia.
- **Full-product QA checkpoint 2026-05-28**:
  after the state check, `qa:zeabur-deployment` reported
  `statusCategory: fresh-running` for commit
  `22ff46837b91be7a81499ccfe3c5b96c6d111333`, and expected-SHA
  `qa:production-health` passed against the same commit. Then
  `npm run qa:production-product` passed. The generated product report listed
  all eight product blocks as green: deployment freshness, production
  availability, print renderer/stock fit, result-table pictograms,
  trust/source/SDS boundaries, prepared-solution reprint, fixed-stock batch
  printing, and whole-product UX/brand utility. The summary reported eight
  present reports, zero failed reports, zero incomplete product blocks, zero
  actionable failures, and no failure-triage buckets. This is the strongest
  current evidence that the deployed product baseline is healthy; future work
  should still start from new monitoring evidence rather than continuing by
  inertia.
- **Deployment follow-up 2026-05-28**:
  the docs/evidence checkpoint commit
  `c1ddf4e12a394dbd043dff50bfa13feaf9a61e4f` was also deployed by Zeabur.
  `qa:zeabur-deployment` reported `statusCategory: fresh-running`, and
  expected-SHA `qa:production-health` proved `/build-info.json` plus backend
  health were aligned with that commit. No product-code slice was opened from
  this follow-up because it only verified that the latest canonical status
  checkpoint is live.
- **Admin triage UX checkpoint 2026-05-28**:
  the pilot/admin triage panel now separates unique queue items from
  overlapping data-quality review signals, with an inline note explaining why
  one correction request can increase several signal buckets. This keeps the
  maintainer workflow focused on the primary action without hiding missing
  Chinese names, no-GHS reports, source conflicts, unresolved searches, or
  telemetry work.
- **Canonical-doc baseline**: this file, `NEXT_PRODUCT_WORK.md`,
  `NEXT_REMAINING_PRODUCT_WORK.md`, and `AUTONOMOUS_WORKFLOW.md` now agree on
  the evidence-triggered continuation rules and done criteria.
- **Scope-gate baseline**: `PRODUCT_SCOPE_GATE.md` is the decision process for
  large ambiguous product slices. It is not a global Codex memory or installed
  skill; it keeps the "grill me" pattern inside the repo where decisions are
  reviewable.
- **Intentionally deferred**: real-printer validation remains deferred until
  physical paper/stock/printer access is available. Automated Browser/PDF
  checks are strong preconditions, not proof of real printer behavior.
- **Monitoring-only recurring risks**: fixed-stock batch regression coverage,
  source-conflict governance, upstream outage states, QR real-world
  reliability, compact multilingual labels, long chemical names, case/custom
  identity fields, admin/telemetry limits, and low-noise UX should continue to
  receive new regression cases when evidence appears. Track these
  non-physical-print follow-ups in `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`;
  use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` for the batch-print contract.
- **Implemented product simplification baseline**: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`
  now defines the public print workflow model. It intentionally cuts the public
  label flow down to complete labels, QR small labels, and identification
  small labels.
- **Data-trust export baseline**: effective custom classification selections
  now carry source/report-count evidence through result/detail surfaces,
  print/export preparation, export preview, frontend CSV fallback, and backend
  CSV/XLSX exports. Export rows include data state, primary source, report
  count, cache state, reference-link count, and classification-selection
  context.
- **Batch-output confidence checkpoint 2026-05-24**: batch result review
  reasons now separate `multiple-classifications` from true `source-conflict`
  states. Review reason chips can filter the table directly, and
  multiple-GHS row chips open the existing classification choices instead of
  pretending this is a data-correction-only issue. Export preview, frontend CSV
  fallback, and backend CSV/XLSX exports now preserve printable status, review
  required, review reasons, source-conflict state, missing trusted Chinese name,
  and multiple-GHS confirmation status so downstream cleanup does not lose the
  trust context. The label-print modal now also surfaces a pre-handoff warning
  when selected items still have unconfirmed multiple-GHS versions, while
  preserving the non-blocking "use the system-suggested primary unless changed"
  workflow.
- **Batch-output contract checkpoint 2026-05-25**: the batch label modal now
  shows a fixed-stock output contract before handoff: selected item count,
  physical label count, physical page count, and selected stock/purpose. The
  print action repeats the same physical counts, and the deployed
  `qa:production-batch-print` gate now fails if those counts are missing or
  internally inconsistent.
- **Batch-export v1 checkpoint 2026-05-25**: backend CSV/XLSX exports now share
  one readable row contract for trust/review columns. XLSX exports include
  `GHS Results`, `Ready Rows`, `Needs Review`, `Unresolved`, and
  `Pilot Summary` sheets, while the frontend export preview explains that XLSX
  downloads are already separated for lab-manager triage. Export preview now
  also shows selected-scope ready, needs-review, and unresolved counts before
  download, so users can tell whether they are exporting a working handoff or a
  cleanup queue before opening the file. The export row contract now also
  carries `Review Signal Count` and `Primary Review Action`, and the XLSX
  `Pilot Summary` distinguishes unique needs-review rows from total review
  signals and rows with overlapping signals.
- **Batch handoff/export closure checkpoint 2026-05-25**: `5195b3a` shipped
  the fixed-stock batch handoff/export closure scope and `5d51401` fixed the
  production batch QA ordering so the handoff contract is asserted after the
  required lab/supplier profile is present. CI passed, Zeabur production
  refreshed, and production health, batch-print, and product QA gates passed.
- **Batch-First closure audit checkpoint 2026-05-26**: the final owner-doc
  audit closed the target as `Shipped / Monitoring`. The audit patched two
  evidence gaps: XLSX `Pilot Summary` now receives original batch total and
  visible-row context from the frontend export payload, and admin triage now
  exposes open corrections plus stale telemetry cleanup as first-level cards.
  The next Batch-First work should be a new evidence-driven monitoring slice,
  not another implementation pass unless user, QA, CI, or pilot evidence
  reopens a specific workflow.
- **Admin triage primary-action checkpoint 2026-05-27**: the pilot triage
  panel now turns the first recommended focus into an explicit primary admin
  action above the counter grid. Detailed correction, unresolved-search,
  candidate, manual-entry, and telemetry counters remain available, but the
  operator first sees the next data-quality action instead of deriving it from
  multiple cards. The primary action and each recommended focus row now carry
  stable target queues, human-readable target labels, and can jump directly to
  the related admin section, so this surface is an action launcher rather than
  another summary-only card.
- **Candidate discovery dry-run summary checkpoint 2026-05-27**: maintainer
  dry-run discovery reports now summarize candidate-found rows, no-candidate
  rows, skipped rows, and evidence-type counts before the item payloads. This
  improves admin/data-governance triage without changing the review-only
  boundary for generated or external suggestions.
- **Inventory-derived batch hardening checkpoint 2026-05-26**: a real roster
  sample reopened a narrow monitoring slice without changing the product's
  100-item batch model. The app now rehyphenates pure numeric CAS values copied
  from spreadsheets, accepts Chinese `CAS編號` inventory columns, trims harmless
  terminal punctuation from CAS cells, reports cleanup in UI/telemetry, keeps a
  small representative inventory data-quality fixture for review buckets, and
  classifies production print handoff source outages separately from true
  print/layout regressions. Spreadsheet formula/date errors such as `#VALUE!`
  and date-coerced cells remain invalid instead of being guessed. Batch review
  summaries now also show a compact action queue so every active review bucket
  exposes its next step through a single batch-level filter surface. The batch
  result ready-output count and export preview ready scope both match the
  backend XLSX `Ready Rows` sheet, so review and unresolved rows cannot be
  mixed into a "ready" output. Upstream outage rows are routed to needs-review
  retry work instead of unresolved identity cleanup.
  Multiple-GHS rows now get a dedicated batch-level confirmation callout when
  present, because the selected classification controls the downstream label
  and export handoff. Admin triage recommended-focus
  messages and next actions now resolve through frontend locale keys keyed by
  the stable backend focus id, so the dashboard can stay bilingual while
  backend message strings remain API fallbacks rather than final UI copy.
- **Inventory workbook audit checkpoint 2026-05-28**: the user-provided
  multi-sheet lab workbook is now represented by a maintainer-only dry-run
  audit path instead of a one-off manual inspection. Run
  `python backend/scripts/audit_inventory_workbook.py <xlsx>` to extract CAS
  columns, validate and re-hyphenate spreadsheet CAS values, canonicalize
  first-segment leading-zero CAS artifacts, report duplicates/invalid rows,
  compare CAS coverage against the seed dictionary, and emit review-only
  Chinese-name candidate evidence. The command now also emits an `actionQueue`
  that separates blocking workbook cleanup, review-only Chinese-name
  candidates, seed-dictionary gaps, missing-name evidence collection,
  parser/production-QA coverage, and duplicate-row cleanup. It does not change
  public lookup, labels, exports, or manual dictionary data. The first run on
  the supplied workbook found 3,246 CAS cells, 3,000 valid CAS rows, 1,635
  unique valid CAS numbers, 246 invalid CAS cells, 99 re-hyphenated CAS cells,
  22 leading-zero CAS artifacts, 121 total CAS cleanup signals, 52 rows outside
  the seed dictionary, and 4 workbook Chinese-name candidate rows after
  canonicalization. The CLI can now write a maintainer handoff packet with
  `--handoff-dir <output-dir>`: `audit.json`, `action-queue.csv`, per-category
  CSVs, and `README.md` so invalid CAS cleanup, candidate review,
  seed-dictionary triage, missing-name evidence, parser QA fixtures, and
  duplicate cleanup can be handled without manually interpreting raw JSON.
- **Detail comparison evidence checkpoint**: same-chemical Detail comparisons
  now show compact selection evidence for each available public
  classification: current selection, report count, source family, and
  pictogram/H/P coverage. This keeps alternate reports inspectable without
  making source conflicts look legally resolved.
- **A4/Letter complete-primary print fix checkpoint 2026-05-18**: deployed
  production now uses resolved full-page typography metrics for H/P text and
  tighter continuation thresholds for dense complete-label content.
  `test:print-contract`, `qa:print-pdf`, `qa:production-batch-print`, and
  `qa:production-primary` pass, including A4, Letter, formaldehyde
  continuation, and 50+ item batch handoff artifacts.
- **Batch input governance checkpoint**: pasted batch CAS input is normalized,
  deduplicated, checksum-checked, and summarized before request. The parser
  accepts common spreadsheet separators plus same-line space-separated CAS
  values with `CAS No.` / `CAS:` prefixes, while preserving spaces that belong
  inside a single CAS token. Real roster evidence added a stricter
  tabular-paste rule: if a spreadsheet paste has a `CAS`, `CAS No.`, `Cas`, or
  `CAS編號` header, only that column is parsed; if a multi-column paste has no
  CAS header, unrelated numeric cells such as dates, item numbers, and supplier
  IDs are not rehyphenated into CAS values unless they are explicitly
  CAS-prefixed or already hyphenated. Search history and frontend observability
  now follow the same normalized handoff, with bounded telemetry metadata
  instead of raw invalid paste payloads. `qa:production-search-ui` now exercises
  the deployed messy-paste path and fails if the ready summary, duplicate/invalid
  diagnostics, or enabled search handoff regress.
- **QR return-path checkpoint**: `qa:production-search-ui` now opens the
  deployed app with `?cas=<CAS>` and fails if the app does not hydrate the
  single-search input, stay on the single-search path, and render the matching
  result row. This keeps QR labels tied to an actual lookup workflow rather
  than only proving that a QR image can be generated.
- **Dictionary miss telemetry checkpoint**: unresolved-search miss reporting is
  double opt-in (`VITE_ENABLE_DICTIONARY_MISS_CAPTURE=true` in the frontend and
  `CAPTURE_DICTIONARY_MISSES=true` in the backend). Public builds remain
  no-capture by default, and optional pilot payloads are trimmed and
  allow-listed before posting.
- **Miss-query review checkpoint 2026-05-21**: pilot miss-query rows now have
  an admin review closure path. The dashboard can mark a miss as resolved with
  a CAS, needs-evidence, or ignored; duplicate capture preserves non-open
  review status instead of turning a handled item back into an open task. Admin
  reports also expose status-count totals so maintainers can tell whether the
  queue is being reduced or merely accumulating, while the top-miss review list
  stays focused on open and needs-evidence rows. Retention enforcement is now
  actionable: reports show purgeable stale rows, admin/CLI cleanup keeps raw
  miss telemetry inside the review window, and dictionary snapshot exports
  redact miss-query context unless a maintainer explicitly requests it. Admin
  summary/report payloads also redact miss-query context because dashboard
  triage only needs query, status, count, endpoint, and timing.
- **Chinese-name trust checkpoint 2026-05-20**: frontend display and print
  surfaces now use a shared trusted-Chinese-name resolver. English-only
  placeholders in `name_zh`/`name_zh_tw` are not shown as Chinese, and small
  labels omit the Chinese line rather than duplicating English. Export preview,
  backend export payloads, frontend CSV fallback, and backend CSV/XLSX export
  endpoints use the same CJK-only boundary for the `Chinese Name` column.
  Admin manual dictionary writes now also reject English-only `name_zh`, while
  still allowing the field to stay empty until a sourced Chinese name is known.
  The Detail modal now exposes a contextual data-correction link for missing
  trusted Chinese names, and the admin manual-entry UI blocks English-only
  Chinese-name submissions before the backend request.
- **Data-quality correction checkpoint 2026-05-21**: result rows and Detail
  now share an explicit data-quality issue model for upstream failures,
  confirmed no-GHS data gaps, text-only GHS records without pictograms,
  source-conflict review, and missing trusted Chinese names. User-facing
  correction links prefill CAS/name context and issue type, while upstream
  transient failures remain retry states rather than correction requests.
  Export preview and backend CSV/XLSX review-reason columns now reuse the same
  shared data-quality labels, keeping batch review, admin correction queues,
  structured correction/support issue titles, and downloaded handoff wording
  aligned.
  Results workflow summaries, row primary review actions, and frontend export
  preview review reasons now also share the same data-quality review-priority
  order.
  `qa:production-search-ui` now verifies the row and Detail correction links
  for missing Chinese names, no-GHS gaps, and source-conflict review.
- **Unresolved lookup intake checkpoint 2026-05-22**: not-found search rows
  now use the same data-quality issue model instead of ending at a dead error
  message. They expose an `unresolved-search` correction link with CAS/query
  context, current output, expected output, and dictionary-curation local
  context, while upstream transient failures remain retry-only states.
  `qa:production-search-ui` includes a mocked deployed not-found lookup so the
  correction path cannot disappear from production unnoticed.
- **Structured support intake checkpoint 2026-05-22**: contextual
  data-correction links now prefill repository issue-form fields for CAS,
  chemical name, issue type, current output, expected output, evidence type,
  and local context. Product-trust workflow links can prefill workflow area,
  user goal, current problem, desired behavior, and examples while the generic
  footer links remain low-pressure. This keeps safety-data corrections and
  workflow requests auditable without adding another in-app form.
  `qa:production-search-ui` now checks the structured workflow and
  missing-Chinese-name correction fields on the deployed frontend. The same
  production gate also checks structured no-GHS and source-conflict correction
  fields in both result-row and Detail paths, so all public data-quality
  correction links keep actionable issue-form context.
- **Issue-form schema checkpoint 2026-05-22**: structured correction and
  workflow links now normalize dropdown-backed query fields to values that
  exist in the GitHub issue templates. Internal issue keys such as
  `missing-chinese-name`, `source-conflict`, `no-ghs-data`, and
  `unresolved-search` remain in the generated issue body as `Issue key`, while
  `issue_type` and `workflow_area` use human template options so the actual
  GitHub form can prefill reliably. Data-correction evidence prompts are also
  split from the dropdown value: broad guidance such as SDS/supplier
  label/regulatory source stays in the body as `Evidence prompt`, while
  `evidence_type` uses a valid single option such as `Other`. A focused unit
  test now reads the repository issue templates and fails if generated
  support-link dropdown values or prefill field ids drift from those option and
  field-id lists. The deployed production search UI gate also reads the
  repository issue templates at run time, so production QA no longer depends on
  a stale hard-coded copy of the GitHub form dropdown options or prefill field
  ids.
- **Requirements decision checkpoint 2026-05-22**:
  `PRODUCT_REQUIREMENTS_DECISIONS.md` records the user-confirmed product
  direction: prioritize batch lookup/print/export, keep three public label
  outputs, use same-output continuation, treat generated/external Chinese names
  as candidates until admin review, and move future data-correction intake
  toward an in-app/backend-admin flow with GitHub issues as fallback.
- **Correction intake checkpoint 2026-05-22**: backend correction-request
  storage/API, admin dashboard review, the public in-app correction dialog, and
  admin-only candidate evidence bundles are now in place. Contextual
  result-row, Detail, and product-trust correction links open the in-app queue
  submission first while preserving GitHub issue URLs as fallback. Public
  submissions are bounded and rate-limited, admin review can list and status
  requests, candidate bundles remain `approved_for_public_use: false`, and
  stored candidate bundles can now seed pending manual-dictionary review
  entries. Public lookup, labels, and exports still change only after a
  maintainer approves the resulting curated record. When a candidate bundle is
  used to create a pending manual dictionary entry, the originating correction
  request is also written back with conversion metadata so the queue remains
  traceable without implying that public data changed. Admin summary metrics
  expose how many correction candidates have entered manual review, and the
  admin overview now lists those converted requests with their review-only
  candidate evidence so maintainers do not have to dig through the full queue.
  Converted candidates are separated from the ordinary open correction list to
  keep the admin overview focused on the next action. Candidate evidence
  payloads are now also sanitized at the backend boundary: unknown keys are
  dropped, unsafe evidence URL schemes and oversized fields are rejected, CAS is
  normalized, and stored payloads are forced to review-only flags so future
  external or LLM candidate discovery cannot bypass admin approval. Public
  submissions cannot set manual-review conversion metadata; only admin
  status-update flows can mark candidate evidence as converted into manual
  review. `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md` now defines the next safe
  implementation contract for future external/LLM/scientific-skill candidate
  discovery: dry-run first, evidence bundle only, no public-data side effects.
  Inventory handoff correction rows now also show a row-level next action and
  block approval until the review-only candidate evidence has been converted
  into a manual dictionary review entry and that manual entry is approved.
  Missing-Chinese-name candidates must contain real CJK Chinese text before the
  admin UI can create that manual-review entry; English placeholders or
  workbook-only text cannot silently become public curation work. The backend
  store enforces the same inventory-handoff approval boundary so scripts or
  direct admin API calls cannot bypass the dashboard guard.
  The first maintainer CLI implementation now exists in
  `backend/scripts/discover_candidates.py`: it reads approved manual entries
  and the local seed dictionary by default, can resolve exact local names to
  CAS for unresolved-search rows, can optionally query Wikidata by CAS when
  explicitly requested, and emits suggested admin candidate payloads without
  writing approved data or changing public lookup, labels, exports, or QR
  targets.
- The public correction dialog now gives issue-specific guidance before
  submission, so missing Chinese names, unresolved lookups, no-GHS states,
  pictogram gaps, source conflicts, and reference-link fixes ask for the right
  correction and evidence without becoming a general support form.
- **Manual dictionary review checkpoint 2026-05-21**: manual dictionary rows
  now carry review status, public surfaces consume approved rows only, and the
  admin dashboard can approve, mark needs-evidence, or reject pending manual
  entries directly from the review queue. Recent manual entries and aliases now
  use newest-first ordering with visible status badges, matching the reference
  link curation list and reducing the chance that stale approved rows look like
  current review work. Alias review also exposes
  approved/pending/needs-evidence/rejected counts in the admin summary, and
  pending or recent aliases can be approved, marked needs-evidence, or rejected
  directly while automated synonym capture remains unable to overwrite an
  already final manual alias decision. Recent manual entries can also be
  approved, marked needs-evidence, or rejected directly from the curation list
  without retyping the CAS/name payload.
- **Reference-link curation checkpoint 2026-05-21**: admin reference links now
  carry active/inactive status through backend validation, dashboard fetches,
  overview counts, and dictionary snapshots. Public lookup, Detail, QR target
  selection, labels, and exports keep active-only defaults so retired SDS or
  obsolete reference links remain auditable without becoming user-facing.
  Maintainers can also activate or deactivate recent reference links directly
  from a newest-first admin list.

## 3. Next Priority Order

Use this order unless a fresh production screenshot, failing CI/QA run, security
finding, or user-reported blocker clearly points elsewhere. The `Do next`
items below are guardrails for opening an evidence-backed slice, not an
always-open checklist. Do not reopen shipped/monitoring work unless current
evidence proves the baseline no longer lets users complete the intended job.

Before continuing the same workstream for another round, apply the next-step
decision loop from `AUTONOMOUS_WORKFLOW.md` when:

- The last 3-5 slices have landed without a product-level re-rank.
- The last 10-20 commits are mostly admin/tooling/docs/QA instead of
  user-visible product work, or mostly print-rendering fixes instead of the
  broader workflow.
- The current workstream still has follow-ups, but the main user job would get
  more value from a different surface.
- The user asks whether the recent order was correct.

When re-ranking, keep blockers first, then choose the next closeable slice by
user-visible value, safety/data-risk reduction, loop closure, testability, and
blast radius. Update `NEXT_PRODUCT_WORK.md` with the active slice, exit
condition, and likely switch point.

Before starting a broad slice, use `PRODUCT_SCOPE_GATE.md` when the goal,
non-goals, required content, or acceptance criteria are not already clear. Do
not use it to delay obvious bug fixes or CI/security blockers.

### 0. Simplified Label Output Model

Goal: keep the newly simplified print modal from drifting back into the old
complex model. The three user-facing outputs in
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` are now the baseline.

Do next:

- Keep the A4/Letter complete-label overflow fix covered: dense H/P or
  P-statement content must fit with calibrated full-page typography or paginate
  onto same-stock continuation pages before the workflow blocks print for
  `compliance-precautions-overflow`.
- Maintain regression coverage for A4/Letter complete labels, including the
  2-Aminobiphenyl A4 fixture, formaldehyde continuation, and 50-item batch A4
  print artifact.
- Confirm the deployed modal does not regress after each production deployment
  touching print layout, and that preview/page count clearly shows
  continuation pages when they are needed.
- Keep the first-level print UI limited to complete label, QR small label, and
  identification small label.
- Keep A4/Letter complete labels high-utilization first: one physical label per
  page, full H/P, QR on the first page, and same-stock continuation only when
  the rendered H/P load truly needs more pages.
- Keep small labels identity-first: CAS, English name, Chinese name, all GHS
  pictograms, and QR only for the first QR small label in a continuation set.
- Keep H/P text, signal words, H-code chips, teaser summaries, and dense
  purpose language out of small labels.
- For small-label overfit, continue on the same selected output type and stock
  by creating second/third small labels instead of recommending A4/Letter.
- Keep URL-query hydration for `?cas=...` covered so QR codes scan back to this
  product's lookup page.
- Keep batch paste/import normalization aligned with real lab workbooks:
  spreadsheet numeric CAS values and first-segment leading-zero CAS artifacts
  should become canonical CAS before search, review, print, and export.
  Production search UI QA must keep at least one deployed leading-zero case
  such as `0118-12-7` -> `118-12-7`, not only local parser unit tests.

Done means:

- The modal first screen exposes exactly the three outputs.
- Batch printing uses one selected output type and physical stock for the
  whole batch.
- PDF and production QA cover all three outputs, including long names,
  many-pictogram chemicals, and continuation labels.
- Complete A4/Letter dense H/P batches paginate on the same stock rather than
  showing `compliance-precautions-overflow` for content that can continue onto
  later pages.

### 1. CI And Production QA Operationalization

Goal: deployment confidence should not depend on memory or manual screenshots.

Do next:

- Keep `qa:production-product` as the default closure gate for user-facing
  product work.
- Keep split gates available for narrower rounds: search UI, primary print,
  compact print, prepared workflow, and full print matrix.
- Make production QA artifacts easy to review: JSON reports, screenshots,
  generated PDFs, print HTML, and summary reports.
- Keep stale-deploy checks and bundle markers strict enough that production QA
  cannot accidentally validate an old frontend asset.
- Keep a fast production availability gate before heavy browser QA so transient
  or persistent 502/health failures are captured with response status,
  latency, and Zeabur request IDs.

Current status:

- The `Production Print QA` GitHub Actions workflow exposes `product` mode as
  the manual default and scheduled fallback.
- The main `CI` workflow now supports manual dispatch in addition to normal
  `push` and `pull_request` triggers, so a pushed commit can still receive the
  full frontend/backend CI gate if GitHub creates deployment checks but no
  automatic Actions run.
- Workflow job summaries include product-block pass/fail status when product
  block evidence is present.
- Workflow job summaries and `build/production-print-qa-summary.json` also
  include failure triage buckets. Scheduled print failures are grouped as
  upstream/source, external image or QR asset, deployment freshness, QA-runner,
  product print/layout, or unknown, with a suggested next action for each
  bucket.
- `qa:production-health` checks the deployed frontend HTML, current Vite index
  asset, generated `/build-info.json`, and backend `/api/health` with bounded
  retries. It writes `build/production-health-report.json` with request IDs,
  timing, and deployed git SHA evidence so a 502 or stale-deploy incident can
  be diagnosed without replaying ad hoc curl commands.
  Set `PRINT_QA_EXPECTED_ASSET_TEXT` or
  `PRODUCTION_HEALTH_EXPECTED_ASSET_TEXT` to a short marker from the new UI
  when a production-facing change needs proof that Zeabur is serving the
  refreshed frontend bundle, not only a reachable older asset.
  Prefer `PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD)` or the
  GitHub workflow-provided `PRINT_QA_EXPECTED_GIT_SHA` for commit-level proof.
- `qa:zeabur-deployment` checks Zeabur's deployment list for the expected git
  SHA and fails when the expected deployment is missing, not `RUNNING`, stuck
  before build start (`startedAt` unset), or when the latest `RUNNING`
  deployment is still an older commit. It writes
  `build/zeabur-deployment-report.json` with deployment status, service
  metadata, build-log availability, local `zeabur.yaml`/`zbpack` config
  evidence, deployment age, a `statusCategory`, and recovery commands so stale
  production and platform scheduling failures can be reported without manually
  comparing CLI JSON. A `stuck-before-build` category means the expected commit
  reached Zeabur but never started building; retry the reported redeploy command
  once, then inspect the Zeabur service queue/GitHub integration rather than
  changing product code.
- Split modes remain available for focused reruns: `health`, `smoke`,
  `primary`, `compact`, `multi-chemical`, `prepared`, `batch`, `full`, and
  `all`.
- `qa:production-search-ui` keeps the full deployed evidence in
  `build/production-search-ui-report.json`, but prints a compact console
  summary so CI logs show the action, pictogram, trust, data-state, keyboard,
  mobile, and image-load checks without burying failures in raw DOM text.
- `qa:production-search-ui` writes screenshots for the deployed batch
  messy-paste path and `?cas=` QR-return hydration path, so regressions in
  those non-print lookup flows are reviewable without manually replaying the
  browser steps.
- `qa:production-search-ui` also covers the deployed missing-Chinese-name
  correction path with a mocked search result, so the Detail data-correction
  link cannot disappear without the production gate failing.
- Local `qa:production-product` runs should be given at least a 12 minute
  timeout; a healthy full product pass can take several minutes because it runs
  deployed Chrome flows, print handoff checks, prepared workflow checks,
  fixed-stock batch checks, and summary generation.
- Production print handoff QA now checks QR small-label scan-target metadata
  and visible QR target role copy, so the lookup/reference scan path is not
  only manually inspected.
- Production print handoff QA also includes a blocked A4 complete-primary
  recovery case with missing responsible profile, so blocked print states must
  show a concrete recovery route rather than only disabling the button.

Done means:

- A user-facing frontend change can be traced from code change to CI result,
  Zeabur deployment, production asset refresh, and production QA evidence.
- The final report can name which product block passed or failed.

### 2. Documentation Consolidation And Autonomous Continuation

Goal: future work should have one entry point and no competing roadmaps.

Do next:

- Keep this file as the canonical current planning file.
- Keep `PRODUCT_REQUIREMENTS_DECISIONS.md` as the current product-decision and
  completion-standard packet for batch-first utility work, correction intake,
  and Chinese-name candidate policy.
- Keep `NEXT_PRODUCT_WORK.md` as a short live queue only.
- Keep `NEXT_REMAINING_PRODUCT_WORK.md` as the detailed execution backlog.
- Keep historical documents such as `NEXT_PRINT_WORKSTREAMS.md`,
  `PRINT_OUTPUT_REFACTOR_PLAN.md`, and v1.8/v1.10 planning docs as baseline or
  historical context, not active priority selectors.
- Update docs whenever behavior, acceptance criteria, QA gates, or workflow
  assumptions change.
- Keep `npm run test:docs` covering the owner docs, including Batch-First
  shipped/monitoring evidence, data governance, simplified labels, print
  contract, physical print deferral, brand/support strategy, and
  scientific-skill evaluation.

Done means:

- A new session can read `AGENTS.md`, this file, and
  `AUTONOMOUS_WORKFLOW.md` and know exactly how to continue.
- No active doc contradicts the canonical queue or claims that completed
  baseline work is still the next product target.
- Owner docs keep a visible pointer back to this canonical plan before they
  define local product, safety, support, or QA rules.

Current status:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` is now the canonical planning entry point.
- `NEXT_PRODUCT_WORK.md` is the short live queue.
- `NEXT_REMAINING_PRODUCT_WORK.md` is the detailed execution backlog, not the
  priority selector.

### 3. Fixed-Stock Batch Label Printing

Goal: batch printing should solve the real workflow of choosing one physical
label stock and printing many chemicals, without forcing every item through
complete-primary/A4 logic.

Monitoring guardrails:

- Use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` as the implementation contract.
- Treat batch printing as purpose-first inside the current three-output model:
  Complete A4/Letter label, QR small label, or Identification small label.
- Keep one selected physical stock for the batch. Do not silently split a batch
  across A4, Letter, tube, rack, and QR stocks.
- Keep the batch fit report visible before print handoff, with each item
  classified as ready, ready-tight, reduced-purpose, same-stock-continuation,
  excluded-data, or excluded-fit.
- Keep representative previews available: first, worst-fit, longest name, most
  pictograms, densest text, and excluded list.
- Keep the true 50-item fixed-stock batch fixture and QA gate healthy. The
  existing `multi-chemical` production layer remains representative coverage,
  not proof of a real batch workflow.

Done means:

- A user can select one stock and one purpose, then understand exactly which
  items will print, which are reduced, which need same-stock continuation, and
  which are excluded before pressing print.
- QR small-label and Identification small-label batches remain printable when
  truthful, even when a complete A4/Letter label would not be the selected
  output.
- Complete batches never silently omit required content; they continue,
  exclude, or ask the user to choose a different purpose/stock.

Current status:

- Status is shipped/monitoring, with the owner contract in
  `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` and the latest Batch-First evidence in
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`.
- Planner-layer classification lives in `frontend/src/utils/printBatchPlanner.js`;
  the reusable mixed fixture and unit coverage live in
  `frontend/src/utils/testFixtures/batchPrintFixtures.js` and
  `frontend/src/utils/__tests__/printBatchPlanner.test.js`.
- `LabelPrintModal` surfaces the batch fit report for multi-item selections,
  supports representative preview switching, aligns the sheet preview to the
  current selected print scope, and exposes review/excluded items with CSV
  export before print handoff.
- Batch print actions and the batch output contract now name selected item
  count, physical label count, physical page count, selected purpose, and
  physical stock. Scope summaries still name excluded count and unselected
  review count, so the user can understand the handoff before pressing print.
- Batch print handoff now defaults to ready items but can explicitly include
  acknowledged `reduced-purpose` and `same-stock-continuation` items on the
  same physical stock. The renderer records per-label batch metadata and
  per-label layout overrides so mixed ready/reduced batches remain inspectable.
- `npm run qa:production-batch-print` exists as a deploy-time gate for the
  fixed-stock batch modal flow, including acknowledged scope exercise when a
  reduced/continuation path is available. It is folded into
  `qa:production-product` plus the `fixed-stock-batch-printing` product block
  in the production QA summary.
- Deployed batch evidence remains part of `qa:production-product`. The latest
  post-handoff checkpoint passed production product QA after `a97bd97`, and the
  docs checkpoint `cba6ae9` is live on Zeabur.
- `qa:print-report` now also writes a 50-item fixed-stock compact batch print
  artifact, and `qa:print-pdf` checks that artifact for stock metadata, batch
  categories, required pictograms, identity text, clipping, and visual overlap.
  Re-run the deployed batch/product gates after each production-facing batch
  change.

### 4. Physical Print Validation

Goal: browser/PDF QA should be complemented by real-world print evidence.

Do next:

- Keep the manual physical-print checklist current for A4, Letter, common
  bottle labels, tube/vial labels, rack labels, 62 mm continuous stock, QR
  supplement, and prepared-solution outputs.
- Check browser print scaling, printer margins, orientation, paper/label stock,
  thermal/label-printer legibility, QR scan success, and pictogram readability.
- Record when the expected outcome is a complete A4/Letter label versus a
  truthful QR small label or Identification small label.
- Convert repeated manual findings into automated geometry/PDF/production QA
  assertions where possible.

Done means:

- Each supported physical stock family has a clear print expectation and at
  least one representative physical or production-rendered acceptance path.
- Real-printer failures become checklist items, tests, or renderer rules rather
  than remaining only in chat.

Current status:

- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` defines the real-printer evidence
  workflow for paper/stock, printer scaling, QR scan success, and physical
  readability.
- `npm run qa:physical-print-plan` converts the current print QA matrix report
  into `frontend/build/physical-print-validation-plan.md` and `.json`, giving
  each physical stock family a generated work order with expected output role,
  pictograms, QR expectations, browser steps, and evidence fields.
- Real-printer validation is intentionally deferred until physical paper/stock
  and printer access are available.
- Automated Browser/PDF/production QA remains the precondition before physical
  print validation, not a replacement for it.

### 5. Data Governance And Safety Boundaries

Goal: users should trust the workflow without mistaking the app for the legal
authority.

Do next:

- Use `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md` as the future reference if a
  data-governance round needs external scientific lookup skills. Do not install
  the whole `scientific-agent-skills` repo; only consider the documented
  whitelist (`database-lookup`, `paper-lookup`, and later `datamol`) as
  maintainer-only evidence tools.
- Keep source conflict handling clear between PubChem, ECHA, manual entries,
  SDS links, and local dictionary aliases. Detail comparison now exposes the
  report-count/source/coverage evidence that explains why alternate public GHS
  reports differ.
- Keep unsafe URLs filtered on frontend and backend.
- Keep dictionary miss telemetry opt-in, bounded, and abuse-resistant.
- Keep Chinese display names honest: show only dictionary/manual values that
  contain real CJK text, and route missing names into curation rather than
  repeating English as fake Chinese. Missing-name correction links should carry
  CAS and English-name context, but accepted entries still require sourced
  evidence and admin review.
- Keep unresolved lookup rows connected to dictionary curation with structured
  correction links, while keeping transient upstream outages out of correction
  intake.
- Keep manual entries, aliases, and reference links admin-gated.
- Make "unavailable upstream data" impossible to confuse with "no hazards."
- Keep data-correction requests separate from workflow/business requests.

Done means:

- A user can tell where data came from and when to verify against SDS,
  supplier labels, or local regulations.
- Admin/manual data paths remain constrained, auditable, and safe to expose in
  labels, references, QR targets, and exports.

Current status:

- `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` defines source roles, hazard data
  states, reference-link policy, conflict handling, admin boundaries, telemetry
  boundaries, and required regression tests.
- QR target selection now prefers SDS, regulatory, and occupational links before
  generic references, even when a generic reference has a lower numeric
  priority.
- Duplicate reference URLs preserve the strongest role on backend and frontend
  before priority sorting, so a generic mirror cannot downgrade the same URL
  when it is also available as SDS or regulatory evidence.
- Detail/reference lists now share the QR target's role-first source order
  (`SDS`, `Regulatory`, `Occupational`, then generic `Reference`) before
  numeric priority, so low-priority values cannot make a generic note look more
  authoritative than verification links.
- Backend reference-link payloads now use the same role-first source order, so
  the API, frontend display, and QR target selection share one authority model.
- QR small-label planning now uses the same source model for scan targets: the
  UI shows the target role/source before printing, and printed QR images carry
  target URL/type/source/label metadata for QA and troubleshooting.
- The deployed print handoff gate now fails QR small-label cases if that target
  metadata or visible role copy disappears.
- Admin curation writes are bounded on the backend: manual dictionary entries,
  aliases, and reference links trim text, cap long fields, reject unsupported
  locale/status values, and constrain numeric priority/confidence before data
  reaches SQLite. Optional workspace document writes also reject oversized JSON
  payloads.
- Manual dictionary entries now have explicit review states (`approved`,
  `pending`, `needs_evidence`, `rejected`). Public lookup/name resolution,
  labels, and exports only consume approved entries; pending and
  needs-evidence rows remain available to admin review and dictionary snapshot
  export without changing user-facing chemistry identity.
- Optional miss-query telemetry remains opt-in and now stores only allow-listed
  non-freeform context metadata, so public capture cannot persist arbitrary
  email/free-text/nested payloads.
- Detail views now match the result table's data-state contract: GHS text
  without renderable pictograms is called out explicitly, and alternate
  classifications remain inspectable even if the primary report has no icons.
- Label-print entry points now preserve that same data-state boundary: found
  chemicals with no GHS hazard content stay out of label selection and print
  handoff, while text-only GHS records can still be selected because they carry
  hazard content.

### 6. User Guidance, Brand Utility, And Low-Noise UX

Goal: the tool should feel useful, calm, and trustworthy enough for repeated
daily use.

Do next:

- Keep the first-screen workflow task-first: search, inspect, print/export, and
  verify.
- Keep advanced controls behind secondary surfaces unless they directly affect
  the immediate decision.
- Use brand/support surfaces only after the safety task has been served:
  footer, support band, help/education, optional exports, and correction
  requests.
- Keep data-correction and workflow-request issue links compatible with the
  GitHub issue-form dropdown and field-id schema; do not use internal issue
  keys as dropdown field values or stale query parameters.
- Improve first-time orientation without adding marketing-style noise or
  instructions that compete with the main task.
- Review narrow-width and mobile read-only usage for search/SDS/reference
  workflows, even if mobile printing remains secondary.

Done means:

- A first-time user can complete the main search-to-print path without reading
  long instructions.
- The app can create visibility and trust for the broader brand without
  weakening hazard communication.

Current status:

- Search results now use the same result-row DOM as a narrow-screen card layout
  on phone-width viewports, keeping chemical identity, GHS pictograms, signal
  word, detail action, and SDS action inside the viewport instead of requiring
  horizontal table scrolling.
- Brand/support boundaries are now pinned in `BRANDED_UTILITY_STRATEGY.md`:
  conversion surfaces must stay outside GHS icons, signal words, H/P
  statements, SDS authority copy, blocked-output warnings, and printed label
  bodies.
- The detail modal's same-chemical classification comparison uses readable
  stacked cards on narrow viewports instead of a desktop-width comparison
  table, so alternate GHS reports can be inspected without horizontal dragging.
- The same comparison now exposes source/ranking evidence on both desktop and
  narrow layouts, so users can see report count, source family, and coverage
  before changing the active classification.
- `qa:production-search-ui` now captures 390px deployed screenshots for both
  search results and detail comparison, and fails when either area needs
  horizontal scrolling or when key actions/cards are outside the narrow
  viewport.
- Core custom dialogs now share focus-trap behavior. DetailModal keeps its
  keyboard trap active for normal review, but disables it while a
  prepared-solution modal is stacked above it so the visible top layer owns
  Tab/Escape.
- `qa:production-search-ui` now exercises that deployed keyboard path: Detail
  modal Tab/Shift+Tab wrapping, detail suppression while Prepare Solution is
  stacked, Prepare Solution Tab/Shift+Tab wrapping, and Escape closing only the
  top modal before returning to Detail.
- Print-output diagnostics now include a specific recovery route for blocked or
  upgraded complete-primary flows: the current stock, the recommended next
  action, and the full-page stock or missing profile requirement are visible
  before print handoff without adding more first-screen controls.

## 4. Known Blind Spots

Treat these as recurring review prompts before claiming a larger milestone is
complete.

- Physical printing: automated browser/PDF checks do not fully prove printer
  scaling, margin, media, thermal resolution, or label-stock behavior.
- Batch printing: the fixed-stock 50-item workflow is now gated, but new
  real-world batch lists can still expose fit, guidance, or exclusion cases.
  Keep one selected stock, classify each item, show representative previews,
  and expose excluded reasons before print.
- Browser and OS print dialogs: Chrome, Edge, Windows print scaling, PDF
  viewers, and printer drivers can change output after the app hands off.
- QR reliability: QR must stay large enough, scan quickly, and point to safe,
  persistent http(s) targets.
- Compact multilingual layout: long names, bilingual H/P text, case numbers,
  prepared metadata, and custom fields can create pressure in small labels.
- Data conflicts: PubChem, ECHA, SDS, supplier labels, and manual curation can
  disagree; the app needs clear precedence and verification language.
- External scientific-agent skills: broad research skills can be useful for
  maintainer lookup, but they can also introduce dependency sprawl, unsafe
  cross-skill behavior, and unreviewed source authority. Keep them out of the
  product runtime unless separately reviewed.
- Upstream availability: transient PubChem or network failures must remain
  visible and must not degrade into false no-hazard states.
- Admin and telemetry surfaces: storage growth, privacy, abuse limits, and
  admin-key CORS behavior need ongoing review.
- Mobile and narrow screens: mobile may be read/search/SDS-first rather than
  print-first, but the core path should not break visually.
- Accessibility: complex modals, focus traps, keyboard paths, and screen-reader
  labels should stay aligned as UI is simplified.
- Documentation drift: old roadmap documents can become misleading if they are
  not explicitly marked as baseline, backlog, or historical.
- Collaboration drift: long autonomous runs can become task execution without a
  fresh hypothesis about the highest-value next slice. Re-rank after clustered
  commits, repeated fixes, or QA/user-purpose mismatch.

## 5. Definition Of Done

Every autonomous work slice should close with evidence, not just code changes.

Minimum closure requirements:

- State the user-facing problem being solved.
- State the product block affected.
- Update docs when assumptions, user behavior, QA gates, or acceptance criteria
  change.
- Add or update the test/QA layer that would have caught the issue.
- Run targeted checks first, then broader checks based on blast radius.
- For production-facing UI changes, verify the deployed production path after
  Zeabur has refreshed the frontend asset.
- For print changes, preserve the print contract: no silent missing required
  images, no hidden GHS pictograms, no clipped output treated as printable, and
  no QR/supplemental label presented as a complete primary label.
- If a slice cannot be fully verified, record the exact blocker and do not
  claim it as complete.
- Include proactive observations in the final report: newly noticed risks,
  stale assumptions, repeated-fix patterns, or the absence of new untracked
  risk.

Docs-only closure:

- `git diff --check`
- `npm run test:docs` from `frontend/` when canonical docs, version strings,
  status labels, or planning links changed
- `rg "PROJECT_STATUS_AND_NEXT_PLAN" .`
- `rg "PRODUCT_SCOPE_GATE" .`
- `cd frontend && npm run build && npm run qa:bundle-budget`
- Confirm the changed docs do not contradict the canonical planning role of
  this file.

## 6. Supporting Documents

Use these files by role:

- `AGENTS.md`: project context, architecture, current runtime state, and
  session bootstrap guidance.
- `CLAUDE.md`: short compatibility entry point that delegates to `AGENTS.md`,
  this file, `AUTONOMOUS_WORKFLOW.md`, and the future tracker.
- `AUTONOMOUS_WORKFLOW.md`: standing approval, default work loop, stop
  conditions, and verification rules.
- `PRODUCT_SCOPE_GATE.md`: project-level scope alignment workflow for broad
  product decisions and repeated rework risks.
- Repository hygiene, code splitting, the Batch-First handoff/export closure
  scope, and the Batch-First closure-audit patch have reviewable scopes.
  Future work should start from a new evidence-driven slice rather than
  accumulating more cleanup in the shipped Batch-First scope.
- `POST_95_REPRIORITIZATION.md`: post-95 decision packet and shipped
  pilot-operations/evidence target history after the Lab-Ready Pilot shipped.
- `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`: shipped/monitoring owner doc for the
  Batch-First productization round: batch review flow, batch label confidence,
  batch export, correction/admin triage, and maintainability.
- `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`: shipped evidence packet for
  pilot evidence, export usability, data-quality next-step selection,
  maintainability boundaries, and historical-doc cleanup.
- `NEXT_PRODUCT_WORK.md`: short evidence-triggered live queue for the next
  slice, including source, affected user job, proof, and stop condition.
- `NEXT_REMAINING_PRODUCT_WORK.md`: detailed execution backlog and
  current status.
- `PRINT_LABEL_CONTRACT.md`: print safety contract.
- `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`: fixed-stock, purpose-first batch label
  printing contract and future 50-item QA plan.
- `PRINT_ACCEPTANCE_STANDARD.md`: print acceptance bar.
- `PRINT_BROWSER_QA_CHECKLIST.md`: browser QA checklist.
- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`: real paper, label stock, printer
  scaling, QR scan, and physical readability checklist.
- `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`: source roles, SDS/reference
  policy, admin/manual data boundaries, telemetry limits, and conflict handling.
- `backend/scripts/audit_inventory_workbook.py`: maintainer-only dry-run
  inventory workbook audit for real lab rosters; use it to find CAS cleanup,
  duplicate rows, seed-dictionary gaps, and review-only Chinese-name candidates
  before deciding whether a product, parser, or admin-curation slice is needed.
  Its `actionQueue` is the handoff surface for maintainers/Coding Agent: it
  states what blocks batch use, what needs evidence, what can become QA
  coverage, and what must remain review-only. Use `--handoff-dir` when the
  next step needs CSV/README files that a maintainer can open directly.
- `backend/scripts/import_inventory_handoff.py`: maintainer-only dry-run/apply
  bridge from an inventory audit handoff packet into the admin correction
  queue. Use it when the next step is to turn review-only workbook Chinese-name
  candidates or seed-dictionary gaps into admin-triage tasks. It creates no
  approved public dictionary data; even `--apply` writes correction requests
  only. The admin dashboard now treats these rows as a distinct
  `inventory-workbook-audit` handoff queue with its own triage count,
  next-action focus, source badges, expected/current-output context,
  issue-type breakdown, full-queue versus visible-row count, issue-type quick
  filters, priority ordering, and maintainer review-plan summary. The queue
  should use the full admin correction-request list when available instead of
  treating the limited ops-report sample as the whole backlog.
- `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`: future whitelist and risk review for
  optional scientific lookup skills such as `database-lookup`, `paper-lookup`,
  and `datamol`.
- `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`: future work tracker for data
  trust, UX guidance, public docs, and brand/support surfaces while real
  physical printing is deferred.
- `PRINT_OUTPUT_REFACTOR_PLAN.md`: v1.10 print refactor baseline; supporting
  history, not the active user-facing print model.
- `NEXT_PRINT_WORKSTREAMS.md`: completed print workstream baseline; supporting
  history, not the active live queue.
- `DESIGN.md`, `BRANDED_UTILITY_STRATEGY.md`, and `REDESIGN_ROADMAP.md`:
  productized utility design direction; supporting history for the
  shipped/monitoring Batch-First baseline and future evidence-driven slices.
