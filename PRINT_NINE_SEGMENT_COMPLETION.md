# Print Workflow Nine-Segment Completion Ledger

Historical/supporting note: this ledger records the earlier nine-segment print
productization work. It is not the active print or product queue. Start from
`PROJECT_STATUS_AND_NEXT_PLAN.md`; use `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` for
the current three-output label model and
`BATCH_FIRST_LAB_PILOT_V1_PLAN.md` for the active major target.

This ledger is the working contract for the nine print-productization segments.
It exists so print work stays tied to the user goal: users should be able to
choose a real label target, see an honest preview, and print a truthful output
without understanding layout internals.

This is a product and engineering checklist, not legal advice. Final use still
requires SDS, supplier label, and local regulation review.

## Segment 1: Task-First Label Choice

Acceptance bar:

- The first-level modal asks where the label will be used, not which CSS
  template to tune.
- Main container, bottle label, tube/vial, and QR supplement each map to a
  curated stock and template before the planner decides output status.
- Less common stock sizes remain available but are collapsed behind a secondary
  size control.

Current evidence:

- `LabelPrintModal` exposes task targets via `label-purpose-*` buttons.
- `LabelPrintModal.test.js` verifies bottle target routing, QR target routing,
  collapsed stock-size picker, and advanced sections.
- Dense `Main container` target selection applies the planner's A4/Letter
  complete-primary recommendation instead of downgrading the main target into a
  supplemental label.
- The first-level modal now starts with the task target. The planner's decision
  is shown inside that target block as an app decision, while the exact outcome
  stays with the live label preview.
- Browser QA checklist requires target switching before shipping print changes.

## Segment 2: Output Planner Over Template Picker

Acceptance bar:

- The app resolves an output plan from content, target stock, language, color,
  and profile completeness.
- Complete primary, supplemental, quick-ID, and QR supplement are distinct
  output kinds.
- Dense stock cannot pretend to be complete primary; it routes to full-page
  primary or a truthful supplemental output.

Current evidence:

- `printOutputPlanner.js` owns `PRINT_OUTPUT_KIND` and
  `PRINT_OUTPUT_PLAN_STATE`.
- `printOutputPlanner.test.js` verifies full-page routing, QR supplemental, and
  quick-ID supplemental output.
- `printAcceptanceMatrix.test.js` verifies A4, Letter, bottle, strip, QR, custom
  tiny, no-GHS, and upstream-error behavior.

## Segment 3: Physical Size Scaling Before Summaries

Acceptance bar:

- Pictogram size, QR size, text size, and visible H/P budget scale from the
  physical label dimensions.
- Small labels preserve every available pictogram before summarizing text.
- Text summaries happen only after the renderer has used scaled typography and
  layout budgets.

Current evidence:

- `labelStocks.js` derives typography and budgets from label width/height.
- `printAcceptanceMatrix.test.js` verifies pictogram sizes and H/P budgets grow
  from strip to bottle to large stock.
- Supplemental renderer tests verify all pictograms remain present on compact
  outputs.
- The compact QA matrix now includes small-rack, medium-rack, and 62 mm
  continuous outputs, with PDF artifact checks for visual overlap and
  label-boundary clipping.

## Segment 4: Complete Primary A4 And Letter

Acceptance bar:

- A4 Primary and Letter Primary are first-class complete primary outputs.
- They print product identity, CAS, signal word, all pictograms, full H/P
  statements, profile fields, and trust footer.
- QR code is not embedded in the primary body unless a future fit check proves
  it cannot compromise required layout.

Current evidence:

- A4 and Letter primary presets exist in `labelStocks.js`.
- `printAcceptanceMatrix.test.js` verifies `label-kind-complete-primary`, page
  size, all pictograms, no QR body, and no H/P summaries.
- `printLabels.test.js` verifies dense A4 primary output does not block and does
  not inject QR into the primary body.
- Full-page primary typography now emphasizes the chemical identity and uses
  larger 28 mm compliance pictograms in the A4/Letter layout.

## Segment 5: Honest Supplemental Outputs

Acceptance bar:

- Bottle, strip, and custom small outputs remain printable only as honest
  supplemental labels when they cannot carry full primary content.
- They must not claim complete-primary status.
- They must preserve product identity, CAS when available, signal word, and all
  available pictograms.

Current evidence:

- `printOutputPlanner` returns `READY_WITH_NOTICE` for supplemental paths.
- `printAcceptanceMatrix.test.js` verifies bottle, strip, custom supplemental,
  and medium-sheet fallback behavior.
