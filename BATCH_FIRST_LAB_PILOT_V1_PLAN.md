# Batch-First Lab Pilot v1 Plan

Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first. This document is the active
major owner doc after the 95% Lab-Ready Pilot, Pilot Operations Ready, and
Pilot Evidence And Maintainability Pass targets shipped.

## Status

Status: `Shipped / Monitoring`

Target: make the batch-first lab workflow reliable enough for a practical
small pilot where a lab user can paste 50-100 chemicals, understand what needs
review, export a useful workbook, and print the selected label output without
becoming a data-cleanup or print-layout expert.

This is not a broad redesign. It is a focused productization target:

- Batch lookup is the primary user path.
- Batch print and batch export are the main completion actions.
- Data correction and admin triage support the workflow instead of becoming a
  separate admin product.
- Label printing keeps the simplified three-output model.
- Maintainability work is included only where it lowers risk for the selected
  workflow.

## Current Closure Audit Snapshot

2026-05-26 closure decision: this target can move from `Open` to
`Shipped / Monitoring`. The final audit found two small closure gaps and
patched them in this slice: export payloads now preserve original batch total
and visible-row count for the XLSX `Pilot Summary`, and the admin triage panel
now exposes open corrections plus stale telemetry cleanup as first-level cards.

The largest implementation slices were already shipped and production-gated:

- Batch review clarity, export-scope handling, and admin triage next-action
  visibility shipped in `20b5745` and passed local tests/build/docs checks plus
  deployed production health, bundle, search UI, lab-ready batch, and product
  QA gates.
- The fixed-stock batch output contract and Batch Export v1 closure shipped in
  `5195b3a`: the print modal and print action now expose selected item count,
  physical label count, physical page count, and selected stock/purpose; CSV
  and XLSX exports share the same trust/review row contract; XLSX separates
  ready, needs-review, unresolved, and pilot-summary sheets.
- The production batch handoff QA ordering fix shipped in `5d51401`, after
  which production health, batch-print, and product QA passed against Zeabur.
- The required low-risk maintainability criterion is satisfied by the bounded
  extraction slices already listed in this file.
- The 2026-05-26 audit patch closed the remaining evidence gaps for export
  batch context and admin triage visibility. Focused frontend and backend tests
  cover the new export/admin contract.

Post-closure monitoring work:

- Keep external candidate discovery review-only and dry-run-only until a
  separate scope/cost/source decision approves a specific source.
- Keep physical printer/stock validation deferred; it is not required to close
  this software target.
- Use real pilot/admin queue evidence to decide the next product slice, but do
  not reopen this target unless users cannot complete the batch lookup,
  review, export, print-handoff, or correction/admin routing path.

## Closure Criteria Audit

| Criterion | Status | Evidence |
| --- | --- | --- |
| Representative 50-100 item batch can complete lookup, review, export, and selected print handoff. | Passed | `qa:production-lab-ready-batch`, `qa:production-batch-print`, and `qa:production-product` cover the lab-ready batch fixture; `frontend/scripts/check-production-batch-print.mjs` exercises the 50+ item CAS list, print modal handoff contract, export preview, and review summary. |
| Batch-wide state, visible filtered state, review reasons, and next actions are clear. | Passed | `ResultsTable` keeps batch-wide counts separate from visible scope, renders review-reason chips and next-action copy, and focused `ResultsTable` tests cover filtering and summary behavior. |
| Multiple-GHS rows show system-suggested vs user-confirmed state and route to the chooser. | Passed | Result rows and export rows preserve multiple-GHS status; multiple-GHS chips open the existing classification chooser; production search UI QA checks the deployed action. |
| Missing names, unresolved searches, no-GHS states, and source conflicts route into correction/admin review. | Passed | Data-quality issue links, in-app correction requests, admin correction queue, and pilot triage attention counts cover these paths; candidate evidence remains review-only. |
| Candidate discovery stays review-only and ready for a future sandbox decision. | Passed | `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md`, `backend/candidate_discovery.py`, and `backend/scripts/discover_candidates.py` keep discovery maintainer-side and dry-run-only. Default sources are approved manual entries plus the local seed dictionary; optional Wikidata is explicit by CAS. PubChem synonyms, NCI, LLM, and scientific skills remain planned and cannot affect public lookup, labels, exports, or QR. |
| Exports preserve trust/review context and remain readable for lab-manager triage. | Passed | CSV/XLSX share trust headers, XLSX includes `GHS Results`, `Ready Rows`, `Needs Review`, `Unresolved`, and `Pilot Summary`; the audit patch adds original total-row and visible-row context to the summary, and export preview shows ready/review/unresolved counts for the selected scope before download. |
| Three-output label model remains intact. | Passed | The public print model remains Complete A4/Letter, QR small label, and Identification small label; small labels remain identity/GHS/QR only and complete labels carry full H/P content. |
| At least one low-risk maintainability extraction or bounded refactor is complete. | Passed | Multiple bounded extraction slices are recorded in this file, including print lifecycle, print styles, preview panels, admin triage sections, backend API schemas, and backend pilot/admin routes. |
| Current docs point to this file as the shipped/monitoring Batch-First owner doc. | Passed | `PROJECT_STATUS_AND_NEXT_PLAN.md` and `NEXT_PRODUCT_WORK.md` name this file as the Batch-First owner doc; after closure, they route future work to post-closure monitoring slices. |
| Relevant tests and production QA gates pass. | Passed / monitor | Latest shipped production gates passed after `5d51401`; this audit slice added focused export/admin tests. Re-run production gates after deployment when this closure patch is pushed. |

