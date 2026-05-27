# Physical Print Validation Checklist

This checklist covers the real-world print layer that automated browser, PDF,
and production handoff QA cannot fully prove. It is a product-quality checklist,
not a legal compliance certificate. Final use still requires SDS, supplier
labels, and local regulation review.

Use this checklist after meaningful print-renderer changes, stock-preset
changes, QR changes, label-size changes, or before treating a new physical stock
family as production-ready.

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` for current priority, continuation order,
and done criteria. Physical print execution is deferred there until real
paper/stock/printer evidence is available.

Current product-model note: when physical validation resumes, validate the
three public outputs from `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` first: Complete
A4/Letter label, QR small label, and Identification small label. Older stock
families in this checklist are historical/internal regression families and
should not be treated as a mandate to reintroduce first-level bottle, rack,
tube, or QR-supplement choices.

## 1. Preconditions

Run automated gates first so the physical print pass is not debugging basic
renderer failures:

- `npm run test:print-contract`
- `PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report`
- `npm run qa:print-pdf`
- `npm run qa:production-product` after Zeabur deploy when the change is
  user-facing
- `npm run qa:physical-print-plan`

`qa:physical-print-plan` reads `frontend/build/print-qa-report.json` and writes:

- `frontend/build/physical-print-validation-plan.md`
- `frontend/build/physical-print-validation-plan.json`

Use those generated files as the work order for the physical print pass. They
pin the current representative cases, expected stock, output role, pictograms,
QR expectations, browser steps, and per-case evidence fields. Regenerate them
after print-matrix or stock-preset changes so the manual evidence follows the
same contract as automated QA.

Use the production URL for final evidence:

- https://ghs-frontend.zeabur.app/

Record the following before printing:

- Commit hash and deployed frontend asset name.
- Browser and version.
- Operating system.
- Printer model and driver.
- Paper or label stock name.
- Physical page size or roll width.
- Browser print settings: paper size, orientation, scale, margins, headers and
  footers, background graphics, and color mode.
- Whether the browser or driver auto-scaled the output.

Recommended baseline print settings:

- Scale: `100%` or "Actual size" when available.
- Headers/footers: off.
- Background graphics: on.
- Paper size: match the selected app stock or sheet.
- Orientation: match the selected app stock.

If a printer or driver cannot use actual size, record the automatic scaling
percentage and treat any layout drift as a product finding.

## 2. Required Physical Stock Families

Validate the current public outputs first before claiming print workflow
stability:

| Family | Representative output | Required physical evidence |
| --- | --- | --- |
| Complete A4 label | Hydrochloric Acid or a dense batch item on A4 | Full H/P content prints or continues on the same stock; identity, CAS, signal, pictograms, QR, and profile stay readable |
| Complete Letter label | Hydrochloric Acid or a dense batch item on Letter | Same as A4, with Letter paper selected |
| Complete continuation set | Formaldehyde, Aniline, or another dense H/P item | Pages print in order; each continuation repeats identity, CAS, signal, pictograms, profile, and quiet page marker |
| QR small label | Hydrochloric Acid or a multi-pictogram item on 62 x 40 mm | CAS/English/Chinese identity is readable; QR scans; all pictograms appear across same-output continuation labels |
| Identification small label | Hydrochloric Acid or a multi-pictogram item on 70 x 24 mm | CAS/English/Chinese identity is readable; all pictograms appear across same-output continuation labels; no QR/H/P/signal appears |

Historical/internal regression families can be validated only after the current
public outputs pass or when a bug report specifically involves that legacy
fixture:

| Legacy family | Representative output | Required physical evidence |
| --- | --- | --- |
| Standard bottle | Historical bottle/internal fixture | All pictograms remain readable if the fixture is still generated |
| Large front label | Historical large-container/front fixture | Identity and pictograms dominate if the fixture is still generated |
| Tube/vial strip | Historical tube/vial quick-ID fixture | CAS identity remains visible; no pictogram is cropped |
| Rack label | Historical small/medium rack fixture | Compact layout remains readable at normal handling distance |
| 62 mm continuous | Current QR small label or historical 62 mm fixture | Roll output does not clip at edges; pictograms remain large enough |
| QR supplement | Historical QR supplement fixture | QR scans quickly; pictograms remain present and not replaced by QR |
| Prepared solution | Prepared-label fixture still supported by the app | Parent identity, concentration, solvent, dates, and pictograms stay visible |

## 3. Chemical Coverage

Use at least these chemicals because they stress different failure modes:

- Hydrochloric Acid (`7647-01-0`): four pictograms, dense H/P content, small
  label pressure.
- Formaldehyde (`50-00-0`): dense content and continuation-page pressure.
- Ethanol (`64-17-5`): lower-density flammable case.
- Nitrogen (`7727-37-9`) or another sparse single-pictogram case: verifies
  sparse layouts do not look broken.
- Water (`7732-18-5`) or another no-GHS case: verifies false hazard labels are
  not printed.

## 4. Physical Readability Checks

For every printed label, inspect these items on paper, not only on screen:

- Chemical identity is visible and not cropped.
- CAS is visible when available.
- Case number or selected custom identity field is visible when enabled.
- Signal word is visible when available.
- Every expected GHS pictogram is present.
- Pictograms are recognizable at the expected handling distance.
- Red diamond borders remain visually distinct in color mode.
- Black-and-white mode preserves pictogram recognizability.
- Text does not overlap pictograms, QR, chips, label borders, or other text.
- No content crosses a die-cut label boundary.
- No content is lost to printer margins.
- Orientation matches the selected stock.
- The app's output role matches the physical output: Complete A4/Letter label,
  QR small label, Identification small label, same-output continuation, or a
  clearly marked historical/internal fixture.

Expected handling distances:

- A4/Letter complete label: readable at desk distance.
- QR small label and Identification small label: CAS, English name, Chinese
  name, QR when present, and pictograms must be readable at close handling
  distance; H/P text and signal words are not expected.
- Historical bottle/tube/rack fixtures: readable only as regression evidence;
  do not promote them back into the first-level product model without a new
  scope-gate decision.

## 5. QR Scan Checks

For QR outputs:

- Scan with at least one phone camera app.
- Scan from normal handling distance, then from close distance if needed.
- Confirm the destination is `http` or `https`.
- Confirm the destination is the intended SDS/detail/reference path.
- Confirm the QR block does not hide, shrink, or replace GHS pictograms.
- Confirm QR remains readable in both color and black-and-white print modes
  when the output supports both.

Fail the stock or output if the QR scans only after unusual lighting, extreme
close distance, or manual camera focusing.

## 6. Completion Criteria

A physical print pass is complete only when:

- Each tested stock family has a pass/fail result.
- Failures include a photo or written reproduction path.
- The failure is classified as one of:
  - App renderer/layout issue.
  - Browser print setting issue.
  - Printer driver scaling issue.
  - Stock/media mismatch.
  - QR destination or scan issue.
  - Data/content issue.
- Any repeated app-renderer issue is converted into an automated check in the
  print QA matrix, PDF artifact QA, production handoff QA, or a unit test.
- Any unsupported physical setup is documented as unsupported or routed to a
  safer stock recommendation.

Do not mark a stock family as production-ready when the user can reach an
apparently printable output that fails on paper.

## 7. Evidence Template

Copy this template into the work note, PR description, or QA artifact summary:

```text
Physical print validation

Date:
Commit:
Production URL:
Frontend asset:
Browser / OS:
Printer:
Driver:
Paper or label stock:
App output:
Chemical:
Language mode:
Color mode:
Browser print settings:
Driver scaling:

Result: PASS / FAIL

Observed:
- Identity:
- CAS / case:
- Signal word:
- GHS pictograms:
- H/P text or summary:
- QR scan:
- Label boundary:
- Orientation:

Failure class:
Follow-up:
Automated regression added:
```

## 8. Escalation Rules

- If a Complete A4/Letter label fails physically, route users to same-stock
  continuation output or the other verified complete stock before printing.
- If a QR small label or Identification small label fails physically, keep CAS,
  English name, Chinese name, QR when present, and pictograms first; scale and
  reflow before creating same-output continuation labels; never remove
  available pictograms to make the layout pass.
- If QR fails, increase QR size or move the QR small label to a larger verified
  small-label stock. Do not let QR replace GHS pictograms or complete-label
  requirements.
- If browser or driver scaling creates unavoidable drift, document the required
  print setting and consider adding in-app print guidance for that stock.
- If a stock repeatedly fails physical validation, mark it experimental or move
  it behind advanced/custom stock controls until it has a reliable path.
