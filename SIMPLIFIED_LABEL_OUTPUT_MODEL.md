# Simplified Label Output Model

Status: implemented product contract for the current label-printing refactor as
of 2026-05-16. Keep this file as the canonical reference before changing
`LabelPrintModal`, stock presets, compact print renderers, QR targets, batch
print planning, or print QA.

This document replaces the prior first-level print workflow model for future
work. Older documents such as `PRINT_OUTPUT_REFACTOR_PLAN.md` and
`BATCH_LABEL_PRINT_REFACTOR_PLAN.md` remain useful for implementation history,
QA lessons, and safety constraints, but the user-facing label workflow should
now converge on the three outputs below.

This is a product and engineering contract, not legal advice. Final workplace
use still requires SDS, supplier labels, and local regulation review.

Current implementation checkpoint:

- The modal first-level output choices are now exactly Complete A4/Letter
  label, QR small label, and Identification small label.
- Complete labels support A4 and Letter and include a QR code back to this
  product's lookup page.
- QR small labels use `62 x 40 mm` by default and print CAS, English name,
  Chinese name, QR, and all pictograms across same-output continuation labels.
- Identification small labels use `70 x 24 mm` by default and print CAS,
  English name, Chinese name, and all pictograms across same-output
  continuation labels.
- Small labels intentionally omit H/P text, signal words, H-code chips, teaser
  summaries, case/custom fields, and front-label terminology.
- URL query hydration for `?cas=...` is implemented so printed QR codes can
  return users to the lookup page.
- 2026-05-18 deployed fix checkpoint: complete A4/Letter primary labels now
  use the resolved full-page typography metrics for H/P text instead of the
  older oversized 8-10px statement tier, and continuation thresholds are
  tighter for dense H/P content. `npm run test:print-contract`,
  `npm run qa:print-pdf`, `npm run qa:production-batch-print`, and
  `npm run qa:production-primary` pass, including A4, Letter, formaldehyde
  continuation, and 50+ item batch handoff artifacts.

## 1. Product Decision

The label-printing feature should stop asking ordinary users to reason about
front labels, supplemental labels, quick-ID labels, QR supplements, H-code
budgets, reduced-purpose routing, dense-content exceptions, and many stock
cards.

The user-facing model is:

1. Complete label.
2. QR small label.
3. Identification small label.

The app can still use internal planning, renderer checks, continuation splits,
and QA gates, but those details should not be the first thing the user sees.
The product should feel like: choose the output type, preview the actual
labels, print the batch.

## 2. Output Types

### 2.1 Complete Label

Use when the user needs the full reference label.

Physical size:

- A4 primary.
- Letter primary.
- One label per page.

Required content:

- CAS number when available.
- English chemical name.
- Chinese chemical name.
- All available GHS pictograms.
- Full H statements.
- Full P statements.
- QR code.

QR target:

- QR should open this product's lookup page for the chemical, using a simple
  CAS query URL such as `https://ghs-frontend.zeabur.app/?cas=7647-01-0`.
- If the app does not yet support direct CAS query hydration from URL params,
  implement that as part of the refactor before relying on the QR.

Layout rules:

- A4 and Letter complete labels use one physical label per page. The renderer
  should first use the available full-page space efficiently with calibrated
  typography and statement columns; one chemical should produce a same-stock
  continuation set only when the complete H/P content still cannot fit on the
  first page without clipping.
- P-statement overflow is not a valid final block reason by itself when the
  selected output is A4/Letter complete label. The planner should move
  remaining precautionary statements to continuation pages that repeat the
  identity, signal, pictograms, responsible profile, and quiet page marker.
- Complete continuation pages must stay on the selected A4/Letter stock instead
  of blocking print or switching output types. Each page repeats CAS, English
  name, Chinese name, signal word, all available GHS pictograms, responsible
  profile, and a quiet page marker; H statements print before P statements, and
  long P text continues onto later pages.
- Complete continuation sets keep the QR lookup code on the first page. Later
  pages should use the QR area for H/P text unless physical-printer validation
  proves repeated QR is needed and still does not waste page capacity.