## Why This Is The Right Next Major Goal

The previous milestones proved that the app can pass controlled production QA
and that the pilot evidence/admin/export surfaces exist. The remaining product
risk is that a real lab user still has to mentally stitch together too many
states:

- valid, duplicate, invalid, unresolved, and found batch inputs;
- printable, review-needed, no-GHS, missing-name, and multiple-GHS rows;
- print scope versus export scope;
- system-suggested versus user-confirmed GHS classification;
- correction requests versus admin-reviewed public dictionary changes.

The next maturity jump should therefore be measured by whether the main batch
path feels calm, predictable, and maintainable from end to end.

## Product Promise

A lab user should be able to:

1. Paste a messy list of CAS numbers or chemical names.
2. See what the system accepted, ignored, found, or could not resolve.
3. Understand which rows are directly usable and which rows need review.
4. Confirm or accept the primary GHS classification when multiple public
   classifications exist.
5. Print one chosen output type for the batch:
   - Complete A4/Letter label.
   - QR small label.
   - Identification small label.
6. Export a workbook/CSV that preserves review state and is useful for cleanup
   or handoff.
7. Submit or route data issues into an admin-review path without changing
   public data automatically.

## Workstreams

### 1. Batch Review Flow

Goal: the batch result page should tell the user what to do next without
requiring them to inspect every row manually.

Scope:

- Keep the messy-paste parser, duplicate handling, invalid diagnostics, and
  checksum validation healthy.
- Keep batch-wide counts separate from filtered-visible counts.
- Make review reasons clear and actionable:
  - multiple GHS classifications;
  - missing trusted Chinese name;
  - no GHS data;
  - text-only GHS without pictograms;
  - true source conflict;
  - unresolved lookup;
  - upstream retry state.
- Ensure multiple-GHS rows can route to the classification chooser instead of
  pretending every disagreement is a correction request.
- Keep print handoff non-blocking but explicit when selected rows still have
  unconfirmed multiple-GHS classifications.

Done means:

- A 50-100 item batch can be understood from the summary, review chips, filters,
  and row actions.
- A user can tell why a row needs review and what the next action is.
- The batch summary shows a review action queue so every review reason has a
  visible next action, not only the highest-priority warning.
- The batch QA fixture and production-search UI gate cover the main summary and
  review-reason behavior.

### 2. Batch Label Output Confidence

Goal: batch printing should preserve the simplified three-output model and make
the selected output predictable.

Scope:

- Keep exactly three public outputs:
  - Complete A4/Letter label.
  - QR small label.
  - Identification small label.
- Keep one selected output type for the batch.
- Keep one physical stock for the batch.
- Use same-output continuation when an item needs more room.
- Do not silently switch a single item to another label type or stock.
- Keep complete-label H/P content and QR target truthful.
- Keep small labels free of H/P statements.
- Preserve all available GHS pictograms across continuation labels.
- Keep A4/Letter pagination and dense-content fit monitored, but do not reopen
  broad print redesign unless production evidence proves a regression.

Done means:

- A representative batch can print each of the three output families or show a
  concrete recovery path.
- Preview, print button copy, hidden iframe handoff, PDF QA, and production QA
  agree on selected output and page count.
- No label marked printable hides required pictograms or clips required
  identity content.

Current checkpoint:

- The batch label modal now exposes a fixed-stock output contract before
  handoff: selected print items, physical labels, physical pages, and selected
  stock/purpose. The print action repeats the same physical counts.
- `qa:production-batch-print` now asserts the output contract exists, selected
  count is non-zero, physical labels are at least selected items, page count is
  non-zero, and the print action includes physical labels/pages.
- Batch export v1 now uses a shared backend export row contract for CSV and
  XLSX, with readable trust/review columns kept aligned across formats.
- XLSX export now includes lab-manager triage sheets: `GHS Results`,
  `Ready Rows`, `Needs Review`, `Unresolved`, and `Pilot Summary`.
