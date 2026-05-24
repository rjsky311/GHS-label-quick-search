# Print Output Refactor Plan

Historical/supporting note: this file remains useful for v1.10 renderer and
fit-engine history, but it is not the active user-facing print model or live
queue. Start current planning from `PROJECT_STATUS_AND_NEXT_PLAN.md`; use
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` for current label-product decisions and
`PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` for the active short-term target.

This document is the implementation guide for the v1.10 print-workflow refactor
baseline and follow-on print changes. It turns the product decisions into a
stable plan so future work does not drift back into one-off template fixes.
Concrete ship/no-ship gates live in `PRINT_ACCEPTANCE_STANDARD.md`; use that
file as the acceptance contract before merging print changes.

Supersession note: the next user-facing print workflow should follow
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md`. This v1.10 plan remains useful for renderer
history, fit lessons, and QA coverage, but it should not be used to re-expand
the first-level UI into many purposes, stocks, H-code modes, or supplemental
categories.

Status note: this document is the single-label and representative
multi-chemical baseline. It does not define the next fixed-stock batch label
printing refactor. For batch search-to-print flows, one-stock batch planning,
purpose-first batch output, representative batch preview, excluded lists, and
50-item QA, use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.

This is a product and engineering plan, not legal advice. Final use still requires SDS, supplier label, and local regulation review.

## Why This Refactor Exists

The current print workflow has improved, but it still exposes too much layout responsibility to the user. The user can choose many stocks, templates, densities, orientation options, and adjustments, but the system does not always produce a clear answer to the real job:

> Given this chemical and this desired print size, what is the safest usable output the app can produce?

The refactor should move the product from "template picker" to "output planner."

The app should choose a printable plan, explain the plan, and keep advanced controls secondary.

## External Grounding

Use these as grounding references, not as a substitute for local legal review:

- OSHA HazCom Appendix C: shipped/container labels include product identifier, responsible party information, signal word, hazard statements, pictograms, and precautionary statements.
- OSHA label placement interpretation: signal word, hazard statements, and pictograms must be located together; all six elements do not necessarily need to be in one field of view.
- Taiwan GHS overview: hazard communication label elements include pictograms, signal words, hazard statements, precautionary information, product/chemical identifier, and supplier identifier.
- Canada WHMIS guidance is useful as an additional bilingual/supplier-label reference, especially when thinking about English-language users and North American paper/label stock patterns.

Reference URLs:

- https://www.osha.gov/hazcom/appendix-c
- https://www.osha.gov/laws-regs/standardinterpretations/2014-11-27
- https://ghs.osha.gov.tw/ENG/intro/ghsScope.aspx
- https://www.canada.ca/en/health-canada/services/environmental-workplace-health/occupational-health-safety/workplace-hazardous-materials-information-system/supplier-hazard-communication-requirements-whmis/guidance/document.html

## Product North Star

The best print path is:

1. User searches or selects a chemical.
2. User opens label printing.
3. User chooses the intended physical output, such as full-page primary, bottle label, small rack label, or custom size.
4. The app builds a recommended output plan.
5. The app previews the exact output that will print.
6. The app prints only if safety-critical content is present, readable, and not clipped.

The user should not need to understand CSS layout, statement overflow, A4 vs Letter fit behavior, or which H/P statements can fit on a small label.

## Current Implementation Status

The first refactor slice has landed:

