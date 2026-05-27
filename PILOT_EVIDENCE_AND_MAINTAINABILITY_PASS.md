# Pilot Evidence And Maintainability Pass

Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first. This document is the short-term
owner doc after `PILOT_OPERATIONS_READY_PLAN.md` shipped. It exists so the
next work does not drift into more open-ended print polish or unrelated feature
addition.

## Status

Status: `Shipped`

Target: use the shipped pilot baseline to check whether real pilot operation is
smooth enough, then make the next maintenance boundaries explicit.

This is not a new product surface. It is an evidence and maintainability pass:

- Gather representative evidence for batch lookup, batch print, export, and
  correction flow.
- Decide whether admin/report triage is enough for the next pilot round.
- Decide whether batch exports are useful to a lab manager.
- Define the next data-quality work without weakening review-only candidate
  boundaries.
- Mark historical roadmaps so future work starts from the current canonical
  docs.
- Identify safe refactor boundaries for the largest files without starting a
  risky rewrite.

## Why This Is The Right Short-Term Target

The 95% Lab-Ready Pilot and Pilot Operations Ready milestones are shipped. The
project now has enough functionality and enough QA gates that the main risk is
no longer "can the app do anything useful?" The main risk is whether real pilot
usage produces clear maintenance decisions instead of another chat-driven list
of screenshots and one-off fixes.

This target deliberately combines product evidence and maintainability because
the next few changes will be cheaper and safer if the team first knows:

- which user jobs still produce friction;
- which data issues repeat;
- which export/print states are actually confusing;
- which old docs should no longer steer new work;
- which large modules need boundaries before the next feature lands.

## Scope

### 1. Pilot Evidence Check

Run a representative pass through the current shipped pilot baseline:

- Batch lookup: messy multi-CAS paste, duplicate/invalid handling, review
  reason visibility.
- Batch print: fixed-stock output planning, complete-label handoff, multiple
  GHS pre-handoff warning, continuation behavior.
- Export: CSV/XLSX trust/review columns and XLSX `Pilot Summary`.
- Correction flow: missing Chinese name, multiple GHS/source review, no-GHS,
  and unresolved-search paths.
- Admin triage: whether `pilotTriage` and dashboard summary tell a maintainer
  what to handle next.

Acceptance:

- Evidence is recorded in this file, not only in chat.
- Any gap is classified as data-quality, export usability, admin/reporting,
  low-noise UX, print QA, production reliability, or deferred physical print.

### 2. Data Quality Next Step

Do not try to make the dictionary perfect in this target. Instead, decide what
the next data-quality slice should be after looking at actual pilot evidence.

Rules:

- Missing trusted Chinese names should enter correction/admin review.
- English-only placeholder Chinese names remain untrusted.
- Multiple GHS classifications should be visible and exportable as review
  state, not silently treated as source conflicts.
- Source conflicts should preserve SDS/supplier/local-rule authority notes.
- Unresolved searches should be eligible for review-only candidate discovery.
- Candidate discovery remains dry-run and evidence-only unless a maintainer
  explicitly approves a manual entry.

Acceptance:

- Candidate discovery is verified as review-only.
- The next data-quality recommendation is narrow and evidence-based.

### 3. Batch Export Usability

Review exports from a lab-manager perspective. The export should support
cleanup, inventory, label planning, and review handoff without feeling like a
raw engineering dump.

Check:

- Whether the user can tell the export scope.
- Whether columns are readable in the current order.
- Whether review reasons are understandable.
- Whether missing Chinese names, multiple GHS, source conflicts, and no-GHS
  states survive export clearly.
- Whether XLSX `Pilot Summary` is useful enough for the first pilot round.

Acceptance:

- The audit records whether the current export is acceptable for pilot use.
- Any change stays small: no full export system redesign in this target.

### 4. Maintainability Refactor Audit

Do not rewrite large modules in this target. Identify low-risk seams and either
record a refactor plan or complete one small safe split.

Audit targets:

- `frontend/src/utils/printLabels.js`
- `frontend/src/components/LabelPrintModal.jsx`
- `frontend/src/components/PilotDashboardSidebar.jsx`
- `backend/server.py`
- `backend/pilot_store.py`