- Export preview now tells maintainers that XLSX separates ready, review, and
  unresolved rows before download, while CSV remains a single flat sheet.

### 3. Batch Export v1

Goal: exports should be useful to a lab manager, not merely a raw dump.

Scope:

- Preserve data trust columns:
  - printable state;
  - needs-review state;
  - review reasons;
  - primary source;
  - report count;
  - source conflict;
  - missing trusted Chinese name;
  - multiple-GHS confirmation status;
  - classification selection.
- Keep XLSX `Pilot Summary` useful and readable.
- Keep formula-injection protection.
- Decide from evidence whether to add small export improvements such as:
  - clearer filename/scope naming;
  - review-needed-only export;
  - separate ready/review/unresolved sheets.

Done means:

- A maintainer can open the export and understand what happened in the batch,
  which rows are ready, and which rows require review.
- Any export contract change has backend/frontend tests.

Current checkpoint:

- Backend CSV/XLSX exports now share `EXPORT_DATA_HEADERS` and
  `build_export_data_row`, reducing drift between flat CSV and workbook export.
- XLSX exports now split rows into `Ready Rows`, `Needs Review`, and
  `Unresolved` sheets in addition to the complete `GHS Results` sheet and the
  existing `Pilot Summary`.
- Frontend export preview now explains the XLSX workbook layout so a lab
  manager knows the downloaded file is already triaged.
- Frontend export preview also summarizes the selected scope with ready,
  needs-review, and unresolved counts before CSV/XLSX generation.
- Tests cover the triage workbook sheets, the XLSX-only preview note, and the
  selected-scope summary counts.

### 4. Data Correction And Admin Triage

Goal: data problems should become reviewable records without letting generated
or external suggestions change public lookup, labels, QR targets, or exports
automatically.

Scope:

- Keep in-app correction intake as the primary user-facing route.
- Keep GitHub issue links as fallback/escape hatches.
- Keep correction request statuses finite:
  - open;
  - candidate_found;
  - approved;
  - rejected;
  - ignored.
- Keep candidate evidence review-only until admin-approved.
- Use candidate discovery only as a maintainer-side dry-run/evidence tool.
- Prefer real pilot queue evidence before expanding external lookup sources.
- Keep admin triage focused on the next action:
  - open corrections;
  - candidate-found rows;
  - pending manual entries;
  - unresolved searches;
  - no-GHS data gaps;
  - multiple-GHS confirmation pressure;
  - stale telemetry cleanup.

Done means:

- A maintainer can tell which data-quality work should be handled first.
- Public data changes require approved curation.
- Missing Chinese names, unresolved searches, no-GHS data, and source conflicts
  each have a clear review path.

Current checkpoint:

- The pilot triage panel now promotes the highest-priority recommended focus
  into a primary admin action above the metric grid. The detailed counters and
  focus rows remain available, but the first maintainer read is now "what do I
  do next?" rather than "which of these counters matters most?".
- Recommended-focus rows now include stable target queues. The primary admin
  action and each detailed focus row can open the related dashboard section,
  so maintainers can handle the top queue or a lower-priority queue without
  manually scanning for the matching correction, candidate, miss-query, alias,
  manual-entry, or reference-link section.
- Candidate discovery dry-run reports now include status and evidence-type
  summary counts, including rows without candidates. This keeps maintainer-side
  data cleanup measurable without letting generated or external candidates
  change public lookup, labels, QR, or exports automatically.

### 5. Maintainability Slice

Goal: reduce future implementation risk without starting a large rewrite.

Scope:

- Use the maintainability audit in
  `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` as the starting point.
- Prioritize small, contract-preserving extractions.
- First extraction slice completed:
  - `PilotTriagePanel` and shared admin primitives were extracted from
    `PilotDashboardSidebar.jsx`.
  - print-modal helper/config logic was extracted from
    `LabelPrintModal.jsx`.
  - print layout overflow inspection was extracted from `printLabels.js`.
  - export trust/summary helpers were extracted from `backend/server.py`.
- Second bounded extraction completed:
  - additional print-modal pure helpers now live in
    `components/label-print/labelPrintModalHelpers.js`, including display-name,
    hazard-preview, responsible-profile, preview-risk, and density helpers.
  - correction candidate evidence UI now lives in
    `components/pilot/CorrectionCandidateEvidence.jsx`.
  - curation status option lists, timestamp resolution, and admin-list sorting
    now live in `components/pilot/pilotDashboardHelpers.js`.
- Third bounded extraction completed:
  - complete-label continuation pagination now lives in
    `utils/printContinuationPagination.js`.
  - H/P statement print-priority scoring now lives in
    `utils/printStatementPriority.js`.
  - admin status-count summaries now reuse
    `PilotDashboardPrimitives.CurationStatusSummary`.