- Added `printOutputPlanner` as the product-level planner above `printFitEngine`.
- Added Letter Primary alongside A4 Primary.
- Added curated common stocks, including 2 x 4 in, 3-1/3 x 4 in, and 62 mm continuous presets.
- Added dynamic typography and GHS pictogram sizing based on physical label dimensions.
- Added a recommended-output panel in `LabelPrintModal`.
- Moved language and color mode into first-level output controls.
- Moved custom physical size fields into Advanced, where they mark the config as custom tuning.
- Kept supplemental warnings in the modal/preview workflow while removing verbose purpose copy from compact physical labels, so scarce label area is reserved for identity, pictograms, signal word, and hazard content.
- Made `nameDisplay: both` print bilingual signal words plus H/P statement text, with non-full-page bilingual outputs treated as denser during fit checks.
- `LabelPrintModal` now auto-applies the planner's A4/Letter full-page primary recommendation for dense shipped-container labels instead of opening on a blocked stock and asking the user to recover.
- The modal first level now starts with the recommended output, A4/Letter primary size, purpose, language, and color. Readiness summary cards and the generic print-setup explainer were removed from the first screen.
- The live preview panel now shows the actual label fragment before warnings/checklists, uses the same renderer as print output, and scales full-page primary previews down so the whole label is easier to inspect.
- Full-page primary output now gives more visual weight to product identity and GHS pictograms, and the preview resets to whole-label `Fit` mode whenever users change target, stock, language, color, or template.
- Saved jobs, stock presets, template override, layout tuning, custom stock size, and custom fields are collapsed behind secondary/advanced sections.
- The first-level print modal now exposes curated physical output sizes for the current purpose. Shipped-container output shows container label stocks plus A4/Letter full-page stocks; QR/quick-ID output shows only supplemental small stocks.
- Full-page primary rendering now keeps pictograms and H/P statements in one shared body grid, uses density-tier typography before routing or continuation, and no longer overrides dense text with a fixed 9px statement size.
- Manual container-stock selection is respected. If dense content cannot fit as a complete primary label on a bottle/container stock, the modal keeps that physical stock selected and switches the output to a printable supplemental/standard label instead of silently bouncing back to A4 or Letter.
- Phase 3 modal simplification now has one secondary `Advanced print options` area for template overrides, density, calibration, custom fields, saved presets, and recent print jobs. The first-level workflow is limited to recommended output, physical size/purpose, language/color, responsible profile, selected quantity, preview, and print action.
- Supplemental bottle, strip, and QR outputs now derive pictogram size, QR box size, and visible H/P-code budget from the physical label dimensions. Small labels keep every available GHS pictogram, shrink/reflow the label first, and only summarize text after the icon/signal/identity hierarchy is preserved.
- Added `PRINT_ACCEPTANCE_STANDARD.md` as the product acceptance contract for complete primary, supplemental, QR, quick-ID, readability, and Browser QA matrix gates.
- Added code-level print acceptance matrix tests for A4 Primary, Letter Primary, standard bottle, vial strip, QR supplement, lower-density ethanol, no-GHS data, and upstream-error cases.
- Compact supplemental labels now prioritize severe H-statements and response/PPE P-codes before summarizing lower-priority text, while complete primary labels still print the full H/P content without summaries.
- Print planning now distinguishes transient upstream GHS lookup failure from confirmed no-GHS content, so the UI blocks hazard-label printing with a data-verification message instead of implying the chemical has no hazard data.
- The print modal now exposes a compact decision summary for output role, GHS icon handling, and hazard-text handling before users adjust stock. First-level stock choices are limited to the most common targets, with secondary stock sizes collapsed under "More common stock sizes."
- Responsible lab/supplier fields now behave as an output-dependent profile gate: they open automatically only when a complete-primary label is blocked by missing profile data, and stay collapsed for supplemental/QR outputs.
- The code-level acceptance matrix now covers large primary, 2 x 4 in stock routing, custom tiny stock routing, custom supplemental output, orientation/page-size rendering, and physical-size-based pictogram/H/P budget scaling.
- Selected labels and quantity controls are now summarized behind a first-level details control, so users can adjust copies without the modal reading like a data table by default.
- Added `PRINT_BROWSER_QA_CHECKLIST.md` plus `npm run test:print-contract` to make deployment QA and print-contract checks repeatable instead of relying on memory.
- Physical stock selection is now summarized as the selected target size on the first level; changing paper or label-roll size is a secondary details control. This keeps the modal task-first while still allowing A4, Letter, bottle, strip, and custom stock changes when needed.
- On narrow/mobile modal layouts, task settings now appear before the live preview. Desktop keeps the two-column settings/preview layout, but smaller viewports no longer force users to scroll past the preview before choosing the target.
- The first-level target selector now uses real tasks: main container, bottle label, tube/vial, and QR supplement. Each task applies the appropriate purpose, stock preset, and template before the planner decides whether the result is complete primary or supplemental.
- The preview column now starts with an output outcome summary and an outcome-aware print action. Users can see whether the selected target will print as a complete primary label, supplemental bottle/tube label, QR supplement, or must switch to A4/Letter before reading lower-level diagnostics.
- Lower-level output/readability diagnostics are collapsed below the outcome and exact label preview, so the first screen stays focused on the user decision and the rendered label rather than internal checks.
- A print handoff QA mode (`qaPrintHandoff=1`) now lets Browser Use click the print action without opening the native print dialog. It still builds the print iframe, runs preflight, records lifecycle events, and exposes `print-qa-status`, so deployment QA can prove the button reaches the print handoff path.
- Tube/vial output is now represented as a distinct quick-ID supplement outcome instead of being collapsed into generic supplemental copy. This keeps the UI honest: quick-ID labels are printable bench-side identifiers, not complete primary labels and not QR supplements.
- `PRINT_NINE_SEGMENT_COMPLETION.md` now maps the nine productization segments
  to concrete implementation, tests, and Browser QA evidence so the refactor can
  be checked against user goals instead of a loose task list.
