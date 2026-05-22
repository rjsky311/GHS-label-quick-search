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

Validate representative outputs for these families before claiming print
workflow stability:

| Family | Representative output | Required physical evidence |
| --- | --- | --- |
| A4 primary | Hydrochloric Acid A4 primary | Complete primary label fits, all pictograms readable, no QR in required body |
| Letter primary | Hydrochloric Acid Letter primary | Same as A4, with Letter paper selected |
| Continuation primary | Formaldehyde A4 primary | Multiple pages print in order; every page repeats identity and pictograms |
| Standard bottle | Hydrochloric Acid bottle supplemental | Supplemental wording is truthful; all pictograms remain readable |
| Large front label | Hydrochloric Acid large container front | Identity and pictograms dominate; text priority is clear |
| Tube/vial strip | Hydrochloric Acid quick-ID with case number | CAS/case identity remains visible; no pictogram is cropped |
| Rack label | Small or medium rack quick-ID | Compact layout remains readable at normal handling distance |
| 62 mm continuous | 62 mm quick-ID or QR supplement | Roll output does not clip at edges; pictograms remain large enough |
| QR supplement | QR supplement with Hydrochloric Acid | QR scans quickly; pictograms remain present and not replaced by QR |
| Prepared solution | Prepared Hydrochloric Acid bottle or tube | Parent identity, concentration, solvent, dates, and pictograms stay visible |

## 3. Chemical Coverage

Use at least these chemicals because they stress different failure modes:

- Hydrochloric Acid (`7647-01-0`): four pictograms, dense H/P content, compact
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
- The app's output role matches the physical output: complete primary,
  supplemental, quick-ID, QR supplement, or continuation set.

Expected handling distances:

- A4/Letter primary: readable at desk distance.
- Bottle/large front label: readable while holding the container.
- Tube/vial/rack/62 mm labels: identity, CAS/case, signal, and pictograms must
  be readable at close handling distance; full H/P text is not expected on
  quick-ID or supplemental outputs.

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

- If a complete primary label fails physically, route users to A4/Letter,
  continuation output, or another verified complete stock before printing.
- If a compact supplemental label fails physically, keep pictograms and identity
  first; scale/reflow before summarizing text; never remove available
  pictograms to make the layout pass.
- If QR fails, increase QR size or move to a larger QR supplement stock. Do not
  let QR replace GHS pictograms or complete primary requirements.
- If browser or driver scaling creates unavoidable drift, document the required
  print setting and consider adding in-app print guidance for that stock.
- If a stock repeatedly fails physical validation, mark it experimental or move
  it behind advanced/custom stock controls until it has a reliable path.
