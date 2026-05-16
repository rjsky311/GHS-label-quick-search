# Batch Label Print Refactor Plan

This document is the canonical plan for turning batch label printing into a
first-class workflow. It is a product and engineering plan, not legal advice.
Final label use still requires SDS, supplier-label, workplace-policy, and local
regulation review.

Start here before changing batch search-to-print behavior, "Print all with GHS
data", multi-selected `LabelPrintModal` behavior, print planning for more than
one chemical, batch preview, batch print QA, or fixed-stock label workflows.

Cross-reference this file with:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` for priority and done criteria.
- `PRINT_LABEL_CONTRACT.md` for safety boundaries that remain non-negotiable.
- `PRINT_ACCEPTANCE_STANDARD.md` for print output acceptance rules.
- `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md` for non-physical-print tracking
  while real-printer validation is deferred.
- `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` for no-GHS, text-only GHS,
  upstream-error, source-conflict, SDS/reference, and telemetry boundaries.
- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` for later real-printer evidence.

## Current Implementation Status

Status as of 2026-05-16:

- Phase 1 has started: `frontend/src/utils/testFixtures/batchPrintFixtures.js`
  provides a reusable 50-item mixed fixture.
- Phase 2 has started: `frontend/src/utils/printBatchPlanner.js` provides the
  first pure `buildBatchPrintPlan` implementation for purpose-first,
  fixed-stock batch classification.
- `frontend/src/utils/__tests__/printBatchPlanner.test.js` verifies Quick ID,
  Supplemental, and Complete batch planning against the 50-item fixture.
- Phase 3 has started: `LabelPrintModal` now shows a batch fit report for
  multi-item selections, lets users switch representative previews
  (`first`, `worst-fit`, `longest-name`, `most-pictograms`, `densest-text`,
  and excluded when present), keeps the sheet preview aligned to the default
  ready print scope, and exposes a review/excluded list with CSV export before
  handoff.
- Batch print handoff now defaults to the ready scope but lets users explicitly
  include `reduced-purpose` or `same-stock-continuation` items after
  acknowledgement. The sheet preview follows the current selected print scope.
- `npm run test:print-contract` now includes the batch planner test.
- The renderer can now carry per-label batch metadata and per-label layout
  overrides, so a fixed-stock batch can mix ready labels with acknowledged
  reduced-purpose labels while keeping one physical stock. Same-stock
  continuation labels are also materialized for print after acknowledgement.
- Phase 5 has started: `npm run qa:production-batch-print` opens the deployed
  app, performs a fixed-stock batch search, opens the label-print modal,
  verifies the batch fit report, switches the worst-fit representative preview,
  checks the ready-batch print action, exercises an acknowledged
  reduced/continuation scope when available, and writes
  `build/production-batch-print-report.json` plus a modal screenshot.
- `qa:production-batch-print` is now part of `qa:production-product` and the
  production QA summary includes a `fixed-stock-batch-printing` block.
  Deployed 50-item batch evidence must still be captured after this slice is
  pushed and deployed.

## 1. Problem Statement

The current print workflow is strongest for one selected chemical or a small
representative matrix of individual print cases. It does not yet treat "search
or load 30-100 chemicals, choose one physical label stock, and print the batch"
as a first-class task.

That gap matters because a real lab or operations user usually thinks:

- "I have this roll/sheet loaded right now."
- "I need this set of bottles/tubes/rack positions labeled consistently."
- "The original manufacturer label may already exist, so I may only need an
  internal identifier or supplemental hazard cue."
- "Tell me which items can print on this stock, which need a reduced purpose,
  and which must be excluded."

The current system can be safety-conservative but still frustrating. If one
dense chemical in a 50-item set cannot fit as a complete primary label, the app
can over-recommend A4/Letter or block the workflow instead of helping the user
print a truthful fixed-stock batch.

## 2. Product Premise

Batch printing must be **fixed-stock first**.

