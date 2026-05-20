# Next Remaining Product Work

This document is the detailed execution backlog after the v1.10 print-workflow
baseline. It is not the canonical planning entry point. Start from
`PROJECT_STATUS_AND_NEXT_PLAN.md`, use `NEXT_PRODUCT_WORK.md` as the short live
queue, then use this file with `AUTONOMOUS_WORKFLOW.md`,
`PRINT_ACCEPTANCE_STANDARD.md`, and `PRINT_BROWSER_QA_CHECKLIST.md` when a
specific product block is selected.
For label-printing simplification, use `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` as
the active execution contract before using the older print/batch backlog below.

The product goal remains the same: a user should be able to search a chemical,
understand the hazard source, choose one clear output type, preview a truthful
output, and print without becoming a layout expert.

## Current Baseline

The previous five print workstreams in `NEXT_PRINT_WORKSTREAMS.md` are now the
baseline rather than the next queue:

- Prepared preset production clickthrough is covered by
  `qa:production-prepared`.
- Production print matrix automation exists locally and in GitHub Actions.
- Real chemical edge-case coverage is recorded in the print QA matrix report.
- Physical print validation now has a generated work order:
  `npm run qa:physical-print-plan` reads the print QA matrix report and writes
  `build/physical-print-validation-plan.md` plus `.json`.
- Shared print content policy is implemented and asserted by focused tests.
- Print-modal first-screen visual/noise polish is deployed and gated by
  production handoff QA plus the `preview-context-strip` bundle marker.

Future work should build on that baseline instead of reopening the same
questions unless a new production screenshot, QA failure, or code-review
finding proves the baseline is insufficient.

## Current Open / Stable Snapshot

Use this section to avoid mistaking an ongoing backlog for an unfinished
implementation checklist.

- **Stable with gates**: print renderer/stock fit, result pictogram unity,
  trust/source/SDS boundaries, prepared-solution reprint flows, and
  whole-product UX/support positioning are all represented in
  `npm run qa:production-product`.
- **Deferred by decision**: real-printer paper/stock validation is not complete
  because physical evidence is intentionally postponed; keep generated work
  orders current and convert future physical findings into automated checks.