Acceptance:

- Each large file has a next safe extraction direction.
- Any near-term refactor is small enough to preserve current test coverage.

### 5. Documentation Cleanup

Prevent older planning documents from competing with the current product
direction.

Canonical current entry points remain:

1. `PROJECT_STATUS_AND_NEXT_PLAN.md`
2. `NEXT_PRODUCT_WORK.md`
3. `POST_95_REPRIORITIZATION.md`
4. `PILOT_OPERATIONS_READY_PLAN.md`
5. `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` for the shipped/monitoring Batch-First
   owner doc after this evidence pass.
6. This document as shipped evidence for the next target.

Historical or supporting documents should say when they are historical,
superseded, or supporting-only.

Acceptance:

- Old roadmap documents no longer look like the active queue.
- `npm run test:docs` checks that this owner doc stays discoverable.

## Non-Goals

- No real printer, paper, stock, or QR scan validation. Keep that in
  `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.
- No new label sizes.
- No full UI redesign.
- No runtime LLM or external-source writes into public dictionary data.
- No large admin back-office product.
- No brand, monetization, or conversion redesign.
- No large print renderer rewrite.

## Completion Evidence

Record evidence here before marking this target shipped.

### Pilot Evidence Summary

Status: `Verified on 2026-05-25`

Evidence:

- `PRODUCTION_HEALTH_EXPECTED_ASSET_TEXT=pilot-triage-panel npm run
  qa:production-health`
  - Passed.
  - Frontend HTML and asset returned HTTP 200.
  - The deployed asset still contains `pilot-triage-panel`, so the admin
    triage implementation is present in production.
  - Backend `/api/health` returned `healthy`, version `1.10.0`.
- `npm run qa:production-search-ui`
  - Passed.
  - Covered single search for hydrochloric acid, expanded classifications,
    Detail comparison, keyboard containment, mobile read-first layout,
    no-GHS state, no-GHS correction links, missing-Chinese-name correction
    link, messy batch paste normalization, and QR `?cas=` return-path
    hydration.
  - Batch input fixture produced `5 valid unique CAS value(s) ready from 7
    pasted item(s)`, with duplicate and invalid diagnostics visible before
    search handoff.
- `npm run qa:production-lab-ready-batch`
  - Passed against the current lab-ready fixture.
  - Fixture: 90 pasted items, 81 unique raw CAS-like entries, 9 duplicates, 1
    invalid-like value (`344-04-07`).
  - UI handoff: 80 valid unique CAS values submitted, 80/80 found, 76
    label-ready, 20 needs-review.
  - Review reasons: 4 no-GHS gaps and 16 multiple-GHS primary-confirmation
    items.
  - Export preview was available with 20 columns, including Data State,
    Printable, Needs Review, Review Reasons, Primary Source, Report Count,
    Reference Links, Source Conflict, Missing Trusted Chinese Name, Multiple
    GHS Status, and Classification Selection.
  - Print handoff was ready for complete-primary A4 output with 76 total labels
    and 76 total pages.
- `python -m pytest test_candidate_discovery.py test_pilot_storage.py
  test_observability.py -v`
  - Passed: 20 tests.
  - Confirms candidate discovery remains review-only, manual entries stay out
    of public lookup until approved, correction storage/reporting works, and
    observability exposes pilot counters.
- `python -m pytest test_name_search.py -k "export_xlsx_includes_pilot_summary_sheet
  or export_csv_includes_data_trust_columns or
  export_xlsx_includes_data_trust_columns" -v`
  - Passed: 3 tests.
  - Confirms backend CSV/XLSX exports preserve trust columns and XLSX includes
    the `Pilot Summary` sheet.
- `python scripts/discover_candidates.py --query Aniline --sources local`
  - Passed.
  - Dry-run result found CAS `62-53-3` and Chinese-name candidate `苯胺`.
  - Output included `dryRun: true`, `reviewRequired: true`,
    `approved_for_public_use: false`, and `publicDataChanged: false`.

Conclusion:

- The shipped pilot baseline is usable for another controlled pilot round.
- The strongest recurring pilot-review signal in the lab-ready fixture is not
  missing Chinese names; it is multiple-GHS primary confirmation plus a smaller
  no-GHS set.