Users should choose the physical stock or roll once for the batch. The app must
not silently split the batch across different paper sizes or label rolls. A4 or
Letter can be recommended as an alternate complete-primary path, but that is a
user decision, not an automatic mixed-stock job.

Batch printing must also be **purpose-first**.

Not every label is trying to be a complete shipped-container label. Some labels
are quick internal identifiers because the purchased container already has the
supplier label. Some labels are supplemental. Some labels genuinely need full
complete-primary content.

The UI, planner, renderer, and QA gates must therefore evaluate:

1. The selected batch purpose.
2. The selected fixed physical stock.
3. Each chemical's actual hazard data and layout pressure.
4. Whether the chosen purpose can be printed truthfully for each item.

## 3. Target Users And Jobs

Primary users:

- Lab staff labeling transfer bottles, sample tubes, reagent racks, or prepared
  solutions.
- Safety-adjacent operators who need quick, repeatable label output without
  becoming layout experts.
- Maintainers/admins preparing a curated list of common chemicals for routine
  labeling.

Core jobs:

- Print quick identifiers for many existing chemical containers that already
  have original labels.
- Print supplemental labels for internal handling, storage, QR/SDS lookup, or
  batch/case tracking.
- Print complete primary labels only when that is the selected purpose and the
  stock can truthfully carry the required content.
- Review a batch before printing and know which items were included, reduced,
  excluded, or need attention.

## 4. Non-Goals

Do not solve these in the first batch-print refactor:

- Inventory management, stock quantity tracking, barcode inventory workflows,
  or multi-user review queues.
- Automatic mixed-stock print jobs that silently switch some chemicals to A4,
  others to tube labels, and others to QR labels.
- Real-printer evidence. Keep it deferred to
  `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`, while automated Browser/PDF gates
  prove preconditions.
- Legal determination of whether a specific workplace may use a reduced label.
  The app should describe output purpose and limitations, not certify legal
  sufficiency.

## 5. Output Purpose Modes

### Quick ID

Use when the label's job is to prevent mix-ups and support bench-side handling,
especially when the original supplier label or full SDS path already exists.

Required for each printed item:

- Product identity.
- CAS or selected case/batch identity when available.
- Signal word when available.
- Every available GHS pictogram.
- Clear workflow status that this is an identification/supplemental output, not
  a complete primary label.

Not required on the physical label body:

- Full H statements.
- Full P statements.
- Responsible party address/phone, unless configured as a required internal
  policy field.

### Supplemental

Use when the selected stock can carry more than Quick ID but cannot truthfully
carry the complete primary label.

Required for each printed item:

- Quick ID requirements.
- Priority H summaries or H codes when space allows after scaling/reflow.
- Optional QR/SDS/reference target when it fits and does not compromise
  identity or pictograms.
- Clear workflow status that complete H/P content lives in SDS, an existing
  supplier/original label, A4/Letter primary, continuation output, or another
  complete source.

### Complete Primary

Use when the selected purpose is full hazard communication for a container that
needs complete label elements.

Required for each printed item:

- Product identifier.
- CAS when available.
- Signal word when available.
- Every available GHS pictogram.
- Full H statements.
- Full P statements.
- Required responsible profile fields.
- Trust/verification boundary.

If one physical label cannot carry the content, the planner may propose a
same-stock continuation set only when the same stock can keep identity,
pictograms, and page/order information clear. Otherwise it must block that item
for the selected stock and recommend a user-approved alternate stock or output
purpose.

## 6. Fixed-Stock Batch Fit Report

The batch modal must produce a report for the selected purpose and selected
stock before enabling print.

For a 50-item batch, the report should answer:

- How many items are printable exactly as selected?
- How many items need the allowed fit level to tighten typography/layout?
- How many items can print only if downgraded within the same stock and purpose
  family, for example from Supplemental with H summaries to Quick ID?
- How many items require same-stock continuation pages?
- How many items are excluded because of no GHS data, upstream error, missing
  required profile fields, missing required images, unsafe QR/reference target,
  or critical clipping?