- Fourth bounded extraction completed:
  - converted correction candidates, top correction-request review, and recent
    correction-request lists now live in
    `components/pilot/PilotCorrectionRequestSections.jsx`.
  - `PilotDashboardSidebar.jsx` now keeps state ownership and decision
    handlers while narrower components render the correction-request UI.
- Remaining candidate slices stay planned until needed:
  - a complete-label section renderer or print iframe helper from
    `printLabels.js`, only when a print product change needs it;
  - additional presentational sections from `LabelPrintModal.jsx`, only when a
    batch/print workflow change needs it;
  - miss-query telemetry or recent-ops event rendering from
    `PilotDashboardSidebar.jsx`, only when admin work resumes;
  - storage-domain splits from `backend/pilot_store.py`.

Done means:

- At least one low-risk extraction lands with tests or unchanged existing tests.
  This criterion is currently satisfied by the completed bounded extraction
  slices; future maintainability work should now be justified by the next
  product slice rather than done for line count alone.
- The extracted boundary makes the batch/admin/data-quality workflow easier to
  change, not just smaller by line count.

## Non-Goals

- No fourth public label output.
- No new label-stock family unless real pilot evidence requires it.
- No broad visual redesign.
- No runtime LLM write path into the public dictionary.
- No bulk dictionary replacement.
- No paid external data/API dependency without a separate decision.
- No real-printer completion claim while physical print validation remains
  deferred.
- No large admin back-office product.
- No brand or monetization experiment inside safety-critical label content.

## Acceptance Criteria

This target is complete only when all applicable criteria are satisfied:

- A representative 50-100 item batch can complete lookup, review, export, and
  selected print handoff.
- The UI makes batch-wide state, visible filtered state, review reasons, and
  next actions clear.
- Multiple-GHS confirmation is visible and routable to the classification
  chooser.
- Missing names, unresolved searches, no-GHS states, and true source conflicts
  route into correction/admin review.
- Exports preserve trust/review context and remain readable.
- The three-output label model remains intact.
- At least one low-risk maintainability extraction or bounded refactor plan is
  completed.
- Current docs point to this file as the shipped/monitoring Batch-First owner
  doc.
- Relevant tests and production QA gates pass.

## Execution Metrics And Closure Record

Use this section as the measurable closure record for this target. The target
was not "add more UI." The target was a batch-first workflow where a lab user
can paste 50-100 items, know what happened, act on review items, print one of
the three approved outputs, export useful handoff data, and route data problems
into admin triage.

### Success Metrics

Batch review clarity:

- The batch summary separates input total, valid unique submitted rows,
  ignored duplicates, invalid rejected rows, found rows, unresolved lookup gaps
  (excluding upstream outages), label-ready rows, needs-review rows, selected
  rows, visible rows, and printable rows.
- Every needs-review row shows one primary reason and one next action.
- Multiple-GHS rows visibly distinguish system-suggested primary
  classification from user-confirmed classification.
- Multiple-GHS rows can route directly to the classification chooser.
- Unresolved, missing Chinese name, no-GHS, text-only GHS, source-conflict,
  upstream-error, and multiple-GHS reasons remain separate.

Batch print confidence:

- The public model stays limited to complete A4/Letter, QR small label, and
  identification small label.
- Batch print uses one chosen output and one chosen stock per handoff.
- Same-output continuation is allowed; silent stock/type switching is not.
- All required GHS pictograms and identity content remain visible across
  printable labels.
- Print preview, print button copy, blocked/recovery copy, and print handoff
  report the same output and page count.

Batch export usefulness:

- Export preview lets the user choose a clear scope: all, visible, ready,
  needs-review, or unresolved.
- The frontend ready scope now matches the backend XLSX `Ready Rows` sheet:
  found rows with GHS data and no review reasons. Rows needing review and
  unresolved rows stay in their own scopes.
- Upstream/source outage rows are treated as needs-review retry work, not as
  unresolved identity gaps. This keeps source failures out of dictionary
  cleanup queues and XLSX `Unresolved` sheets.
- Production Print QA summary output now classifies failed runs into
  upstream/source, external image or QR asset, deployment freshness, QA-runner,
  product print/layout, or unknown buckets. A scheduled QA failure should use
  this triage before turning into product work.
- Download filenames include batch scope and row count.
- XLSX `Pilot Summary` includes export scope, exported row count, total rows,
  printable rows, needs-review rows, unresolved searches, missing trusted
  Chinese names, and multiple-GHS rows.
- CSV/XLSX preserve formula-injection protection and data-trust columns.
- A lab manager can open the file and immediately know which rows are ready,
  which need review, and why.