- **Still worth extending**: compact multilingual pressure, long names,
  case/custom identity fields, QR scan evidence, admin/telemetry limits,
  source-conflict handling, fixed-stock batch label printing, and first-time
  user guidance should receive new tests or QA cases when a new example
  appears. The non-physical-print tracker for those next steps is
  `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`; the batch-print contract is
  `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
- **Active simplification target**: the old print-modal vocabulary should be
  reduced according to `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`: complete label, QR
  small label, and identification small label.
- **A4/Letter complete-primary checkpoint**: the 2026-05-18 deployed fix
  aligns full-page H/P typography with resolved layout metrics and tightens
  dense continuation thresholds. `test:print-contract`, `qa:print-pdf`,
  `qa:production-batch-print`, and `qa:production-primary` pass. Keep this in
  monitoring unless a new screenshot or QA failure reopens it.
- **Completed input-quality follow-up**: batch search now normalizes,
  deduplicates, and checksum-checks pasted CAS lists before request. The UI
  summarizes ignored duplicates and invalid entries so repeated or malformed
  lines do not inflate print counts or create confusing missing labels later.
  Search history and frontend observability now use the same normalized CAS
  handoff, with bounded telemetry metadata that records counts and sent CAS
  previews without storing raw invalid paste content.
- **Completed telemetry-gate follow-up**: frontend dictionary miss reporting is
  now explicitly opt-in and still requires backend capture to be enabled. When
  enabled for a pilot, unresolved-search payloads are trimmed, context is
  allow-listed, and telemetry failures do not affect search UX.
- **Completed Chinese-name trust follow-up**: localized-name helpers,
  autocomplete, favorites/history, prepare-solution summaries, print fit
  scoring, print previews, printed labels, export preview, backend export
  payloads, frontend CSV fallback, and backend CSV/XLSX export endpoints now
  share the same CJK-only boundary for Chinese display names. English-only
  placeholders in `name_zh`/`name_zh_tw` are omitted rather than repeated as
  fake Chinese identity. Admin manual dictionary writes also reject English-only
  `name_zh`, so the curated source of truth can stay empty rather than becoming
  polluted.
- **Do not reopen by default**: the v1.10 print workflow baseline and completed
  five workstreams are historical context unless new evidence proves a
  regression.

## 1. Print Renderer And Stock Fit Robustness

Why this matters: the print modal can now guide the user, but the physical label
is still the final product. Small labels, QR labels, case numbers, long names,
prepared-solution metadata, and bilingual text can still fail visually if the
renderer and QA do not keep pace with the planner.

Work to continue:

- Keep A4/Letter complete-label continuation and calibrated full-page H/P
  typography covered. A complete primary label should not block solely because
  `compliance-precautions-overflow` appears when the same stock can either fit
  the content or produce a continuation page.
- Keep regression coverage for the observed production failure class: a dense
  multi-item A4 primary batch where the print action claims items are printable
  but could block at handoff.
- Align the modal preview, print button copy, hidden print iframe, PDF artifact,
  and production handoff inspection so they all agree on page count and
  continuation status.
- Add stock-specific renderer checks for compact families: small strip,
  small rack, medium rack, 62 mm continuous, standard bottle, large front label,
  A4 primary, and Letter primary.
- Turn every observed visual issue into a geometry assertion or QA matrix case:
  CAS/case chips, product name, signal word, pictograms, QR block, H summaries,
  continuation labels, and prepared-solution metadata.
- Keep preview, print HTML, PDF artifacts, and production Chrome handoff aligned
  so a passing test means the visible output is actually usable.
- Prefer scaling and reflow before deleting text. Deletion or summarization must
  be driven by the shared content policy, not by ad hoc renderer rules.

Acceptance:

- Compact-label QA fails on overlap or clipping before the user sees it in
  production.
- Every supported stock family has at least one representative production or
  renderer test case.
- Case number and other selected identity fields stay visible when enabled.
- A4/Letter primary outputs remain complete and do not overflow when QR,
  profile, bilingual names, or continuation content is present.
- Dense complete-primary content paginates to same-stock continuation pages and
  does not surface `compliance-precautions-overflow` as a user-facing dead end
  when the content is continuable.

Current status:

- Implemented stock-fit contracts in the print QA matrix so every matrix case
  now records the expected stock family, rendered label size, minimum printed
  pictogram size, minimum printed QR size, and support-chip requirement.
- Extended PDF artifact QA to consume those stock-fit expectations and fail on
  label-kind mismatch, undersized pictograms/QR, missing selected identity
  fields, forbidden language leakage, case/support chip clipping, and
  support-chip collision with pictograms, QR, or signal word.
- Extended production handoff QA to inspect the live preview iframe for the
  selected case/support chip and fail if it is hidden, outside the label, outside
  the viewport, or overlapping critical visual elements.
- Hardened production handoff sequencing so the deployed Chrome runner waits
  for the selected label purpose, stock card, and preview label-kind/stock
  contract before capturing evidence or pressing print. This prevents fast
  remote runners from accidentally validating the previous modal state.
- Added bounded production-search retries for Browser QA so a single transient
  PubChem/backend miss does not masquerade as a print-layout regression, while
  repeated upstream failures still block the production gate.
- Fixed the small-rack renderer where the new stock-fit gate found undersized
  GHS pictograms: quick-ID small-rack icons now render at 11.4 mm and
  small-rack QR supplement icons render at 10 mm.
- Added custom-stock cases to the print QA matrix: a tiny custom complete
  primary is blocked and routed back to A4/Letter, while the same tiny custom
  geometry remains printable as truthful supplemental output with every GHS
  pictogram preserved. Blocked custom-primary cases are kept out of PDF artifact
  generation because they are not valid print handoff outputs.
- Custom physical sizes now infer typography size from the entered dimensions
  instead of inheriting the large-primary preset size. This keeps tiny custom
  labels on the strip renderer path and prevents standard-grid overflow.
- Local verification passed: `npm run test:print-contract`, generated
  `build/print-qa-report.json`, generated `build/print-html-artifacts/`,
  `npm run qa:print-pdf` (35/35, including the fixed-stock 50-item Quick ID
  batch print artifact), `npm run build`,
  `npm test -- --runInBand` (822/822), and
  `npm run qa:production-compact` against the deployed production URL
  (15/15 compact handoff cases).
- The production summary report now maps deployed evidence back to the five
  product work blocks. `npm run qa:production-product` requires the print
  bundle, print matrix, deployed handoff, search UI, and prepared workflow
  reports to pass before it marks the whole product gate as passing.
- Production handoff QA now includes a blocked A4 complete-primary case with
  missing responsible profile. The runner clears browser storage per case and
  checks the recovery-route metadata, so stale local profile data cannot hide a
  blocked-flow regression.

Suggested verification:

- `npm run test:print-contract`
- `PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report`
- `npm run qa:print-pdf`
- `npm run qa:production-bundle`
- `npm run qa:production-primary`
- `npm run qa:production-compact`

## 2. Result Table And GHS Pictogram Visual Unity

Why this matters: the search result is the user's first trust moment. If the GHS
icons look inconsistent, crowded, decorative, or different from the print/detail
views, the product feels less reliable even when the data is correct.

Work to continue:

- Review the pictogram presentation in the results table, expanded
  classifications, detail modal, comparison table, favorites/history surfaces,
  and print preview.
- Use official SVG pictograms for regulatory symbols. Generated bitmap assets
  are acceptable for non-regulatory empty states, education, brand surfaces, or
  explanatory illustrations, but not as replacements for GHS pictograms.
- Standardize tile size, border radius, background, spacing, wrapping,
  collapsed/expanded behavior, and "set as primary" actions.
- Make dense icon sets readable without status dots, decorative clutter, or
  awkward grids that compete with chemical identity.

Acceptance:

- A four-pictogram chemical such as Hydrochloric Acid looks consistent across
  results, expanded classifications, detail, comparison, preview, and print.
- Expanded "other classification" rows are scannable and do not produce strange
  columns or icon stacks.
- Production search UI QA captures result-table readability and fails on obvious
  pictogram layout regressions.

Current status:

- Result table, expanded alternate classifications, detail/favorites surfaces,
  and comparison table now use the shared `GHSPictogramStrip` instead of
  hand-rolled pictogram tiles.
- Comparison table cells use the canonical tile geometry and show missing
  pictograms as small code chips rather than rendering a second, inconsistent
  absent-icon grid.
- Production search UI QA now inspects deployed Hydrochloric Acid result-row
  pictogram geometry, expands the alternate-classification drawer, captures a
  second screenshot, and fails on missing strips, undersized images, non-square
  tiles, and action-button vertical-text regressions.
- Production search UI QA also runs a 390px narrow read-first scenario and
  fails when the result area horizontally scrolls or when detail/SDS actions
  land outside the viewport.
- Same-chemical classification comparison now switches from the desktop
  matrix table to stacked cards on narrow viewports. Production search UI QA
  opens the deployed detail modal at 390px, verifies the mobile card layout,
  checks for horizontal overflow, and validates the shared pictogram strips in
  those cards.
- `GHSImage` loads the checked-in regulatory SVG pictograms eagerly. These
  assets are small and safety-critical, and eager loading prevents off-screen
  modal comparison cards from silently carrying unloaded icons during QA.
- Production search UI QA now also clicks into the deployed detail modal and
  inspects the same-chemical classification comparison table. It verifies that
  the currently selected classification uses the shared selected pictogram
  strip, that every comparison column keeps readable official-symbol imagery,
  and that detail-modal pictogram images load before the run is accepted.
- The shared pictogram strip now distinguishes a `selected` classification
  state from a real `custom` override. This keeps result-row custom overrides,
  detail-modal current-classification styling, and QA metadata semantically
  separate while preserving the same calm blue selected-state treatment.
- `npm run qa:production-product` now treats the production search UI report as
  deployed evidence for result-table pictogram unity, so this block is part of
  the single product-level pass/fail gate instead of a separate manual note.

Suggested verification:

- `npm test -- --runInBand`
- `npm run test:i18n` when copy changes
- `npm run build`
- `npm run qa:production-search-ui`
- `npm run qa:production-smoke` when result actions or print entry changed

## 3. Trust, Source, SDS, And Safety Boundaries

Why this matters: this is a safety reference tool, not a legal compliance
authority. The user should know what came from PubChem, what came from local
dictionary/manual curation, what requires SDS/supplier/local-rule verification,
and why QR or supplemental labels do not replace a complete primary label.

Work to continue:

- Make source/provenance copy short, specific, and close to the decision points:
  search result, detail modal, SDS links, print modal, and QR/supplemental paths.
- Keep SDS and reference links safe, labeled, and visibly secondary to the
  immediate search/label task.
- Make unavailable or stale upstream data impossible to confuse with "no
  hazards."
- Keep brand visibility and eventual monetization outside safety-critical label
  content. Footer, help, education, report/export, or optional brand surfaces
  are acceptable; GHS labels are not ad inventory.

Acceptance:

- A user can tell when they should verify against SDS, supplier labels, or local
  regulations.
- QR labels and supplemental labels clearly communicate that details live in
  SDS/primary/QR paths and do not replace the complete primary label.
- Unsafe reference-link schemes, stale hazard states, and missing upstream data
  remain blocked or clearly warned.

Current status:

- Search results now distinguish three safety states instead of collapsing them
  together: no GHS classification data, GHS text without renderable pictograms,
  and renderable pictograms. This prevents H/P or signal-word-only records from
  being presented as "no hazard."
- The shared `AuthoritativeSourceNote` now supports results, detail, and print
  variants with explicit SDS, supplier-label, and local-rule verification chips.
  Print mode can also show supplemental-only or blocked-output wording.
- Detail-modal reference links are labeled by role (`SDS`, `Regulatory`,
  `Occupational`, or `Reference`) and include a short verification hint so SDS
  paths remain useful without implying that the app itself is the authority.
  The frontend and backend still reject unsafe non-http(s) reference URLs.
- Reference link roles are now constrained to the same four safe categories on
  both backend writes and frontend normalization. Legacy/manual links with
  unknown roles are downgraded to `Reference`, while unsafe URL schemes remain
  blocked.
- Detail reference lists now use the same role-first order as QR targets:
  `SDS`, `Regulatory`, `Occupational`, then generic `Reference`, with numeric
  priority applied only within the same role. Production search UI QA checks
  that deployed detail links keep that authority order.
- Backend reference-link payloads now use that same role-first order, keeping
  the API contract aligned with QR target selection and frontend detail views.
- Result rows now show a compact source chip for ECHA, PubChem, or other
  supplied sources instead of hiding non-ECHA provenance. Detail reference
  links also expose both role and source chips so verification links remain
  readable as secondary evidence rather than untyped CTAs.
- Production search UI QA now checks deployed trust surfaces as part of the
  Hydrochloric Acid click-through: result-page authoritative note, trust panel,
  PubChem SDS URL shape, source chip presence, detail-modal verification hint,
  and every detail reference link's safe scheme/type/source metadata.
- The print modal now keeps the same trust boundary close to the output-planner
  decision: complete outputs get verification copy, QR/quick-ID/supplemental
  outputs state that they do not replace the complete primary label, and blocked
  states tell the user not to print yet.
- QR supplement outputs now expose the scan target role before printing
  (`SDS`, `Regulatory`, `Occupational`, or `Reference`) and the printed QR image
  keeps URL/type/source/label data attributes for audit-oriented QA.
- Production print handoff QA now treats that as a contract: QR supplement
  cases fail when the target attributes or visible QR target role copy are
  missing.
- The product-level production gate uses the same search UI report as evidence
  for trust/source/SDS boundaries, including authoritative notes, source chips,
  safe reference-link metadata, and separated data-correction/workflow support
  links.
- Production search UI QA now includes a deployed found-with-no-GHS-data path
  using Urea (`57-13-6` by default). It verifies no-GHS warnings in both result
  and Detail views, keeps text-only GHS states separate, disables print entry
  points, and prevents label selection for that row.
- Effective alternate-classification selections now carry their selected
  source/report-count evidence through result-row chips, Detail trust and
  provenance surfaces, print/export preparation, export preview, frontend CSV
  fallback, and backend CSV/XLSX exports. This prevents a user-selected
  classification from keeping stale primary-source evidence.
- Export rows now include data state, primary source, report count, retrieved
  time, cache state, reference-link count, and classification-selection context.
  Production search UI QA opens the deployed export preview and fails if these
  trust columns disappear.

Suggested verification:

- Frontend tests for copy/state changes
- Backend tests when source/reference validation changes
- `npm run test:i18n`
- `npm run qa:production-search-ui`

## 3A. Batch Search Input Quality

Why this matters: batch printing starts with pasted input. If duplicate CAS
values, malformed lines, or checksum mistakes enter the result set silently, the
user later sees wrong counts, missing labels, repeated labels, or blocked print
flows that look like renderer failures.

Implemented baseline:

- Normalize pasted CAS input before backend search: full-width digits, CAS
  prefixes, dash variants, and whitespace should collapse to canonical CAS
  strings.
- Deduplicate before request while keeping first-seen order.
- Reject malformed CAS values and checksum failures before backend search.
- Show duplicate and invalid counts near the batch textarea without adding a
  noisy wizard.
- Keep the backend size limit based on valid unique CAS values, not raw pasted
  lines.
- Preserve unresolved-search telemetry alignment by logging against the
  normalized CAS values that were actually sent.
- Store only bounded batch-input telemetry: counts, over-limit status, and a
  capped preview of the normalized CAS list that reached the backend.
- Keep search history on trimmed CAS values and ignore malformed successful
  rows without a CAS identity.

Work to continue:

- Extend production QA only when a new screenshot or pilot workflow shows the
  normalized batch path drifting from result counts, history, or print counts.

Acceptance:

- A repeated 100+ line paste of the same CAS sends one backend query and does
  not trip the batch limit.
- Invalid CAS entries such as `344-04-07` are not sent to `/api/search`.
- The UI tells the user how many duplicates and invalid entries were ignored.
- Batch print counts, recent history, and local observability are based on
  searched, valid, unique CAS rows.

Suggested verification:

- `npm test -- --runInBand batchSearchInput.test.js SearchSection.test.js printAllWithGhs.integration.test.js`
- `npm run test:i18n`
- `npm run build`

## 4. Prepared Solution And Reprint Workflow Maturity

Why this matters: prepared-solution labels are a real lab workflow, not just a
print variant. Reprinting a prepared solution must preserve parent chemical
identity while keeping run-specific operational fields fresh and truthful.

Work to continue:

- Keep parent chemical identity, concentration, solvent, prepared-by,
  prepared-date, expiry-date, case number, and custom fields consistent across
  form, preview, recent records, saved presets, and print output.
- Ensure saved presets never carry stale operational fields into a new prepared
  job.
- Make recents/reprints rerun the current planner instead of trusting a stale
  layout that used to be printable.
- Expand prepared-solution renderer cases when compact labels or bilingual
  metadata produce layout pressure.

Acceptance:

- Prepared A4 primary, bottle supplemental, and tube quick-ID paths pass the
  same no-clipping, no-missing-pictogram, truthful-output standards as regular
  labels.
- Prepared preset reuse pre-fills recipe fields only and requires fresh
  operational context where appropriate.
- Prepared sidebar reprint opens the current print modal and remains subject to
  current planner, image, layout, and content-policy checks.

Current status:

- Prepared recents and presets now normalize both localStorage and optional
  workspace-sync payloads before hydrating state. Recents keep only workflow
  identity plus operational fields; presets keep recipe fields only. Stale GHS
  hazard snapshots, signal words, pictograms, and accidental operational fields
  are stripped even if an older or corrupted payload contains them.
- Add/update paths also normalize before persistence, so future callers cannot
  accidentally store hazard data in workflow-only prepared records.
- The prepared reprint sidebar now uses the same expiry-status logic as the
  prepare modal. Expired or soon-expiring entries are visually marked before the
  user reprints, while reprint still refetches the current parent chemical and
  reruns the current print planner.
- The label print modal now carries that expiry-status signal into the final
  selected prepared-solution row, so an expired or soon-expiring prepared record
  remains visible at the last print decision point instead of only in the
  sidebar/form.
- Production prepared QA now uses run-relative prepared/expiry dates instead of
  fixed calendar dates, so the deployed workflow check continues to represent a
  fresh prepared job instead of aging into a false expired-fixture failure.
- `npm run qa:production-product` includes `qa:production-prepared` and
  `qa:production-batch-print`, so prepared print, recent reprint, saved preset
  reuse, and fixed-stock batch evidence are no longer optional when closing a
  whole-product production pass.

Suggested verification:

- Prepared workflow integration tests
- `npm run qa:production-prepared`
- `npm run qa:print-pdf` when renderer output changes

## 5. Whole-Product UX And Brand-Utility Convergence

Why this matters: the product should feel like one focused utility, not a set of
separate features added over time. The free-utility positioning can support
brand visibility, but the core safety workflow must stay calm, useful, and
non-promotional.

Work to continue:

- Review the full user path: empty state, search, result table, detail modal,
  SDS path, print modal, prepared solution, recents, exports, and footer.
- Remove duplicate explanations, noisy controls, and UI language that describes
  implementation rather than user decisions.
- Use generated images or branded visuals only where they improve orientation
  or polish without weakening safety trust.
- Keep visual hierarchy consistent: primary task first, verification second,
  advanced controls third, brand/support surfaces last.

Acceptance:

- A first-time lab or operations user can complete the main flow without reading
  long instructions.
- The app looks consistent across search, detail, print, and prepared workflows.
- Brand visibility exists only in places that do not compete with hazard
  communication or print output.
- Remaining roadmap items are tracked in documents, tests, or QA reports rather
  than being preserved only in chat.

Current status:

- The product trust/support surface has been downgraded from a nested card
  block into a lightweight support band after results, so it no longer competes
  with the primary search and print task.
- Empty-state and footer copy now describes the user value directly: search,
  verify, print/export, and report corrections or workflow requests only after
  the safety task is complete.
- Brand/support positioning is now explicit in UI copy: labels and hazard
  content stay ad-free, while feedback and workflow links stay outside
  safety-critical label content.
- Product trust and footer support links now split into two explicit paths:
  data-correction reports and workflow requests. This keeps safety-data
  corrections separate from brand/service-oriented workflow conversations while
  leaving both outside printed labels and hazard content.
- The result table now behaves as a readable result card on narrow screens
  while preserving the same DOM and desktop table layout on larger screens.
  Mobile users can see identity, GHS pictograms, signal word, detail, and SDS
  actions without dragging a 1120px-wide table.
- The product-level production QA entry point (`npm run qa:production-product`)
  stitches together the current product blocks: deployed search/detail/trust
  checks, deployed print smoke handoff, deployed prepared-solution workflows,
  and deployed fixed-stock batch printing. The generated summary exposes one
  pass/fail line per block so future autonomous rounds can see which area is
  actually not done.
- Core custom dialogs now share the focus-trap path across label print,
  prepared solution, cross-chemical comparison, sidebars, and DetailModal.
  DetailModal also disables its trap while a prepared-solution modal is stacked
  above it, so Tab/Escape belong to the visible top layer instead of leaking to
  or being captured by the background dialog.
- Production search UI QA now verifies the deployed keyboard contract for that
  path: DetailModal forward/backward Tab wrapping, DetailModal suppression while
  Prepare Solution is stacked, Prepare Solution forward/backward Tab wrapping,
  and Escape restoring the underlying DetailModal instead of closing both
  layers.
- The print modal now uses the existing diagnostics area to show a recovery
  route when a complete-primary flow is blocked or upgraded. This keeps the
  first screen quiet while still telling users which current stock failed, what
  to do next, and which full-page stock or profile data is needed before
  printing.

Suggested verification:

- Manual product walkthrough against production
- `npm run qa:production-search-ui`
- `npm run qa:production-smoke`
- `npm run qa:production-product` when closing all product blocks together
- Screenshot review across desktop and narrower modal widths
- `build/production-search-ui-screenshots/search-results-mobile-read-first.png`
  after running production search UI QA

## 6. Fixed-Stock Batch Label Printing

Why this matters: batch printing is not just "many single-label prints." Lab
users often load one label roll or sheet and need a whole set of chemicals to
print consistently on that stock. This block is now implemented and monitored
through the batch contract and production gates. Reopen it only when a fresh
batch list, screenshot, QA failure, or code-review finding proves the current
fixed-stock baseline is insufficient.

Monitoring rules:

- Use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` as the owner contract.
- Keep one selected physical stock per batch; do not silently split a batch
  across paper or roll sizes.