- Which items are the riskiest representatives: longest name, most pictograms,
  densest H/P text, most severe signal/pictogram combination, QR-heavy, and
  custom identity pressure.

Fit categories:

| Category | Meaning | Default action |
| --- | --- | --- |
| `ready` | Prints under the selected purpose/stock without critical risk. | Include. |
| `ready-tight` | Prints only after allowed typography/reflow tightening. | Include, show count. |
| `reduced-purpose` | Selected complete/supplemental content is too dense, but a truthful Quick ID or lower-content supplemental label works on the same stock. | Ask before including if it changes meaning. |
| `same-stock-continuation` | Complete content can print as multiple labels on the same stock. | Ask before including; show pages/labels count. |
| `excluded-data` | No GHS data, upstream error, unsafe target, or required data missing. | Exclude and show reason. |
| `excluded-fit` | Critical identity or pictogram content cannot fit on the selected stock. | Exclude and recommend a larger stock or different purpose. |

The report must not collapse all failures into "use A4." It may recommend A4 or
Letter as one recovery path, but the user's current fixed-stock intent remains
visible.

## 7. Batch Decision Flow

The modal should guide the user in this order:

1. Choose purpose: Quick ID, Supplemental, or Complete.
2. Choose physical stock: one stock for the batch.
3. Show fit report: counts, include/exclude policy, and representative risks.
4. Show preview mode:
   - First printable label.
   - Densest printable label.
   - Longest-name label.
   - Any same-stock continuation example.
   - Excluded list.
5. Choose print scope:
   - Print ready only.
   - Include `ready-tight`.
   - Include `reduced-purpose` after acknowledgement.
   - Include same-stock continuation after acknowledgement.
   - Export excluded list.
6. Print the fixed-stock batch.

The print action should describe exactly what will happen, for example:

- `Print 43 Quick ID labels on 70 x 24 mm stock`
- `Print 38 Supplemental labels; exclude 7; 5 require Quick ID reduction`
- `Print 12 Complete labels as 18 same-stock labels with continuation pages`

## 8. Preview Requirements

Batch preview cannot rely on the first selected chemical.

Required preview surfaces:

- First included label.
- Worst-fit included label.
- Longest identity label.
- Most pictograms label.
- Densest text label when H summaries or complete content are involved.
- Excluded-item list with reasons.
- Page/label count summary.

When the user changes purpose, stock, language, color mode, case fields, QR
setting, or profile fields, the batch fit report and representative preview
must update together.

## 9. Planner And Renderer Changes

Required planning changes:

- Add a batch planner layer above the single-label planner.
- Evaluate each chemical independently against the same selected purpose and
  stock.
- Keep the single-label planner as the source of per-chemical fit results, but
  add batch-level aggregation, include/exclude policy, and representative risk
  selection.
- Distinguish "complete cannot fit" from "this purpose does not require full
  H/P."
- Do not infer that a small label is failed when the selected purpose is Quick
  ID and identity, signal, and pictograms are readable.