- Correction paths and missing-Chinese-name handling exist and are covered, but
  the next data-quality work should start from real queue evidence rather than
  bulk dictionary expansion.
- Production evidence supports continuing with pilot observation rather than
  reopening broad print-output work.

### Data Quality Recommendation

Status: `Recorded`

Recommendation:

- Keep the public data boundary unchanged: external, LLM, Wikidata, PubChem
  synonym, or scientific-skill results remain candidates until admin approval.
- Use the pilot queue to decide the next data-quality slice. Do not bulk
  rewrite the seed dictionary during this pass.
- If no real pilot queue exists yet, the most evidence-backed next data-quality
  slice is multiple-GHS review clarity because the lab-ready production fixture
  produced 16 items requiring primary confirmation.
- The second candidate slice is no-GHS/unresolved-search review because the
  same fixture produced 4 no-GHS gaps, and candidate discovery already supports
  safe dry-run lookup for unresolved or missing-name cases.
- Missing trusted Chinese names remain important, but should be handled through
  correction/admin queue examples and review-only candidate bundles rather than
  automatic public writes.

### Batch Export Usability Conclusion

Status: `Recorded`

Conclusion:

- Current CSV/XLSX export is acceptable for the next pilot round.
- The production export preview exposes the needed pilot fields: scope,
  found/exportable row count, review state, review reasons, source evidence,
  missing trusted Chinese name, multiple-GHS status, and classification
  selection.
- Backend tests prove the same trust columns and XLSX `Pilot Summary` sheet are
  present server-side.
- Do not add split sheets or more export modes yet. The next export change
  should wait for pilot evidence that a lab manager cannot interpret the
  current preview/workbook.
- Likely future narrow improvements, if pilot evidence calls for them:
  clearer filename/scope naming, optional "review-needed only" export, or
  separate workbook sheets for ready/review/unresolved rows.

### Maintainability Refactor Plan

Status: `Bounded extraction slices shipped`

Record:

- Large-file line counts after the bounded extraction slices on 2026-05-25:
  - `frontend/src/utils/printLabels.js`: 1,472 lines.
  - `frontend/src/utils/printDocumentLayoutHelpers.js`: 483 lines.
  - `frontend/src/utils/printImagePreflight.js`: 80 lines.
  - `frontend/src/utils/printRenderHelpers.js`: 148 lines.
  - `frontend/src/utils/printLifecycle.js`: 239 lines.
  - `frontend/src/utils/printLabelStyles.js`: 1,847 lines.
  - `frontend/src/utils/printPreviewStyles.js`: 164 lines.
  - `frontend/src/components/LabelPrintModal.jsx`: 1,750 lines.
  - `frontend/src/components/label-print/LabelPrintFooter.jsx`: 49 lines.
  - `frontend/src/components/label-print/MultipleGhsPrintWarning.jsx`: 56 lines.
  - `frontend/src/components/label-print/LabelPreviewPanel.jsx`: 235 lines.
  - `frontend/src/components/label-print/SelectedLabelsControls.jsx`: 245 lines.
  - `frontend/src/components/label-print/PreviewDiagnosticsPanel.jsx`: 168 lines.
  - `frontend/src/components/label-print/StockSizeSelector.jsx`: 104 lines.
  - `frontend/src/components/label-print/PrintOutputPlanDetails.jsx`: 129 lines.
  - `frontend/src/components/label-print/LabelOutputSelector.jsx`: 72 lines.
  - `frontend/src/components/label-print/BatchFitReport.jsx`: 291 lines.
  - `frontend/src/components/label-print/LabelAdvancedPrintOptions.jsx`: 411 lines.
  - `frontend/src/components/label-print/LabelPrintOutcomeSections.jsx`: 179 lines.
  - `frontend/src/components/label-print/LabelPreviewSection.jsx`: 162 lines.
  - `frontend/src/components/label-print/labelPrintModalOptions.js`: 113 lines.
  - `frontend/src/components/label-print/LabelPrintConfigControls.jsx`: 115 lines.
  - `frontend/src/components/label-print/ResponsibleProfileControls.jsx`: 120 lines.
  - `frontend/src/components/label-print/SavedPrintControls.jsx`: 237 lines.
  - `frontend/src/components/PilotDashboardSidebar.jsx`: 1,076 lines.
  - `frontend/src/components/pilot/PilotDictionaryForms.jsx`: 306 lines.
  - `frontend/src/components/pilot/PilotRecentCurationLists.jsx`: 280 lines.
  - `frontend/src/components/pilot/PilotCorrectionRequestSections.jsx`: 330 lines.
  - `backend/server.py`: 1,613 lines.
  - `backend/pilot_admin_routes.py`: 281 lines.
  - `backend/api_models.py`: 363 lines.
  - `backend/api_validation.py`: 229 lines.
  - `backend/export_helpers.py`: 204 lines.
  - `backend/pilot_store.py`: 1,639 lines.