Admin/correction triage:

- The admin triage summary shows open work items, unresolved searches,
  candidate-found rows, manual entries in review, needs-evidence work items,
  missing Chinese names, source conflicts, upstream retry/source outage counts,
  and no-GHS reports.
- Recommended focus rows include a concrete next action, not just a count.
- Candidate evidence remains review-only until an admin approves a manual
  entry or alias.
- Public lookup, labels, exports, and QR targets never consume unapproved
  generated/external candidate data.

### Shipped Execution Objective

The Batch-First Lab Pilot v1 clarity slice is shipped/monitoring:

1. Batch review UI exposes input cleanup,
   row status, review reasons, next actions, and multiple-GHS confirmation
   state without requiring users to inspect every row manually.
2. Batch export v1 makes export scope explicit in the preview,
   backend payload, filename, and XLSX pilot summary.
3. Admin triage lets maintainers see the next data-quality action
   from the dashboard summary.
4. The three-output label model stays unchanged unless a regression blocks the
   batch path.
5. Tests and docs were updated in the same slice; future work should only
   reopen this target if monitoring evidence contradicts the closure audit.

### Verification Gates

Minimum gates for this clarity slice:

- `npm test -- --runInBand ResultsTable ExportPreviewModal exportData PilotDashboardSidebar`
- `npm run test:i18n`
- `python -m pytest test_name_search.py::test_export_xlsx_includes_pilot_summary_sheet -v`
- `npm run build`
- `git diff --check`
- `npm run test:docs`

Additional gates before claiming deployed completion:

- `PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run
  qa:production-health` or the GitHub `Production Print QA` workflow's
  `PRINT_QA_EXPECTED_GIT_SHA` environment when a pushed production-facing
  frontend patch needs proof that Zeabur is serving the latest commit.
- `npm run qa:production-search-ui`
- `npm run qa:production-lab-ready-batch`
- `npm run qa:production-product`

Deploy freshness hardening added after closure:

- Vite production builds now emit `/build-info.json` with app version, git
  SHA, branch, build time, and Node version.
- `qa:production-health` reports that metadata and can fail when the deployed
  git SHA does not match the expected current commit.
- The GitHub `Production Print QA` workflow passes `github.sha` as the
  expected production SHA, so a healthy but stale Zeabur frontend is treated as
  a production reliability failure before heavier print/browser gates run.

## Future Monitoring Order

1. Keep canonical docs pointing to this file as the shipped Batch-First owner
   doc and monitoring baseline.
2. Run docs, production health, and production search/batch gates when a new
   Batch-First-adjacent patch is pushed.
3. Choose a new closeable slice only from evidence:
   - inventory-derived QA hardening when a real roster exposes paste cleanup,
     translation-quality, upstream/source, or batch triage gaps.
     Current roster-derived paste cleanup evidence: tabular spreadsheet pastes
     with a `CAS`, `CAS No.`, `Cas`, or `CAS編號` header must parse only that
     column. CAS-column values may need safe cleanup for Excel numeric-decimal
     cells such as `73183343.0` and trailing punctuation such as `7719-09-7.`,
     while formula/date errors must remain invalid. Headerless multi-column
     pastes must not rehyphenate dates, supplier IDs, item numbers, or other
     unrelated numeric cells into valid-looking CAS queries.
   - maintainability extraction only when it supports an active
     batch/admin/data/print change.
   - multiple-GHS confirmation clarity if real batch evidence shows users are
     unsure what to confirm.
   - export-scope/readability improvement if lab-manager handoff is confusing.
   - admin triage if real queue evidence shows maintainers cannot identify
     the next data-quality action quickly.
4. Implement one slice at a time in a new reviewable scope.
5. Add a progress note only when monitoring evidence changes the status.
6. Re-rank if a blocker, production QA failure, or real pilot finding changes
   the highest-value next action.

## Verification Plan

Run frontend npm commands from `frontend/`; run backend pytest commands from
`backend/`.

Minimum for docs-only changes:

- `git diff --check`
- `npm run test:docs`

For batch/review UI changes:

- `npm test -- --runInBand ResultsTable.test.js`
- `npm test -- --runInBand batchSearchInput inventoryDataQualityFixtures SearchSection ResultsTable`
- `npm run qa:production-search-ui` after deployment.

For label print changes:

- `npm run test:print-contract`
- `npm run qa:print-pdf`
- `npm run qa:production-batch-print`
- `npm run qa:production-product` when the deployed flow changes.

For export changes:

- Backend CSV/XLSX export tests in `backend/test_name_search.py`.
- Frontend export tests if export preview or scope logic changes.

For admin/correction changes:

- `python -m pytest test_candidate_discovery.py test_pilot_storage.py test_observability.py -v`
- Focused `PilotDashboardSidebar` tests if the dashboard changes.

## Current Known Risks

- The active docs were previously stale after
  `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` shipped; docs drift checks must
  now protect this active target.
- The largest frontend/backend files remain large enough to slow future work:
  `printLabels.js`, `printLabelStyles.js`, `LabelPrintModal.jsx`,
  `PilotDashboardSidebar.jsx`, `server.py`, and `pilot_store.py`.
- Current production gates prove representative flows, not every possible
  real-world batch list.
- Real inventory files can include pure numeric CAS cells, duplicates,
  Chinese `CAS編號` headers, Excel numeric-decimal CAS cells, trailing
  punctuation, formula/date errors, duplicates, checksum-bad CAS values,
  unresolved names, missing trusted Chinese names, multiple public GHS
  classifications, and transient upstream source failures. Use small
  representative fixtures for these categories instead of importing whole
  customer/lab rosters into the app.
- Physical print validation is still deferred.
- Existing seed Chinese names were LLM-generated and accepted as the current
  project baseline, but future generated/external names must remain candidates
  until approved.

## Progress Notes

- 2026-05-26: Inventory-derived batch hardening slice opened from real roster
  evidence without changing the 100-item product limit or importing full
  rosters. Batch input now treats pure numeric CAS values copied from
  spreadsheets as fixable input, also handles Chinese `CAS編號` columns,
  Excel-style decimal CAS cells, and harmless trailing punctuation, reports the
  rehyphenation count in UI and telemetry, and keeps formula/date errors,
  duplicates, and checksum failures separate. A small
  `inventoryDataQualityFixtures` regression fixture captures the representative
  roster categories: numeric CAS cleanup, Chinese headers, trailing
  punctuation, invalid spreadsheet cells, duplicates, invalid checksum,
  multiple-GHS review, missing trusted Chinese name, no-GHS data, upstream
  retry, and unresolved lookup. Production print handoff QA now labels
  PubChem/backend source outages as `source-upstream-unavailable` instead of
  collapsing them into generic print `runner-error`. The batch workflow summary
  also includes a compact review action queue so each review bucket exposes its
  next step before users print or export.
- 2026-05-25: Target opened from the post-evidence-pass re-rank. The first
  immediate cleanup is canonical-doc alignment so `continue` starts here rather
  than in the already shipped pilot evidence pass.
- 2026-05-25: Bounded maintainability extraction continued without product
  behavior changes. `LabelPrintModal.jsx` is down to 3,871 lines and
  `PilotDashboardSidebar.jsx` is down to 1,824 lines after moving pure helper
  logic and candidate evidence UI into narrower modules. Focused frontend
  tests passed for label print, pilot dashboard, and print labels.
- 2026-05-25: Bounded maintainability extraction continued again without
  product behavior changes. `printLabels.js` is down to 4,293 lines after
  moving continuation pagination and H/P statement prioritization into pure
  utilities. `PilotDashboardSidebar.jsx` is down to 1,789 lines after moving
  repeated curation status summaries into a shared primitive. Focused
  `printLabels` and `PilotDashboardSidebar` tests passed.
- 2026-05-25: Bounded maintainability extraction continued without product
  behavior changes. Print stylesheet and preview stylesheet generation now live
  in `printLabelStyles.js`, reducing `printLabels.js` to 2,501 lines while
  keeping the print renderer, document model, and print lifecycle in the
  original orchestrator. Focused `printLabels` tests passed.
- 2026-05-25: Bounded maintainability extraction continued again without
  product behavior changes. Saved print presets and recent print queue controls
  now live in `components/label-print/SavedPrintControls.jsx`, reducing
  `LabelPrintModal.jsx` to 3,755 lines while keeping print planning and
  preview orchestration in the modal. Focused `LabelPrintModal` tests passed.
- 2026-05-25: Bounded maintainability extraction continued again without
  product behavior changes. Static label-print option definitions now live in
  `components/label-print/labelPrintModalOptions.js`, reducing
  `LabelPrintModal.jsx` to 3,648 lines. Focused `LabelPrintModal` tests
  passed.
- 2026-05-25: Bounded maintainability extraction continued again without
  product behavior changes. Config button grid and stock-choice card UI now
  live in `components/label-print/LabelPrintConfigControls.jsx`, reducing
  `LabelPrintModal.jsx` to 3,566 lines. Focused `LabelPrintModal` tests
  passed.
- 2026-05-25: Bounded maintainability extraction continued again without
  product behavior changes. Responsible-profile controls now live in
  `components/label-print/ResponsibleProfileControls.jsx`, reducing
  `LabelPrintModal.jsx` to 3,472 lines. Focused `LabelPrintModal` tests
  passed.