- Print handoff QA status now reports unique pictogram codes, QR state,
  template, and stock preset as machine-readable DOM data attributes.
- A code-level print QA matrix report now exercises the same core HCl outputs
  and records expected `qa_handoff` attributes before Browser/production QA.
- The task-first `Main container` target now preserves the complete-primary
  intent. If dense content cannot fit the roomy container stock, it applies the
  planner's A4/Letter primary recommendation instead of downgrading the main
  container target into a supplemental label.
- The first-level modal has been tightened around the real user task: choose the
  label target first, see the app decision in that same target block, then verify
  the exact printable output in the live preview. Standalone page-count noise is
  folded into the selected-label summary.
- The first-level target cards are now constrained to two columns at desktop
  widths, with the legacy process-step explainer removed. Production handoff QA
  asserts that the target cards stay wide enough, the target choice appears
  before recommendation/details blocks, and non-blocking output details stay
  collapsed by default.
- The right-side preview panel now stays focused on the real printable fragment
  for normal printable outputs. Detailed outcome explanations live in the left
  decision block unless the workflow is empty, blocked, or needs a full-page
  primary upgrade.
- Print QA now records CAS presence, physical label dimensions, page size,
  color mode, name display, template, stock, and issue types in the handoff DOM
  status. The matrix also includes a compact quick-ID case with a case/batch
  identity chip, so small-label refactors cannot accidentally drop CAS or
  case-style identity while preserving pictograms.
- Production deployment freshness has a dedicated `npm run qa:production-bundle`
  check that confirms Zeabur is serving a bundle with the current print QA and
  compact identity markers before Chrome click-through QA starts.
- Production print handoff QA now has a repeatable `npm run qa:production-handoff`
  runner. It reads the matrix report, launches local Chrome/Edge through
  `playwright-core`, searches the deployed app, selects stock/target, fills the
  QA responsible profile and custom identity fields, clicks print in
  `qaPrintHandoff=1`, and verifies `ghs-print-qa-status` plus optional preview
  screenshots.
- The production handoff runner now also inspects the live preview iframe
  geometry before clicking print. It verifies required CAS/support chips,
  pictograms, and QR elements are present and inside the rendered label/viewport,
  so oversized stock-specific icons cannot pass simply because the print status
  says the handoff is ready.
- Standard-template pictogram sizing is capped by the actual rail column that
  can fit within each physical stock. Tall but narrow labels such as Avery 5164
  now shrink the 2x2 pictogram grid before it can bleed outside the label.