- Extracted boundaries now in place:
  - `frontend/src/components/pilot/PilotTriagePanel.jsx` and
    `PilotDashboardPrimitives.jsx` hold the admin triage summary UI.
  - `frontend/src/components/label-print/labelPrintModalHelpers.js` holds
    print-modal labels, stock grouping, preview sizing, tone classes, display
    name resolution, hazard preview, risk summaries, responsible-profile
    helpers, density labels, and CSV review export helpers.
  - `frontend/src/components/label-print/labelPrintModalOptions.js` holds
    static template, size, orientation, color, and print-target option
    definitions.
  - `frontend/src/utils/printDocumentLayoutHelpers.js` holds print document
    escaping, QR/lookup URL helpers, label class/data-attribute helpers,
    auto-fit level resolution, lab-profile fallback resolution, and render
    model resolution.
  - `frontend/src/utils/printPreviewStyles.js` holds preview-only print
    stylesheet sizing, scale, viewport, and inspection mode CSS.
  - `frontend/src/components/label-print/LabelPrintConfigControls.jsx` holds
    reusable config button and stock-choice card UI.
  - `frontend/src/components/label-print/StockSizeSelector.jsx` holds selected
    stock summary, first-level stock picker, and secondary stock controls.
  - `frontend/src/components/label-print/ResponsibleProfileControls.jsx` holds
    responsible-profile completion and form controls.
  - `frontend/src/components/label-print/SavedPrintControls.jsx` holds saved
    print preset and recent print queue controls.
  - `frontend/src/components/label-print/LabelAdvancedPrintOptions.jsx` holds
    advanced template, density, stock calibration, custom-field,
    saved-template, and recent-print controls.
  - `frontend/src/components/label-print/LabelPrintOutcomeSections.jsx` holds
    recommended-output and print-outcome readiness summaries.
  - `frontend/src/components/label-print/PrintOutputPlanDetails.jsx` holds the
    output-plan explanation, recovery route, decision summary, and embedded
    batch fit report.
  - `frontend/src/components/label-print/LabelOutputSelector.jsx` holds the
    three-output public label selector cards and selected stock chip.
  - `frontend/src/components/label-print/BatchFitReport.jsx` holds fixed-stock
    batch fit reporting, representative preview selection, compact-fallback
    inclusion controls, and batch review/export list rendering.
  - `frontend/src/components/label-print/LabelPreviewSection.jsx` holds the
    print-fragment preview panel, preview page controls, Fit/Inspect zoom
    controls, iframe rendering, and inspection metadata strip.
  - `frontend/src/components/label-print/LabelPreviewPanel.jsx` holds the live
    preview panel shell, context strip, outcome summary, warning banner, and
    diagnostics composition.
  - `frontend/src/components/label-print/SelectedLabelsControls.jsx` holds the
    selected-label list, quantity controls, prepared-solution metadata, and
    selected-item removal action.
  - `frontend/src/components/label-print/PreviewDiagnosticsPanel.jsx` holds
    preview output checks, the preview checklist, hint panel, and sheet-layout
    preview details.
  - `frontend/src/components/label-print/LabelPrintFooter.jsx` holds the
    sticky print/upgrade/cancel action bar.
  - `frontend/src/components/label-print/MultipleGhsPrintWarning.jsx` holds
    the multiple-GHS version warning shown before print handoff.
  - `frontend/src/utils/printLayoutInspection.js` holds rendered print
    overflow inspection.
  - `frontend/src/components/pilot/CorrectionCandidateEvidence.jsx` holds the
    candidate evidence review card and manual-entry conversion action.
  - `frontend/src/components/pilot/pilotDashboardHelpers.js` holds curation
    status option lists, timestamp resolution, and newest-first sorting.
  - `frontend/src/components/pilot/PilotDashboardPrimitives.jsx` now also
    holds the reusable curation status-count summary primitive.
  - `frontend/src/components/pilot/PilotDictionaryForms.jsx` holds the manual
    entry, alias, and reference-link add forms while the sidebar keeps state
    ownership and save handlers.
  - `frontend/src/components/pilot/PilotRecentCurationLists.jsx` holds recent
    alias, manual-entry, and reference-link review lists while the sidebar keeps
    save handlers and data ownership.
  - `frontend/src/components/pilot/PilotCorrectionRequestSections.jsx` holds
    converted correction candidates, top correction-request review, and recent
    correction-request list rendering while the sidebar keeps review state and
    decision handlers.
  - `frontend/src/utils/printContinuationPagination.js` holds pure complete
    label continuation capacity checks, append logic, and compaction.
  - `frontend/src/utils/printStatementPriority.js` holds H/P statement
    prioritization scoring for print rendering.
  - `frontend/src/utils/printLabelStyles.js` holds print and preview
    stylesheet generation for print documents.
  - `frontend/src/utils/printLifecycle.js` holds print lifecycle metadata,
    layout-blocked alert text, and QA handoff/pending/blocked status publishing.
  - `frontend/src/utils/printImagePreflight.js` holds required GHS pictogram
    and QR image loading, timeout handling, and required-image issue creation.
  - `frontend/src/utils/printRenderHelpers.js` holds compact pictogram
    pagination, print-template normalization, localized statement/signal text,
    identity density, and renderer text truncation helpers.
  - `backend/export_helpers.py` holds export trust columns, spreadsheet
    injection safety, trusted Chinese-name filtering, and XLSX pilot summary
    sheet helpers.
  - `backend/api_models.py` holds Pydantic API payload and response models.
  - `backend/api_validation.py` holds bounded payload constants, CAS
    normalization, safe-reference URL checks, dictionary-miss context
    sanitization, correction candidate sanitization, and reference-link
    duplicate ranking helpers.
  - `backend/pilot_admin_routes.py` holds pilot/admin ops, dictionary,
    correction-request, miss-query retention/resolution, and workspace-document
    routes.