- Keep Quick ID, Supplemental, and Complete as first-level batch purposes.
- Keep per-item categories visible before print handoff: ready, ready-tight,
  reduced-purpose, same-stock-continuation, excluded-data, and excluded-fit.
- Keep representative previews available: first, worst fit, longest name, most
  pictograms, densest text, and excluded list.
- Add new fixtures and QA cases when real 30-100 item batch examples expose
  layout, guidance, or exclusion issues not covered by the current 50-item
  fixture.

Acceptance:

- One dense or missing-data chemical does not block unrelated printable items.
- Quick ID and Supplemental batches remain printable when truthful, even if
  complete H/P would not fit.
- Complete batches never silently omit required content.
- Users can see what will print, what was reduced, and what was excluded before
  print handoff.

Current status:

- Implemented and now monitored through `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
- Planner-layer implementation:
  `frontend/src/utils/printBatchPlanner.js` classifies Quick ID,
  Supplemental, and Complete batches against one fixed stock.
- A reusable mixed 50-item fixture and unit coverage live in
  `frontend/src/utils/testFixtures/batchPrintFixtures.js` and
  `frontend/src/utils/__tests__/printBatchPlanner.test.js`.
- `LabelPrintModal` shows a first batch fit report for multi-item selections
  and prints the default ready subset instead of blocking a whole batch when
  unrelated items need review.
- `LabelPrintModal` now supports representative preview switching for the
  batch fit report, keeps the sheet preview on the current selected print
  scope, and shows a review/excluded list with CSV export before handoff.
- Batch users can now explicitly include acknowledged `reduced-purpose` and
  `same-stock-continuation` items. The print renderer receives per-label batch
  metadata and layout overrides, so one fixed-stock job can mix ready and
  reduced/continuation output without silently changing paper sizes.
- `npm run qa:production-batch-print` now exercises the deployed fixed-stock
  batch modal flow, acknowledged scope selection when available, and writes
  `build/production-batch-print-report.json` with a screenshot.
- `qa:production-product` now runs `qa:production-batch-print`, and the
  production QA summary has a fixed-stock batch product block.
- `qa:print-report` now writes a 50-item fixed-stock Quick ID batch print HTML
  artifact, and `qa:print-pdf` verifies that the batch output uses one stock,
  carries batch-category metadata on every label, preserves required GHS
  pictograms, and avoids clipping/overlap.
- Deployed 50-item batch evidence was captured on commit `37cdff9` by local
  production QA and GitHub Actions `Production Print QA` run `25947899331`.
  Re-run the same production closure after each future batch-facing change.

Suggested verification:

- New batch planner unit/integration tests.
- New renderer/PDF batch artifacts.
- `npm run qa:production-batch-print`
- `npm run qa:production-product`

## Default Next Order

Unless a fresh bug report or failing check points elsewhere, continue in this
order:

1. Trust/source/SDS safety boundaries.
2. Whole-product UX and brand-utility convergence.
3. Print renderer and stock fit robustness.
4. Result table and GHS pictogram visual unity.
5. Prepared solution and reprint workflow maturity.
6. Fixed-stock batch label printing monitoring.

This order reflects the current state after batch-print gate coverage shipped:
keep batch monitored, then prioritize trust/data-state clarity and low-noise
daily-use UX unless a fresh print screenshot or failing QA run points back to
the renderer.