- The default production handoff run now covers every production-searchable
  matrix case, not just Hydrochloric Acid. It includes Ethanol and Sodium
  Hydroxide paths by default, verifies preview/print pictogram parity, and treats
  the signal word as a critical visible element alongside CAS, pictograms, QR,
  and identity support chips.
- Production handoff QA now checks exact pictogram-set parity, requires at least
  one chemical identity name in the preview, and records/enforces minimum visible
  GHS pictogram and QR dimensions for compact-label regressions.
- Production handoff QA now actively clicks name-display and color-mode controls
  and asserts `data-name-display` / `data-color-mode`, so English-only and B/W
  matrix rows are real interaction coverage rather than local-only assumptions.
- Each printable production handoff case now records and asserts that the print
  button is enabled before click, so accidental UI gating is reported as a direct
  product failure instead of a generic runner timeout.
- The production-searchable default matrix now includes Methanol and Hydrogen
  Peroxide, covering GHS08 health hazard, GHS03 oxidizer, English-only compact
  output, and actual B/W pictogram filtering in addition to the original
  Hydrochloric Acid, Ethanol, and Sodium Hydroxide paths.
- Production handoff QA now writes `build/production-print-handoff-report.json`
  by default so each post-deploy run leaves a structured audit trail without
  relying on terminal scrollback. Terminal output is concise by default, with
  `PRINT_QA_VERBOSE=1` available for full JSON output.
- The production-searchable QA matrix now includes a dense Formaldehyde
  (`50-00-0`) A4 complete-primary case that is expected to print as a
  continuation-page set.
  This turns "too dense for the selected primary stock" into an explicit product
  contract: preview identity, CAS, signal word, and all pictograms must remain
  visible, the print button must stay enabled, the handoff must report multiple
  pages, and the renderer must continue full H/P text across pages instead of
  clipping the label or leaving the user at a dead end.
- Dense A4/Letter complete-primary output now uses a continuation renderer when
  the full H/P text is too large for one efficiently used physical page. Each
  continuation page repeats identity, CAS, signal word, all available GHS
  pictograms, responsible profile, and a continuation badge; H/P statements are
  split across pages.
- Complete A4/Letter continuation is now the expected recovery for first-page
  H/P overflow: the planner and print QA allow same-stock continuation instead
  of disabling print, and the print action shows the resulting label/page count.
  H statements remain before P statements. The first page carries the QR lookup
  code; later continuation pages use that space for H/P content instead of
  repeating QR by default.
- QR small labels and identification small labels avoid internal divider boxes
  in their continuation layouts. The outer label boundary remains, but scarce
  area is reserved for CAS, English name, Chinese name, QR when applicable, and
  recognizable GHS pictograms.
- QR small-label continuation uses the QR code on the first label only by
  default. Later labels repeat identity and pack remaining pictograms across the
  freed width, so many-pictogram chemicals do not waste an entire column on a
  repeated scan code.
- The modal preview now exposes page navigation for multi-page and continuation
  outputs. The label preview and sheet preview consume the same selected
  page/label index, so users can inspect later continuation pages before
  printing instead of trusting a first-page-only preview.
- Large physical container labels, including the 140 x 88 mm preset, are now
  treated as front-of-container labels instead of miniaturized complete primary
  labels. They should preserve identity, CAS, case/batch number, signal word,
  and every available GHS pictogram, then print only a prioritized H-statement
  summary. Full H/P text belongs on A4/Letter primary output, continuation
  pages, SDS, QR supplement, or a back/fold-out label.
- Case/batch identity is part of the same identity block as CAS on physical
  labels. It should not appear as an unrelated custom footer field on one
  template and a framed chip on another.
- Production print QA now has a single `npm run qa:production-print` command
  that generates the matrix report, clicks the deployed app, writes the
  handoff report, and captures preview screenshots for every default
  production-searchable case. This is the post-deploy gate for print workflow
  changes.
