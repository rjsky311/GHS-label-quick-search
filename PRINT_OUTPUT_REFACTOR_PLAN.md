# Print Output Refactor Plan

This document is the implementation guide for the next print-workflow refactor. It turns the recent product decisions into a stable plan so future work does not drift back into one-off template fixes.

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
- Added explicit supplemental hazard notices to non-primary print fragments so compact `standard`, quick-ID, and QR outputs do not imply complete primary-label status.
- Made `nameDisplay: both` print bilingual signal words plus H/P statement text, with non-full-page bilingual outputs treated as denser during fit checks.

Remaining work should continue from the same planner instead of adding template-specific exceptions.

## Core Product Decisions

- The default path is a complete primary label, not a compact label.
- A4 Primary and Letter Primary are first-class complete-label outputs.
- Small labels are allowed, but they may become supplemental labels when they cannot carry complete content.
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
- Optional QR support, as secondary content only.

Primary label stocks:

- A4 Primary.
- Letter Primary.
- Large bottle/container labels that pass fit and readability checks.
- Custom saved stock that passes fit and readability checks.

### Small Supplemental Label

Use when the physical label is too small for complete primary content.

Required behavior:

- Must be visibly described as supplemental.
- Must not claim to be a complete primary label.
- Must keep all available GHS pictograms when used as a printed hazard label.
- Should include product identifier, CAS, signal word, and the highest-priority hazard summary.
- Should include QR or reference link to the complete label/SDS context when possible.

Small supplemental labels are useful for tubes, racks, small bottles, and short-term bench-side identification. They do not replace the complete primary label.

### QR / SDS Supplement

Use for fast lookup and reprint workflows.

Required behavior:

- QR is the dominant feature.
- The label includes enough identity and pictogram context to avoid orphaned QR-only labels.
- It is clearly supplemental.
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
- Small quick-ID label, supplemental only.
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

- Add clear supplemental label copy and visual treatment.
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