- `LabelPrintModal.test.js` verifies outcome text and print action copy call out
  supplemental status.

## Segment 6: Quick-ID And QR Supplements

Acceptance bar:

- QR supplement is scan-first but still includes identity and every available
  pictogram.
- Tube/vial quick-ID is a distinct bench-side supplemental output, not QR and
  not complete primary.
- Both paths stay printable when their output is truthful.

Current evidence:

- `PRINT_OUTPUT_KIND.QR_SUPPLEMENT` and `PRINT_OUTPUT_KIND.QUICK_ID` are
  distinct planner outputs.
- `LabelPrintModal.test.js` verifies QR and quick-ID outcome/action language.
- `printAcceptanceMatrix.test.js` verifies quick-ID uses
  `label-kind-quick-id`, all pictograms, no QR, and no `more-pics`.
- Small-rack and medium-rack quick-ID/QR paths are explicit QA cases, so compact
  labels cannot rely on generic stock behavior.

## Segment 7: Source And Profile Safety Gates

Acceptance bar:

- No-GHS and upstream-error cases cannot be presented as printable hazard
  labels.
- Complete primary labels require responsible lab/supplier name, phone, and
  address.
- Supplemental/QR labels keep profile fields secondary unless they are needed
  for the selected output.

Current evidence:

- `printOutputPlanner` distinguishes missing hazard data from upstream error.
- `printAcceptanceMatrix.test.js` verifies no-GHS and upstream-error blocking.
- `LabelPrintModal.test.js` verifies responsible profile behavior and first-level
  blocking state.

## Segment 8: Preview Equals Print

Acceptance bar:

- Live preview uses the same fragment renderer as the print iframe.
- Orientation, page size, color mode, language, pictograms, and QR state must be
  visible in preview before the user prints.
- Print preflight blocks complete-primary layout clipping but does not block an
  honest supplemental label because of generic overflow heuristics.

Current evidence:

- `buildPrintPreviewDocument` and `buildPrintDocument` share the renderer in
  `printLabels.js`.
- `LabelPrintModal.test.js` verifies iframe preview source for QR, prepared
  metadata, orientation, and B/W mode.
- `printLabels.test.js` verifies complete-primary clipping is blocked while
  supplemental output is allowed.
- The modal resets preview to whole-label `Fit` mode after target/stock changes,
  and lower-level diagnostics stay collapsed below the exact label preview.

## Segment 9: Repeatable Browser And Deployment QA

Acceptance bar:

- Browser QA must click through search, selection, modal opening, target
  switching, language/color switching, and print action handoff.
- QA must prove the print action reaches the print handoff path without relying
  on the native print dialog.
- Production verification must identify the deployed asset or behavior from the
  tested commit.

Current evidence:

- `PRINT_BROWSER_QA_CHECKLIST.md` defines the Browser Use matrix.
- `qaPrintHandoff=1` builds the print iframe, runs preflight, records lifecycle
  events, and publishes `print-qa-status`.
- `printLabels.test.js` verifies QA handoff status includes label kind, unique
  pictogram codes, QR state, template, and stock preset without opening the
  native print dialog.
- `printQaMatrix.js` and `npm run qa:print-report` generate a machine-readable
  code-level report for the core HCl A4, Letter, bottle, tube/vial, and QR
  outputs, including expected handoff attributes and Fit/Inspect preview state.
- `npm run qa:print-pdf` renders generated print HTML artifacts to PDF and
  fails on missing images, pictogram-set drift, QR drift, `more-pics`, clipping,
  and compact visual-overlap regressions.
- `npm run qa:production-print` runs the combined production gate: matrix
  report, deployed click-through handoff, print HTML artifact generation, PDF
  QA, and preview screenshots.

## Done Definition

A print-workflow change is not done until:

- `npm run test:print-contract` passes.
- `npm run qa:print-report` passes when the change touches matrix-level print
  behavior, and the generated report has zero failed cases.
- `npm run qa:print-pdf` passes when the change touches print HTML, layout CSS,
  compact labels, QR supplements, or renderer geometry.
- `npm test -- --runInBand` passes.
- `npm run build` passes.
- Backend tests pass when the change touches shared workflow or deployment.
- Browser/Chrome automation has clicked through at least the affected output
  targets.
- Production or deploy-preview verification confirms the current bundle, not a
  stale build. For production print changes, `npm run qa:production-print`
  should pass after Zeabur deploys.