- Safe extraction candidates:
  - `printLabels.js`: continuation pagination, statement prioritization,
    stylesheet generation, overflow inspection, print lifecycle/QA handoff,
    required image preflight, print document layout/model helpers, and renderer
    text/identity/pictogram helpers are now split. The next safe split should
    be justified by a concrete print product change, such as a print iframe
    helper or a complete-label section renderer; avoid changing pagination
    policy without the print contract/PDF tests.
  - `LabelPrintModal.jsx`: helper/config, saved/recent-print controls, static
    options, stock/config button UI, stock-size picker, selected-label controls,
    responsible-profile controls, advanced print options, readiness outcome
    summaries, output selector, output-plan details, batch fit/report UI,
    preview shell, preview panel, and preview diagnostics are split. The next
    safe split should be driven by a concrete modal workflow change rather than
    line count alone.
  - `PilotDashboardSidebar.jsx`: triage, primitives, status helpers,
    dictionary add forms, recent curation lists, correction-request sections,
    and candidate evidence are split. The next split should target miss-query
    telemetry or recent-ops event rendering only if admin work resumes and a
    concrete dashboard change needs it.
  - `backend/server.py`: export trust/summary helpers and Pydantic
    schema/validation helpers are split. The next safe split should be admin
    dictionary/correction routes, but only with backend tests covering import
    compatibility.
  - `backend/pilot_store.py`: split by storage domain later
    (corrections/miss-query/manual entries/reference links/reports), but avoid
    schema or migration changes during the first split.
