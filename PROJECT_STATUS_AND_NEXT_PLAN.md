# Project Status And Next Plan

This is the canonical planning entry point for the project. Read this file
first when choosing the next autonomous product slice. Use the linked planning
and QA files only after this file has set the priority.

Active print simplification baseline: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` is the
canonical product model for label-printing work. It replaces the prior
first-level print UI model with exactly three outputs: complete A4/Letter
label, QR small label, and identification small label.

Scientific lookup skill evaluation: `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`
records the reviewed `K-Dense-AI/scientific-agent-skills` repository and the
current decision to avoid full installation. Reopen that file only for future
data-governance, dictionary-cleanup, SDS/reference, or literature-checking
work.

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
- Preview should show the actual output role: complete primary label,
  supplemental label, quick-ID label, QR supplement, continuation output, or
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

Current baseline capabilities:

- Vite/npm frontend build and FastAPI backend are aligned for Zeabur.
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
- The simplified print UX baseline follows `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`:
  one batch output type at a time, no first-level purpose/card sprawl, and
  small-label continuation on the same output instead of recommending mixed A4
  recovery.
- `PRINT_LABEL_CONTRACT.md` defines the print safety contract.
- `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` defines the active batch-print product
  contract: purpose-first, one physical stock per batch, per-item fit report,
  representative preview, explicit reduced/continuation print scope,
  excluded-list handling, and deployed batch QA.
- `NEXT_REMAINING_PRODUCT_WORK.md` holds the detailed execution backlog for the
  current product work blocks.
- `AUTONOMOUS_WORKFLOW.md` defines when to continue, verify, push, deploy, and
  stop for user input.

Current validation gates:

- Docs-only: `git diff --check`
- Docs drift: `npm run test:docs` from `frontend/`
- Frontend: `npm test -- --runInBand`, `npm run test:i18n`, `npm run build`
- Print contract: `npm run test:print-contract`
- Print PDF QA: `npm run qa:print-pdf`
- Production search UI: `npm run qa:production-search-ui` (desktop
  search/detail, source/trust surfaces, no-GHS data-state boundary,
  export-preview trust columns, detail-to-prepared modal keyboard/focus checks,
  plus 390px narrow read-first result and detail-comparison checks)
- Production print handoff: `npm run qa:production-smoke`,
  `npm run qa:production-primary`, `npm run qa:production-compact`,
  `npm run qa:production-multi-chemical`, `npm run qa:production-print`
- Production fixed-stock batch print: `npm run qa:production-batch-print`
- Prepared production workflow: `npm run qa:production-prepared`
- Whole product closure: `npm run qa:production-product`
- Backend: `python -m py_compile server.py` and
  `python -m pytest test_name_search.py -v`

Current completion snapshot:

- **Stable automated baseline**: CI, production product QA, production search
  UI QA, production print handoff, prepared production QA, print contract/PDF
  QA, reference-link safety checks, and modal keyboard containment are all
  represented by repeatable gates.
- **Canonical-doc baseline**: this file, `NEXT_PRODUCT_WORK.md`,
  `NEXT_REMAINING_PRODUCT_WORK.md`, and `AUTONOMOUS_WORKFLOW.md` now agree on
  the continuation order and done criteria.
- **Intentionally deferred**: real-printer validation remains deferred until
  physical paper/stock/printer access is available. Automated Browser/PDF
  checks are strong preconditions, not proof of real printer behavior.
- **Still active / recurring**: fixed-stock batch regression coverage,
  source-conflict governance, upstream outage states, QR real-world
  reliability, compact multilingual labels, long chemical names, case/custom
  identity fields, admin/telemetry limits, and low-noise UX should continue to
  receive new regression cases when evidence appears. Track these
  non-physical-print follow-ups in `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`;
  use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` for the batch-print contract.
- **Active product simplification**: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` now
  defines the next print workflow target. It intentionally cuts the public
  label flow down to complete labels, QR small labels, and identification
  small labels.
- **Data-trust export baseline**: effective custom classification selections
  now carry source/report-count evidence through result/detail surfaces,
  print/export preparation, export preview, frontend CSV fallback, and backend
  CSV/XLSX exports. Export rows include data state, primary source, report
  count, cache state, reference-link count, and classification-selection
  context.
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
  inside a single CAS token. Search history and frontend observability now
  follow the same normalized handoff, with bounded telemetry metadata instead
  of raw invalid paste payloads.
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
  `qa:production-search-ui` now verifies the row and Detail correction links
  for missing Chinese names, no-GHS gaps, and source-conflict review.

## 3. Next Priority Order

Use this order unless a fresh production screenshot, failing CI/QA run, security
finding, or user-reported blocker clearly points elsewhere.

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

Current status:

- The `Production Print QA` GitHub Actions workflow exposes `product` mode as
  the manual default and scheduled fallback.
- Workflow job summaries include product-block pass/fail status when product
  block evidence is present.
- Split modes remain available for focused reruns: `smoke`, `primary`,
  `compact`, `multi-chemical`, `prepared`, `batch`, `full`, and `all`.
- `qa:production-search-ui` keeps the full deployed evidence in
  `build/production-search-ui-report.json`, but prints a compact console
  summary so CI logs show the action, pictogram, trust, data-state, keyboard,
  mobile, and image-load checks without burying failures in raw DOM text.
- `qa:production-search-ui` also covers the deployed missing-Chinese-name
  correction path with a mocked search result, so the Detail data-correction
  link cannot disappear without the production gate failing.
- Local `qa:production-product` runs should be given at least a 12 minute
  timeout; a healthy full product pass can take several minutes because it runs
  deployed Chrome flows, print handoff checks, prepared workflow checks,
  fixed-stock batch checks, and summary generation.
- Production print handoff QA now checks QR supplement scan-target metadata and
  visible QR target role copy, so the SDS/regulatory/reference scan path is not
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
- Keep `NEXT_PRODUCT_WORK.md` as a short live queue only.
- Keep `NEXT_REMAINING_PRODUCT_WORK.md` as the detailed execution backlog.
- Keep historical documents such as `NEXT_PRINT_WORKSTREAMS.md`,
  `PRINT_OUTPUT_REFACTOR_PLAN.md`, and v1.8/v1.10 planning docs as baseline or
  historical context, not active priority selectors.
- Update docs whenever behavior, acceptance criteria, QA gates, or workflow
  assumptions change.

Done means:

- A new session can read `AGENTS.md`, this file, and
  `AUTONOMOUS_WORKFLOW.md` and know exactly how to continue.
- No active doc contradicts the canonical queue or claims that completed
  baseline work is still the next product target.

Current status:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` is now the canonical planning entry point.
- `NEXT_PRODUCT_WORK.md` is the short live queue.
- `NEXT_REMAINING_PRODUCT_WORK.md` is the detailed execution backlog, not the
  priority selector.