- The same production handoff matrix can now be split into
  `npm run qa:production-primary`, `npm run qa:production-compact`, and
  `npm run qa:production-multi-chemical`. These are not weaker checks; they use
  the same deployed-browser runner and only narrow the selected case IDs so
  compact-label or primary-label work can be validated without waiting for the
  full matrix every time.
- Production preview inspection now checks rendered content containers for
  overflow or label-boundary clipping, not only the hidden handoff status. This
  keeps the QA target aligned with the user-visible preview instead of merely
  proving that a print button was clicked.
- The QA matrix now pins complete-primary color/language variants:
  A4 Chinese/B&W and Letter English/B&W must preserve full-page pictogram sizing,
  exact identity-language output, and the selected color mode in both preview
  and print handoff.
- The QA matrix now pins bottle supplemental output with a case/batch identity
  field, so case numbers cannot regress back into clipped custom-field text on
  medium labels.
- Supplemental fit checks now include custom identity fields such as
  case/batch number. Normal case identifiers must remain printable on small
  labels, while oversized identifiers are blocked before print handoff instead
  of being clipped after the user clicks print.
- Print QA now emits real print HTML artifacts and renders them to PDFs through
  Chrome print media with `preferCSSPageSize`. The PDF gate checks generated
  PDF validity plus loaded images, exact pictogram sets, QR state, `more-pics`
  absence, and visible overflow/clipping in identity, hazard, QR, and
  compliance containers.
- Prepared-solution A4 primary, bottle supplemental, and tube quick-ID outputs
  are now first-class renderer/PDF QA cases. They stay excluded from the
  regular production search handoff matrix because production cannot search for
  a derived prepared item directly; `npm run qa:production-prepared` covers the
  actual deployed creation path from detail to prepare-solution form to print
  modal to print handoff, the deployed prepared sidebar reprint path, and the
  prepared preset creation/reuse path. The preset branch proves that Save as
  preset does not open print, recipe fields are restored on reuse, and stale
  operational fields are cleared before print handoff.
- The first render-driven auto-fit slice is in place. Print layout resolution
  now derives an `autoFitLevel` from actual chemical identity, case/batch
  fields, hazard text load, and pictogram count before rendering. Print
  preflight can also retry once or twice at a tighter fit level when it sees
  fixable overflow, so the system shrinks/reflows first and only blocks after
  the renderer still cannot produce a truthful label.
- Print content policy is now centralized in `printContentPolicy`: complete
  primary labels print full H/P, continuation primary labels split full H/P
  across pages, roomy container-front labels print priority H summaries,
  compact bottle labels print H codes only, quick-ID labels omit full H/P, and
  QR supplements use QR/SDS reference behavior. The modal decision summary,
  renderer classes, planner output, and QA report consume those shared terms.
- Compact stock coverage has been expanded beyond the original tube/vial cases.
  The QA matrix now includes small-rack quick-ID, small-rack QR supplement,
  medium-rack quick-ID, medium-rack QR supplement, 62 mm continuous, and large
  front-label paths. The local PDF artifact gate currently covers 33 print
  cases, including prepared-solution A4 primary, bottle supplemental, and tube
  quick-ID outputs.
- Real chemical edge-case coverage now records a chemical coverage manifest in
  the print QA report and includes sparse single-pictogram production cases for
  Nitrogen (`GHS04`), Zinc Oxide (`GHS09`), and Boric Acid (`GHS08`) alongside
  the existing dense, flammable, corrosive, oxidizer, long-name, and
  prepared-solution paths.
- PDF artifact QA now checks stock-specific visual overlap classes, including
  pictogram collision with CAS, signal word, product name, QR, and label
  boundaries. Compact labels must be visibly usable, not merely present in the
  DOM.
- Production bundle freshness checks now include stock-specific print markers
  such as `label-stock-small-rack` and `label-stock-medium-rack`, so stale
  Zeabur assets are caught before production click-through QA.