- Repository hygiene/code-splitting closure:
  - Current worktree scope is reviewable as maintainability extraction,
    backend/API boundary extraction, frontend print/admin component extraction,
    tests, and docs.
  - App-shell code splitting now keeps non-first-screen result/detail/export,
    prepared, print, and admin surfaces out of the initial Vite chunk.
  - `npm run build` emits no 500 kB chunk warning; main `index` chunk is
    246.08 kB, with print/admin/export surfaces split into separate chunks.
- Verification evidence for the shipped first slice:
  - `cd frontend; npm test -- --runInBand PilotDashboardSidebar.test.js`
  - `cd frontend; npm test -- --runInBand LabelPrintModal.test.js`
  - `cd frontend; npm test -- --runInBand printLabels.test.js`
  - `cd frontend; npm test -- --runInBand PilotDashboardSidebar.test.js LabelPrintModal.test.js printLabels.test.js`
  - `cd frontend; npm test -- --runInBand PilotDashboardSidebar.test.js`
  - `cd frontend; npm run build`
  - `cd backend; python -m py_compile server.py api_models.py api_validation.py export_helpers.py`
  - `cd backend; python -m pytest -q`

### Documentation Cleanup

Status: `Recorded`

Record:

- Active canonical references now point to this owner doc:
  - `PROJECT_STATUS_AND_NEXT_PLAN.md`
  - `NEXT_PRODUCT_WORK.md`
  - `POST_95_REPRIORITIZATION.md`
  - `README.md`
  - `CLAUDE.md`
  - `AGENTS.md`
  - `AUTONOMOUS_WORKFLOW.md`
- Historical/supporting notices were added to:
  - `DESIGN.md`
  - `REDESIGN_ROADMAP.md`
  - `V1_8_REAL_WORLD_ROADMAP.md`
  - `PRINT_NINE_SEGMENT_COMPLETION.md`
  - `NEXT_PRINT_WORKSTREAMS.md`
  - `PRINT_ACCEPTANCE_STANDARD.md`
  - `PRINT_BROWSER_QA_CHECKLIST.md`
  - `PRINT_OUTPUT_REFACTOR_PLAN.md`
- `frontend/scripts/check-docs-drift.mjs` now requires this owner doc and its
  main sections. After the next-target update it also requires
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` as the Batch-First owner doc.

## Verification Plan

Minimum closure checks:

- `git diff --check`
- `npm run test:docs`

If code changes:

- Run the narrow affected frontend/backend tests.
- If deployed behavior changes, run the relevant production gate.

Suggested evidence commands for this target:

- `npm run qa:production-health`
- `npm run qa:production-search-ui`
- `npm run qa:production-lab-ready-batch`
- `python -m pytest test_candidate_discovery.py test_pilot_storage.py test_observability.py -v`
- `python -m pytest test_name_search.py -k "export_xlsx_includes_pilot_summary_sheet or export_csv_includes_data_trust_columns or export_xlsx_includes_data_trust_columns" -v`

## Completion Audit

Status: `Shipped`

Evidence:

- Owner doc exists and records the target scope, non-goals, evidence, and
  closure criteria.
- `NEXT_PRODUCT_WORK.md` now uses this target as shipped evidence and points to
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` as the active slice.
- Pilot evidence is recorded from production health, production search UI, and
  production lab-ready batch gates.
- Admin/report and candidate-discovery evidence is backed by focused backend
  tests and a dry-run candidate discovery command.
- Batch export usability has a recorded conclusion backed by production export
  preview evidence and backend CSV/XLSX tests.
- Maintainability boundaries are recorded for the largest frontend/backend
  files, with a first safe extraction recommendation.
- Historical/supporting notices were added to older roadmap and print-planning
  files that could otherwise compete with the current queue.
- `git diff --check` passed.
- `npm run test:docs` passed.

Remaining work after this target:

- Do not reopen this pass unless new pilot evidence contradicts the current
  conclusion.
- The next active slice should be chosen from actual pilot queue evidence. If
  there is still no real pilot queue, the narrowest next slice is likely either
  `PilotTriagePanel` extraction or a data-quality review pass focused on
  multiple-GHS confirmation clarity.