- 2026-05-25: Bounded maintainability extraction continued again without API
  behavior changes. Backend payload schemas now live in `backend/api_models.py`
  and bounded validation helpers/constants now live in `backend/api_validation.py`,
  reducing `backend/server.py` to 2,074 lines while re-exporting existing
  model/constant names for compatibility. Backend compile and full backend
  pytest passed.
- 2026-05-25: Bounded maintainability extraction continued again without API
  behavior changes. Pilot/admin ops, dictionary curation, correction intake,
  miss-query retention/resolution, and workspace-document routes now live in
  `backend/pilot_admin_routes.py`, reducing `backend/server.py` to 1,613 lines
  while preserving shared admin verification, limiter setup, cache state, and
  public search/export routes in the main server orchestrator. Backend route
  compile and `test_name_search.py` passed.
- 2026-05-25: Bounded maintainability extraction continued again without admin
  behavior changes. Manual-entry, alias, and reference-link add forms now live
  in `components/pilot/PilotDictionaryForms.jsx`, reducing
  `PilotDashboardSidebar.jsx` to 1,563 lines while keeping state ownership and
  save handlers in the sidebar. Focused `PilotDashboardSidebar` tests and docs
  drift checks passed.
- 2026-05-25: Bounded maintainability extraction continued again without admin
  behavior changes. Recent alias, manual-entry, and reference-link review lists
  now live in `components/pilot/PilotRecentCurationLists.jsx`, reducing
  `PilotDashboardSidebar.jsx` to 1,385 lines while preserving existing row test
  ids and decision handlers. Focused `PilotDashboardSidebar` tests passed.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Advanced print options now live in
  `components/label-print/LabelAdvancedPrintOptions.jsx`, reducing
  `LabelPrintModal.jsx` to 3,047 lines while keeping template, density,
  calibration, custom-field, saved-template, and recent-print handlers wired
  through the modal. Focused `LabelPrintModal` tests, docs drift, diff check,
  and frontend build passed.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Recommended-output and print-outcome summaries now live in
  `components/label-print/LabelPrintOutcomeSections.jsx`, reducing
  `LabelPrintModal.jsx` to 2,926 lines while preserving readiness tone,
  profile-blocked actions, and supplemental-label routing. Focused
  `LabelPrintModal` tests, docs drift, diff check, and frontend build passed.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. The real print-fragment preview panel now lives in
  `components/label-print/LabelPreviewSection.jsx`, reducing
  `LabelPrintModal.jsx` to 2,868 lines while keeping preview pagination,
  Fit/Inspect zoom, iframe rendering, and preview metadata wired through the
  modal.
- 2026-05-25: Bounded maintainability extraction continued again without batch
  behavior changes. Fixed-stock batch fit reporting, representative preview
  selection, compact-fallback inclusion controls, and batch review/export list
  rendering now live in `components/label-print/BatchFitReport.jsx`, reducing
  `LabelPrintModal.jsx` to 2,614 lines while preserving the existing
  `LabelPrintModal` batch tests.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. The public three-output selector now lives in
  `components/label-print/LabelOutputSelector.jsx`, reducing
  `LabelPrintModal.jsx` to 2,554 lines while preserving existing output-selector
  test ids and selection behavior.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Output-plan details, recovery route, decision summary, and
  embedded batch fit report now live in
  `components/label-print/PrintOutputPlanDetails.jsx`, reducing
  `LabelPrintModal.jsx` to 2,476 lines while preserving existing plan,
  recovery, decision, and batch-fit test ids.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Selected-stock summary, first-level stock picker, and
  secondary stock controls now live in
  `components/label-print/StockSizeSelector.jsx`, reducing
  `LabelPrintModal.jsx` to 2,395 lines while preserving existing stock summary
  and picker test ids.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Preview output checks, preview checklist, hint panel, and
  sheet-layout preview details now live in
  `components/label-print/PreviewDiagnosticsPanel.jsx`, reducing
  `LabelPrintModal.jsx` to 2,248 lines while preserving preview diagnostics,
  required-output checklist, and sheet-preview test ids.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. The live preview panel shell now lives in
  `components/label-print/LabelPreviewPanel.jsx`, and selected-label
  quantity/removal controls now live in
  `components/label-print/SelectedLabelsControls.jsx`, reducing
  `LabelPrintModal.jsx` to 1,865 lines while preserving focused modal tests.