- The QR code must not push H/P content, product identity, or GHS pictograms
  out of the printable area.

### 2.2 QR Small Label

Use when the user wants a compact label that carries identity, hazard icons,
and a scan path back to the product detail/search page.

Default physical size:

- `62 x 40 mm`.
- Sheet layout should place as many labels per page as can fit without
  sacrificing readability or QR scan reliability.

Required content:

- First line: `CAS 7647-01-0` style CAS number.
- Second line: English chemical name.
- Third line: Chinese chemical name.
- All available GHS pictograms across the label set.
- QR code on the first printed label in the set. If the same chemical needs
  continuation labels for remaining pictograms, later labels repeat identity
  text but use the QR area for pictograms.

Forbidden content:

- No H statements.
- No P statements.
- No signal word such as `Danger`, `Warning`, `危險`, or `警告`.
- No H-code chips or teaser summaries.

Layout rules:

- CAS, English name, and Chinese name must be visually separated. They must not
  be packed into one crowded line.
- Line spacing must remain readable; do not collapse name lines to make room
  for optional content.
- Avoid internal divider boxes or grid lines inside continuation small labels.
  Preserve the outer label boundary/cut area, then use whitespace and alignment
  to separate identity, pictograms, and QR.
- QR should remain large enough for practical phone scanning. Treat about
  `20 mm` square as the default target unless physical-printer validation later
  proves a smaller size reliable.
- GHS pictograms should be visually clear and aligned in a predictable grid.
- Continuation labels should pack pictograms across the usable width before
  splitting again. Do not leave a large reserved QR column on pages that do not
  print a QR code.

### 2.3 Identification Small Label

Use when the user only needs a compact physical identifier with GHS icons and
does not need a QR code.

Default physical size:

- `70 x 24 mm`.
- Sheet layout should place as many labels per page as can fit without
  sacrificing readability.

Required content:

- First line: `CAS 7647-01-0` style CAS number.
- Second line: English chemical name.
- Third line: Chinese chemical name.
- All available GHS pictograms across the label set.

Forbidden content:

- No QR code.
- No H statements.
- No P statements.
- No signal word such as `Danger`, `Warning`, `危險`, or `警告`.
- No H-code chips or teaser summaries.

Layout rules:

- CAS, English name, and Chinese name must be visually separated.
- GHS pictograms are mandatory. They may move to a second/third label for the
  same chemical, but they must not be omitted or summarized as `+N`.
- Avoid internal divider boxes or grid lines inside continuation labels. The
  outer label boundary is enough; the renderer should spend the available space
  on identity text and recognizable pictograms.

## 3. Continuation Rules For Small Labels

Small labels should not fail simply because one chemical has a long name or many
GHS pictograms. The app should continue on the same output type and same
physical stock.

Rules:

- Do not switch an item from QR small label to A4/Letter just because it does
  not fit in one small label.
- Do not mix output types inside one batch.
- If content does not fit in one small label, create a second or third label for
  the same chemical.
- Repeat CAS, English name, and Chinese name on every continuation label.
- For QR small labels, print the QR code on the first label only by default.
  Continuation labels should spend the saved space on remaining pictograms.
- Distribute GHS pictograms across the continuation set when they cannot all fit
  clearly on one label.
- Add a small continuation marker such as `1/2`, `2/2`, `1/3`, `2/3`, `3/3`.
  It should be present but visually quiet.
- A continuation set is valid only when every required pictogram appears across
  the set and every label still contains CAS plus both names.

Recommended fallback order:

1. Scale typography within readable bounds.
2. Reflow name and pictogram areas.
3. Split GHS pictograms across continuation labels.
4. Split only within the same selected output type and stock.
5. If the identity block itself cannot remain readable even after splitting,
   block the specific item with a clear reason. Do not silently print an
   unreadable label.

## 4. Batch Printing

Batch printing follows the same three-output model.

Rules:

- User chooses exactly one output type for the batch.
- Every printed item uses that same output type and same physical stock.
- The app may create multiple labels for one chemical when needed.
- The app should summarize the generated label count before handoff.
- The preview should include representative labels, not only the first item:
  first, longest name, most pictograms, and any continuation example.
- Batch output should prioritize page utilization for small labels, but not by
  shrinking text, QR, or pictograms below practical readability.

Examples:

- `Print 47 QR small labels as 52 physical labels on 62 x 40 mm stock`
- `Print 47 identification labels as 55 physical labels on 70 x 24 mm stock`
- `Print 12 complete labels on A4`

## 5. UI Simplification

The first-level print modal should expose only:

1. Complete label.
2. QR small label.
3. Identification small label.

Remove or hide from the first-level flow:

- Main container / bottle / tube / QR supplement task cards.
- Large container front label language.
- Quick-ID terminology.
- H-code front-label chips.
- Signal-word toggles for small labels.
- H/P density controls for small labels.
- General stock grids with many similar choices.
- Layout micro-tuning controls.
- Custom field controls.

Advanced/future-only:

- Case number.
- Batch number.
- Custom fields.
- Lab profile fields on small labels.
- User-saved custom physical stock.
- Calibration controls.

These advanced controls may return later, but they should not block the simple
three-output workflow.

## 6. Future Case Number And Custom Fields

The current core refactor must treat CAS number as mandatory identity content.
It must not confuse CAS number with case number.

Future work should add:

- Case number.
- Batch/lot number.
- Internal sample ID.
- Custom lab fields.

Those fields should enter through an advanced section and must have their own
small-label fit policy. They should not crowd the initial simplified model.

## 7. Implementation Direction

Suggested implementation order:

1. Add a new output model layer that maps the three product outputs to renderer
   configs.
2. Add URL-query hydration for `?cas=...` so QR codes can return users to this
   product.
3. Replace the first-level print modal selector with the three output cards.
4. Remove H/P and signal-word rendering from both small-label outputs.
5. Implement small-label continuation for long names and many pictograms.
6. Update batch planner copy and output counts to account for continuation
   labels on the same output type.
7. Retire or hide legacy public-facing terms from the modal while preserving
   internal tests for safety constraints.
8. Refresh PDF, Browser, and production QA around the three new outputs.

## 8. Acceptance Criteria

The refactor is not complete until all criteria below are met.

Product behavior:

- The print modal first screen shows exactly the three output choices.
- A4 and Letter complete labels include full H/P and QR.
- Dense A4 and Letter complete labels paginate H/P content across same-stock
  continuation pages instead of blocking on `compliance-precautions-overflow`
  when continuation pages can preserve the required content.
- QR small labels include CAS, English name, Chinese name, all GHS pictograms
  across the set, and QR; they include no H/P and no signal word.
- Identification small labels include CAS, English name, Chinese name, and all
  GHS pictograms across the set; they include no QR, H/P, or signal word.
- Small-label continuations repeat CAS and both names.
- Small-label continuations use quiet page markers.
- Batch printing uses one output type and one stock for the whole batch.
- The app does not recommend A4/Letter merely because a selected small-label
  output needs a second small label.

Visual/readability:

- CAS, English name, and Chinese name are separate visual rows.
- QR small label QR codes are large enough for practical scanning.
- Small labels fill sheets efficiently without producing unreadable text.
- Preview shows the whole label and representative continuation examples.
- GHS pictograms are not hidden, summarized, or reduced to an unreadable size.

Verification:

- `git diff --check`
- Run frontend npm commands from `frontend/`.
- `npm test -- --runInBand`
- `npm run test:i18n`
- `npm run build`
- `npm run test:print-contract`
- `npm run qa:print-pdf`
- `npm run qa:production-batch-print`
- `npm run qa:production-product`

Production-facing changes must also be checked on the deployed Zeabur frontend,
including actual clicks through each of the three output types.

The complete-label gate should include at least one deployed A4 primary batch
case with dense precautionary statements, clear preview page count, and a
printable continuation set.