### 3. Fixed-Stock Batch Label Printing

Goal: batch printing should solve the real workflow of choosing one physical
label stock and printing many chemicals, without forcing every item through
complete-primary/A4 logic.

Do next:

- Use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` as the implementation contract.
- Treat batch printing as purpose-first: Quick ID, Supplemental, or Complete.
- Keep one selected physical stock for the batch. Do not silently split a batch
  across A4, Letter, tube, rack, and QR stocks.
- Add a batch fit report that classifies each item as ready, ready-tight,
  reduced-purpose, same-stock-continuation, excluded-data, or excluded-fit.
- Replace "preview the first selected label" assumptions with representative
  previews: first, worst-fit, longest name, most pictograms, densest text, and
  excluded list.
- Keep the true 50-item fixed-stock batch fixture and QA gate healthy. The
  existing `multi-chemical` production layer remains representative coverage,
  not proof of a real batch workflow.

Done means:

- A user can select one stock and one purpose, then understand exactly which
  items will print, which are reduced, which need same-stock continuation, and
  which are excluded before pressing print.
- Quick ID and Supplemental batches remain printable when truthful, even when a
  complete primary label would not fit.
- Complete batches never silently omit required content; they continue,
  exclude, or ask the user to choose a different purpose/stock.

Current status:

- Direction is documented in `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
- Implementation has started at the planner layer:
  `frontend/src/utils/printBatchPlanner.js`,
  `frontend/src/utils/testFixtures/batchPrintFixtures.js`, and
  `frontend/src/utils/__tests__/printBatchPlanner.test.js` define the first
  fixed-stock 50-item classification baseline.
- `LabelPrintModal` now surfaces a first batch fit report for multi-item
  selections and can hand off the default ready subset without forcing the
  whole batch to A4/Letter.
- `LabelPrintModal` now also supports representative preview switching for
  the batch fit report, aligns the sheet preview to the current selected print
  scope, and exposes review/excluded items with CSV export before print
  handoff.
- Batch print actions and scope summaries name the selected purpose, physical
  stock, selected count, excluded count, and unselected review count so the
  user can understand the handoff before pressing print.
- Batch print handoff now defaults to ready items but can explicitly include
  acknowledged `reduced-purpose` and `same-stock-continuation` items on the
  same physical stock. The renderer records per-label batch metadata and
  per-label layout overrides so mixed ready/reduced batches remain inspectable.
- `npm run qa:production-batch-print` exists as a deploy-time gate for the
  fixed-stock batch modal flow, including acknowledged scope exercise when a
  reduced/continuation path is available. It is folded into
  `qa:production-product` plus the `fixed-stock-batch-printing` product block
  in the production QA summary.
- Deployed 50-item batch evidence was captured on commit `37cdff9` by
  `qa:production-batch-print`, `qa:production-product`, and GitHub Actions
  `Production Print QA` run `25947899331`.
- `qa:print-report` now also writes a 50-item fixed-stock Quick ID batch print
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
- Record when the expected outcome is a complete primary label versus a
  truthful supplemental or quick-ID label.
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
- QR supplement planning now uses the same source model for scan targets: the
  UI shows the target role/source before printing, and printed QR images carry
  target URL/type/source/label metadata for QA and troubleshooting.
- The deployed print handoff gate now fails QR supplement cases if that target
  metadata or visible role copy disappears.
- Admin curation writes are bounded on the backend: manual dictionary entries,
  aliases, and reference links trim text, cap long fields, reject unsupported
  locale/status values, and constrain numeric priority/confidence before data
  reaches SQLite. Optional workspace document writes also reject oversized JSON
  payloads.
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

Docs-only closure:

- `git diff --check`
- `npm run test:docs` from `frontend/` when canonical docs, version strings,
  status labels, or planning links changed
- `rg "PROJECT_STATUS_AND_NEXT_PLAN" .`
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
- `NEXT_PRODUCT_WORK.md`: short live queue and default continuation order.
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
- `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`: future whitelist and risk review for
  optional scientific lookup skills such as `database-lookup`, `paper-lookup`,
  and `datamol`.
- `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`: future work tracker for data
  trust, UX guidance, public docs, and brand/support surfaces while real
  physical printing is deferred.
- `PRINT_OUTPUT_REFACTOR_PLAN.md`: v1.10 print refactor baseline.
- `NEXT_PRINT_WORKSTREAMS.md`: completed print workstream baseline.
- `DESIGN.md`, `BRANDED_UTILITY_STRATEGY.md`, and `REDESIGN_ROADMAP.md`:
  productized utility design direction.