- Treat case/batch, owner, location, prepared metadata, and QR as fit inputs.
- Keep no-GHS, text-only GHS, upstream-error, source-conflict, and missing-image
  states aligned with `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.

Required renderer changes:

- Print documents must support many labels without assuming they share the same
  content density.
- The same stock geometry must be applied to every included label in the job.
- Print HTML must record per-label fit status and output purpose in machine
  readable attributes for QA.
- Layout preflight must inspect every printed label, not only the first or the
  selected representative.
- Excluded items must not silently disappear; the UI should show a reviewable
  excluded list and optionally export it.

## 10. QA And Gates

The existing `multi-chemical` production print layer is not enough. It checks a
set of representative cases, but it does not prove a user can print a
fixed-stock 50-item batch.

Add these gates:

### Unit / Integration

- Batch planner produces correct category counts for a mixed 50-item fixture.
- Quick ID purpose does not require H/P text to pass.
- Supplemental purpose can reduce to H codes or Quick ID only with explicit
  status.
- Complete purpose blocks or creates same-stock continuation instead of silently
  dropping H/P.
- No-GHS and upstream-error rows are excluded with reasons.
- Text-only GHS rows remain eligible only for output purposes that can honestly
  carry their hazard text/state.
- One dense item does not block unrelated ready items.

### Renderer / PDF

- Every included label has visible identity and every available pictogram.
- The selected fixed stock is used for every included label.
- Representative previews match actual printed labels.
- Excluded items are absent from print output and present in the review list.
- Large batches do not create blank pages, clipped labels, or missing image
  failures.

### Production Browser QA

Add a deployed QA flow that:

- Performs or simulates a batch with about 50 mixed chemicals.
- Chooses one fixed stock.
- Switches between Quick ID, Supplemental, and Complete purposes.
- Verifies the fit report counts and excluded reasons.
- Opens preview representatives instead of only the first label.
- Presses print only for an allowed scope and verifies no blocking alert appears
  for truthful Quick ID/Supplemental output.

## 11. Implementation Phases

### Phase 1: Planning Contract And Fixtures

Deliverables:

- This document and cross-references.
- A reusable 50-item mixed fixture with dense, sparse, no-GHS, text-only,
  upstream-error, long-name, many-pictogram, and custom-identity examples.
- Unit tests for batch classification categories.

Done when:

- The product terms and expected categories are pinned in tests.
- Existing single-label behavior is unchanged.

### Phase 2: Batch Planner

Deliverables:

- `buildBatchPrintPlan` or equivalent.
- Per-item fit results.
- Batch counts and representative risk selection.
- Include/exclude policy model.

Done when:

- A 50-item batch can be classified without opening the modal UI.
- Tests prove one dense item cannot force the whole batch to A4 or block ready
  Quick ID/Supplemental items.

### Phase 3: Batch UI

Deliverables:

- Purpose-first batch print entry.
- Fixed-stock selection.
- Batch fit report.
- Representative preview selector.
- Excluded list with exportable reasons.

Done when:

- A user can understand what will print before pressing print.
- The print button text names the purpose, stock, included count, and excluded
  count when relevant.

### Phase 4: Renderer And Preflight

Deliverables:

- Batch print HTML with per-label purpose/status attributes. **Started**:
  labels now include print-purpose/stock/template attributes and batch
  category/preferred/effective-purpose attributes when produced from the batch
  planner.
- Preflight over every included label. **Started**: print content/layout
  preflight now respects per-label layout overrides when reduced-purpose items
  are included.
- Same-stock continuation support if selected for Complete purpose. **Started**:
  continuation items can be explicitly included, materialized, previewed, and
  handed to the print renderer on the same selected stock.

Done when:

- Browser/PDF QA catches clipped or missing labels across the whole batch.
- Quick ID and Supplemental batches remain printable when truthful.

### Phase 5: Production Gate

Deliverables:

- `qa:production-batch-print` or equivalent.
- Production summary integration.
- Documentation updates for completed behavior.

Done when:

- A deployed 50-item fixed-stock batch flow is covered by repeatable Browser QA.
- `qa:production-product` includes batch evidence before this refactor is
  considered shipped.

## 12. Acceptance Standard

This refactor is not complete until all of these are true:

- Users can choose one stock for a whole batch and keep that stock fixed.
- Users can choose Quick ID, Supplemental, or Complete purpose before fit
  judgment.
- Quick ID does not fail just because full H/P text does not fit.
- Complete output never silently omits required content.
- Dense items are isolated; they do not block unrelated printable items.
- Excluded items are visible with reasons before print.
- Preview shows representative risks, not only the first selected chemical.
- QA includes a mixed 50-item batch fixture and at least one deployed Browser
  flow.
- Existing single-label print behavior remains covered by the current print
  contract and production print gates.