- The autonomous continuation rules now live in `AUTONOMOUS_WORKFLOW.md`, and
  the product work queue lives in `NEXT_PRODUCT_WORK.md`. The completed five
  print workstreams live in `NEXT_PRINT_WORKSTREAMS.md`; the active remaining
  product queue lives in `NEXT_REMAINING_PRODUCT_WORK.md`. Use those files with
  this refactor plan when the user asks to keep going.

Remaining work should continue from the same planner instead of adding template-specific exceptions.

## Core Product Decisions

- The default path is a complete primary label, not a compact label.
- A4 Primary and Letter Primary are first-class complete-label outputs.
- Large, bottle, and small physical labels are allowed, but non-A4/Letter stocks
  are front labels or supplemental labels unless the complete-primary renderer
  can truthfully carry the full required content. The UI must not imply that a
  140 x 88 mm label is equivalent to A4/Letter for full H/P text.
- QR labels are supplemental and must not replace GHS pictograms, signal word, or necessary hazard text.
- The app should reduce exposed choices and move minor tuning to Advanced.
- The system should try scaling and layout adaptation before declaring that a label is too small.
- The system must not silently omit GHS pictograms.

## Output Types

### Complete Primary Label

Use for shipped-container style or main container labels.

Required content:

- Product identifier.
- CAS when available.
- Localized chemical name according to language mode.
- Signal word when available.
- All available GHS pictograms.
- H-statements.
- P-statements.
- Responsible lab/supplier name, phone, and address.
- Trust/provenance footer.
- Optional QR support as a separate supplemental label by default; inline QR should not return to A4/Letter primary output unless the fit checker proves it cannot compromise the required layout.

Primary label stocks:

- A4 Primary.
- Letter Primary.
- Large bottle/container labels that pass fit and readability checks.
- Custom saved stock that passes fit and readability checks.

### Small Supplemental Label

Use when the physical label is too small for complete primary content.

Required behavior:

- Must be visibly described as supplemental in the print workflow.
- Must not claim to be a complete primary label.
- Must keep all available GHS pictograms when used as a printed hazard label.
- Should include product identifier, CAS, signal word, and the highest-priority hazard summary.
- Should include QR or reference link to the complete label/SDS context when possible.

Small supplemental labels are useful for tubes, racks, small bottles, and short-term bench-side identification. They do not replace the complete primary label.

### Container Front Label

Use for 140 x 88 mm, Avery 5164-style, or similar physical labels that are
large enough for a useful front label but not large enough to carry all H/P
text cleanly.

Required behavior:

- Must keep product identifier, CAS, case/batch identity when present, signal
  word, and every available GHS pictogram visible.
- Must not print P-statements by default.
- Should print only the highest-priority H-statements that fit, using short
  localized summaries. Lower-priority H-statements should be summarized as
  "more hazards" rather than squeezing long text.
- Must be described in the workflow as a front/container label or supplemental
  output, not as a complete primary label.
- Should point users to A4/Letter primary, SDS, QR supplement, or a back label
  when complete H/P text is required.

### QR / SDS Supplement

Use for fast lookup and reprint workflows.

Required behavior:

- QR is the dominant feature.
- The label includes enough identity and pictogram context to avoid orphaned QR-only labels.
- It is clearly supplemental in the print workflow.
- It never replaces a complete primary label when a complete primary label is required.

### Custom Saved Stock

Use when the user has a nonstandard label roll or specialty stock.

Required behavior:

- User can enter width, height, unit, and orientation.
- User can save the stock as a template.
- Saved stock must still go through the same planner and fit checks.
- Custom stock cannot bypass safety-critical output rules.

## Recommended Stock Set

The stock list should be smaller and more intentional.

### Full-Page Primary

- A4 Primary, for Taiwan, Europe, Japan, and most international users.
- Letter Primary, for US/Canada-style office printers.

Both should be available regardless of UI language. Auto-default can follow locale or browser paper hints when available, but the switch must remain visible.

### Common Label Stocks

Keep only common, useful presets in the first-level UI:

- Large bottle label, around 95 x 50 mm.
- 2 x 4 inch label, Avery 5163-style.
- 3-1/3 x 4 inch label, Avery 5164-style.
- 62 mm continuous label, Brother DK-2205-style.
- Small rack / quick-ID label, supplemental only.
- Medium rack label, supplemental or quick-ID only unless a future renderer
  proves a complete primary label fits truthfully.
- Custom saved stock.

Avoid offering many near-duplicate sizes by default. More choices make the workflow feel powerful but increase error and hesitation.

## Planner Inputs

The planner should receive structured inputs:

- Chemical content model.
- Effective GHS classification.
- Language mode: zh-TW, en, or bilingual.
- Desired stock or custom dimensions.
- Stock family: full-page, large primary, small supplemental, QR supplement, custom.
- Responsible profile completeness.
- Color mode: color or black-and-white.
- Orientation preference.
- Quantity.
- Advanced fields and custom fields.

The planner should not depend on the UI component layout state.

## Planner Algorithm

The print planner should work in this order:

1. Normalize chemical content into a stable content model.
2. Determine intended output type from stock, user goal, and content density.
3. Reserve mandatory pictogram and signal/hazard grouping space.
4. Choose a layout strategy for the stock family.
5. Scale typography and spacing within readable bounds.
6. Reflow statement sections before removing content.
7. Deduplicate and combine statements where the source text safely allows it.
8. Run fit and readability checks.
9. If complete content fits, allow print.
10. If complete content does not fit, recommend a full-page primary label plus a supplemental small label.

The planner must prefer "make a valid output" over "block the user." Blocking is appropriate only when required source/profile data is missing or the app cannot produce a truthful printable result.

## Typography And Fit Rules

The system should scale typography based on label size before dropping content.

Recommended hierarchy:

- Full-page primary: roomy typography, large pictograms, multi-column H/P layout when useful.
- Large bottle/container label: compact but readable text, strong pictogram row or panel, H/P statements grouped clearly.
- Small supplemental label: smaller text, short hazard summary, high pictogram priority.
- Tiny labels: identity and pictogram-first supplemental label only.

Suggested minimum rules:

- Product name must remain readable and cannot wrap into an unusable block.
- GHS pictograms scale with label dimensions and must remain visually dominant enough to identify.
- Signal word, pictograms, and hazard summary stay visually grouped.
- H/P text can scale down within a minimum readable bound.
- Below the readable bound, the output becomes supplemental or routes to full-page primary.

Do not use deletion as the first response to overflow. Try scale, reflow, columns, grouping, and deduplication first.

## Content Priority

When space is constrained, the priority order is:

1. Product identity.
2. GHS pictograms.
3. Signal word.
4. H-statements.
5. Responsible profile for complete primary labels.
6. P-statements.
7. Trust/provenance footer.
8. QR support.
9. Optional custom fields.

This priority list does not mean lower-priority required content can be silently removed from a complete primary label. It means the planner uses the priority list to decide whether a stock can be complete or must become supplemental.

## UI Restructure

The first-level modal should show only the decisions users actually understand:

- Output goal.
- Paper or label stock.
- Language.
- Color or black-and-white.
- Quantity.
- Recommended output plan.
- Live preview.
- Print action.

Move these into Advanced:

- Content density.
- Layout micro-adjustment.
- Calibration offsets.
- Custom fields.
- Custom stock creation and saved template management.

Advanced settings should be available but not visually compete with the primary workflow.

## Preview And Print Contract

Preview and print must use the same label fragment renderer.

Required behavior:

- Preview must scale the whole label into the preview pane without cropping.
- Print must not use a different layout from preview.
- Orientation changes must be visible in preview and print.
- A4 and Letter must each use their own page dimensions.
- Color and black-and-white modes must be visible in preview and print.
- Language changes must update text while icon positions remain stable.

## Readiness States

The planner should produce explicit states:

- `ready`: selected output can print.
- `ready_with_notice`: selected output can print, but it is supplemental or has a clear limitation.
- `recommend_full_page`: selected stock is too small for complete content; recommend A4 or Letter primary.
- `missing_required_profile`: complete primary label needs responsible name, phone, or address.
- `missing_hazard_data`: hazard label cannot be produced because GHS data is unavailable or not trusted.
- `invalid_stock`: custom dimensions are impossible or too small for the requested output.

Avoid vague messages such as "content overflow." Tell the user what the app will do next.

## Test Standards

Add or update tests so this behavior is pinned:

- A4 Primary and Letter Primary both exist and render as complete primary labels.
- Full-page primary preview scales the whole label without clipping.
- Large dense chemicals route to full-page primary instead of a dead disabled print button.
- Dense shipped-container labels auto-apply a viable A4 or Letter primary recommendation when the planner can produce one.
- Small stocks become supplemental when complete content cannot fit.
- Small supplemental labels do not claim to be complete primary labels.
- All available pictograms render on printed hazard labels.
- Pictogram size scales with label dimensions.
- Font size and layout adapt before content is dropped.
- Language mode changes text but does not move pictograms into unstable positions.
- Color and black-and-white modes affect preview and print.
- Orientation affects preview and print.
- Missing responsible profile blocks complete primary print and explains the missing fields.
- Custom saved stock still runs through planner checks.

## Browser QA Matrix

Use Browser Use after meaningful print refactor changes.

Required chemicals:

- Hydrochloric acid, dense H/P and multiple pictograms.
- Ethanol, common flammable label path.
- A chemical with at least 3 pictograms.
- A prepared-solution item.

Required scenarios:

- A4 Primary complete label.
- Letter Primary complete label.
- Large bottle label that fits.
- Large bottle label that routes to full-page primary.
- Small supplemental label.
- QR supplement.
- Bilingual mode.
- English mode.
- Traditional Chinese mode.
- Color mode.
- Black-and-white mode.
- Portrait and landscape where supported.
- Custom saved stock.

## Implementation Phases

### Phase 1: Planner Foundation

- Add a `printOutputPlanner` utility.
- Add Letter Primary stock.
- Reduce first-level stock presets to curated options.
- Add planner readiness states.
- Add unit tests for planner decisions.

### Phase 2: Rendering Unification

- Make preview and print consume the same planned output model.
- Add dynamic typography tokens based on stock family.
- Scale pictograms by stock size and output type.
- Add Letter rendering tests.

### Phase 3: Modal Simplification

- Rework `LabelPrintModal` around recommended output.
- Move density, micro-adjustment, calibration, custom fields, and template editing behind Advanced.
- Replace disabled dead ends with recommended actions.

### Phase 4: Supplemental Label Clarity

- Add clear supplemental status in the workflow and compact visual treatment in printed labels.
- Ensure small labels do not imply complete primary-label status.
- Keep QR supplemental behavior clear.

### Phase 5: Browser QA And Deployment Verification

- Run unit tests and build.
- Run Browser Use scenarios.
- Push to main when stable.
- Verify Zeabur deployment asset contains the new planner/rendering behavior.

## Non-Goals

- Do not build a full mixture-classification engine in this refactor.
- Do not claim legal compliance certification.
- Do not add ads, sponsor copy, or brand CTAs inside safety-critical printed label content.
- Do not make a landing page or promotional wrapper around the print workflow.
- Do not expose every possible label stock as a first-level option.

## Definition Of Done

The refactor is done only when:

- A normal user can open print, choose a physical output, and receive a clear recommended plan.
- A4 and Letter complete primary labels print dense content without preview/print mismatch.
- Small labels are useful but honestly supplemental when they cannot carry complete content.
- GHS pictograms are never silently omitted.
- Typography scales and reflows before the app routes to a larger output.
- First-level UI is calmer than the current modal.
- Automated tests cover planner decisions and renderer invariants.
- Browser QA confirms preview and print behavior across the required matrix.