- 2026-05-25: Bounded maintainability extraction continued again without modal
  behavior changes. Multiple-GHS print warning UI and the sticky modal footer
  now live in `components/label-print/MultipleGhsPrintWarning.jsx` and
  `components/label-print/LabelPrintFooter.jsx`, reducing
  `LabelPrintModal.jsx` to 1,750 lines while preserving focused modal and
  print-all integration tests.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Print lifecycle metadata, layout-blocked alert text, and
  QA handoff pending/blocked/ready status publishing now live in
  `utils/printLifecycle.js`, reducing `printLabels.js` to 2,287 lines while
  preserving print contract tests and QA handoff behavior.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Compact pictogram pagination, print-template
  normalization, localized statement/signal text, identity density, and
  renderer text truncation helpers now live in `utils/printRenderHelpers.js`,
  reducing `printLabels.js` to 2,134 lines while preserving focused print
  renderer and print QA tests.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Required GHS pictogram/QR image load preflight, timeout
  handling, and required-image issue creation now live in
  `utils/printImagePreflight.js`, keeping required-image reliability separate
  from the print HTML orchestrator while preserving focused print-label tests.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Print document escaping, QR/lookup URL helpers, label
  class/data-attribute helpers, auto-fit level resolution, lab-profile fallback
  resolution, and render model resolution now live in
  `utils/printDocumentLayoutHelpers.js`, reducing `printLabels.js` to 1,472
  lines while preserving focused print-label tests.
- 2026-05-25: Bounded maintainability extraction continued again without print
  behavior changes. Preview-only print stylesheet sizing, scale, viewport, and
  inspection mode CSS now live in `utils/printPreviewStyles.js`, reducing
  `printLabelStyles.js` to 1,847 lines while preserving focused print-label
  tests.
- 2026-05-25: Bounded maintainability extraction continued again without admin
  behavior changes. Converted correction candidates, top correction-request
  review, and recent correction-request rendering now live in
  `components/pilot/PilotCorrectionRequestSections.jsx`, reducing
  `PilotDashboardSidebar.jsx` to 1,076 lines while preserving focused pilot
  dashboard tests.
- 2026-05-25: Documentation audit refreshed the active owner doc after the
  latest extraction slices. Completed pagination, statement-priority,
  stylesheet, print-lifecycle, required-image-preflight, advanced-control,
  outcome-summary, output-plan, stock-size selector, selected-label controls,
  preview-panel,
  preview-diagnostics, print document layout/model helpers,
  correction-request sections, backend-schema, and dictionary-form boundaries are now
  treated as shipped baseline rather than remaining candidate work.
  Remaining maintainability work should be pulled by a concrete batch, print,
  data-governance, or admin change.
- 2026-05-25: Repository hygiene/code-splitting pass kept the active batch
  target but made the current worktree reviewable by scope. The app shell now
  lazy-loads result, detail, export, prepared, print, sidebar, and admin
  surfaces; `npm run build` no longer emits the 500 kB chunk warning. Resume
  product work from the five batch-first workstreams after this maintenance
  pass is committed. If work continues before commit, keep it limited to
  verification or review-scope cleanup so the current diff stays auditable.
- 2026-05-25: Batch-first clarity slice started. Result rows now expose
  batch-input cleanup counts, review primary reason, row-level next action,
  and multiple-GHS confirmation state. Export preview now supports explicit
  export scopes, scope-aware payloads/filenames, and XLSX pilot-summary scope
  rows. Admin triage now includes candidate-found, manual-review,
  needs-evidence, and no-GHS attention cards plus concrete next-action copy.
  Focused frontend tests, full frontend tests, backend tests, i18n parity,
  production build, docs drift, Python compile, and diff checks passed locally.
  The slice was committed as `20b5745`, pushed to `main`, deployed on Zeabur,
  and production health, bundle, search UI, lab-ready batch, and product QA
  gates passed.
- 2026-05-25: Batch output/export closure shipped. `5195b3a` aligned the print
  modal, print button, and backend export workbook around one fixed-stock
  batch handoff contract: selected items, physical labels, physical pages,
  stock/purpose, shared CSV/XLSX trust rows, and XLSX ready/review/unresolved
  triage sheets. `5d51401` fixed the production batch QA ordering so the gate
  asserts the handoff contract after the required lab/supplier profile is
  present. CI passed, Zeabur production refreshed, and production health,
  batch-print, and product QA passed. The remaining step is a final
  owner-doc closure audit, not another handoff/export implementation slice.
- 2026-05-26: Final closure audit moved this target to
  `Shipped / Monitoring`. The audit patched two small evidence gaps instead of
  expanding scope: export payloads now carry original batch total and visible
  row counts into XLSX `Pilot Summary`, and admin triage shows open
  corrections plus stale telemetry as first-level cards. Focused
  `ExportPreviewModal`, `exportData`, `PilotDashboardSidebar`, backend export,
  and pilot-storage tests passed. Remaining work is monitoring and future
  evidence-driven slices, not an unfinished Batch-First implementation item.
