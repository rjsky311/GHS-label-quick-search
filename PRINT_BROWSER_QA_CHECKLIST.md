# Print Browser QA Checklist

This checklist turns the print acceptance contract into repeatable Browser Use
verification after meaningful print-workflow changes and after Zeabur deploys.
It is not a legal compliance certificate; it verifies that the app UI, preview,
and rendered print fragments still match the product contract.

Use the production URL unless the purpose is local development debugging:

- Production: `https://ghs-frontend.zeabur.app/`
- Local: `http://127.0.0.1:5173/`

Before using production, verify the deployed bundle contains the expected new
strings or behavior from the commit being tested. This catches stale Zeabur
assets before doing visual QA.

For print-workflow changes, run the bundle freshness check after Zeabur deploys:

```bash
cd frontend
npm run qa:production-bundle
```

The script fetches the production HTML, resolves the active `assets/index-*.js`
bundle, and verifies that the bundle contains the current print QA handoff,
layout-blocked, CAS/size, and compact identity markers. It does not replace
Chrome click-through QA; it only confirms that production is serving the code
you are about to test.

For automated click-through checks that must press the print action, append
`?qaPrintHandoff=1` or `&qaPrintHandoff=1` to the browser URL. In this mode the
app still builds the print iframe, runs preflight, records lifecycle events, and
publishes `print-qa-status`, but it does not open the native print dialog. Do
not use this parameter for a normal manual print attempt.

After generating `build/print-qa-report.json`, the production handoff can be
checked with a local Chrome/Edge browser:

```bash
cd frontend
PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:production-handoff
```

By default this runs every real production-searchable case in the matrix:
Hydrochloric Acid, Ethanol, and Sodium Hydroxide outputs, while skipping local
fixture-only `QA-*` cases. In addition to the handoff status attributes, it
inspects the preview iframe geometry and fails when required identity text, CAS,
GHS pictograms, signal word, QR, or support chips are hidden or clipped before
print handoff. It also verifies the exact GHS pictogram set, at least one
chemical identity name, and minimum visible GHS/QR image sizes so compact labels
cannot silently regress into unreadable output. Use
`PRINT_QA_SEARCH_TERM=7647-01-0` for the older Hydrochloric-Acid-only pass,
`PRINT_QA_CASES=tube-vial-quick-id-with-case` for one high-risk compact case, or
`PRINT_QA_CASES=all` to explicitly request the same real production-searchable
default set.
The script actively clicks the target, stock, name-display, color-mode, custom
field, and print controls before reading the QA handoff status; do not treat the
report as a static preview-only check.
Set `PRINT_QA_SCREENSHOT_DIR` to save preview iframe screenshots for visual
review. The script writes `build/production-print-handoff-report.json` by
default; set `PRINT_QA_HANDOFF_REPORT_PATH` only when a different report path is
needed. Console output is concise by default; set `PRINT_QA_VERBOSE=1` when the
full JSON report is needed in terminal output. The script uses `playwright-core`
with the local Chrome/Edge executable; if discovery fails, set
`PLAYWRIGHT_CHROME_EXECUTABLE_PATH`.

## Required Evidence

Record these outputs in the final implementation note:

- Commit hash.
- CI run URL and conclusion.
- Production bundle asset name.
- Browser target URL.
- Handoff report path.
- Search term and selected chemical.
- Decision summary text for each tested output.
- Preview mode state: `Fit` should be the default whole-label view, and changing
  target or stock after using `Inspect` should return the preview to `Fit`.
- Preview `srcdoc` and geometry checks for label-kind class, pictogram codes,
  exact pictogram-set parity, signal-word visibility, chemical identity-name
  visibility, QR presence, minimum visible GHS/QR image size, CAS/support-chip
  visibility, B/W state, language state, critical-element clipping,
  preview/print handoff pictogram parity, and `more-pics` absence.
- Print button enabled/disabled state for allowed and blocked outputs. Every
  printable matrix case must prove that the print button is enabled before the
  QA handoff click.
- `print-qa-status` after clicking the print action in QA handoff mode.
  Capture its `data-label-kind`, `data-pictograms`, `data-has-qr`,
  `data-cas-numbers`, `data-has-cas`, `data-label-width-mm`,
  `data-label-height-mm`, `data-page-size`, `data-template`,
  `data-stock-preset`, and `data-support-chips` attributes when available.

Do not use the OS print dialog as the primary QA signal. It can block the
browser automation session. Verify the print button state and the exact preview
fragment; only click print when intentionally testing the native dialog path.

## Baseline Scenario: Hydrochloric Acid

1. Open the browser target.
2. Search `7647-01-0`.
3. Confirm the result contains `Hydrochloric Acid`.
4. Select the result checkbox.
5. Open `Print Labels`.
6. Confirm the modal decision summary says:
   - Output role: complete primary.
   - GHS icons: all pictograms kept.
   - Hazard text: full H/P text.
7. Confirm `print-outcome-summary` states the printable outcome in plain
   language before the lower-level checklist.
8. Confirm output/readability diagnostics are collapsed below the live label
   preview unless the user opens them.
9. Confirm the footer print action uses the same outcome language, for example
   complete primary, supplemental bottle/tube, or QR supplement.
10. Confirm `selected-stock-summary` shows the current physical target size and
   `stock-size-picker` is collapsed until the user chooses to change stock.
11. Confirm the first-level target selector is task-based (`Main container`,
   `Bottle label`, `Tube / vial`, `QR supplement`) rather than a template list.
12. Choose `Bottle label` and confirm it routes to the bottle stock and the
   planner changes dense content to supplemental rather than hiding pictograms.
13. Expand `stock-size-picker`, choose another stock, and confirm the selected
   stock summary plus preview update.
14. Confirm the responsible profile section is collapsed when profile data is
   complete and expands automatically when profile data is missing.

## Full-Page Primary Outputs

For both A4 Primary and Letter Primary:

- Select the stock button.
- Confirm `label-kind-complete-primary` is present in the label preview
  fragment.
- Confirm `GHS04`, `GHS05`, `GHS06`, and `GHS07` are present.
- Confirm no `<img class="qrcode-img">` appears in the primary label fragment.
- Confirm no `hazard-more`, `precaution-more`, or `more-pics` marker appears.
- Confirm the print action is enabled only when the responsible profile is
  complete.

## Supplemental Bottle Output

1. Select the common bottle stock.
2. Confirm the decision summary changes to supplemental output.
3. Confirm `label-kind-supplemental` is present.
4. Confirm all expected GHS pictogram codes are present.
5. Confirm `more-pics` is absent.
6. Confirm the responsible profile status is optional for this output.
7. Confirm the print action remains enabled for a truthful supplemental label.

## QR Supplement Output

1. Select QR supplement.
2. Switch name display to English.
3. Switch print color to B/W.
4. Confirm the decision summary says QR supplement.
5. Confirm `label-kind-qr-supplement` is present.
6. Confirm `<img class="qrcode-img">` is present.
7. Confirm `print-bw` is present.
8. Confirm Chinese body text for the chemical is absent in English mode.
9. Confirm all expected pictogram codes are still present.
10. Confirm `more-pics` is absent.

## Quick-ID Tube / Vial Output

1. Select `Tube / vial`.
2. Confirm the decision summary says quick-ID supplemental output.
3. Confirm `label-kind-quick-id` is present.
4. Confirm `<img class="qrcode-img">` is absent.
5. Confirm all expected GHS pictogram codes are present.
6. Confirm `more-pics` is absent.
7. Click the print action with `qaPrintHandoff=1` and confirm
   `print-qa-status` reports `data-label-kind="quick-id"` plus all expected
   pictograms.

## Missing Profile Gate

1. Select A4 or Letter complete primary.
2. Clear the responsible profile.
3. Confirm the decision summary changes to profile required.
4. Confirm the responsible profile section has `open`.
5. Confirm the print action is disabled and names the required profile fix.
6. Fill organization, phone, and address.
7. Confirm the decision summary returns to complete primary.
8. Confirm the print action is enabled.

## Additional Coverage Before Shipping Larger Print Changes

Run these when the change touches stock presets, typography, output planning,
or renderers:

- Ethanol `64-17-5` bottle output remains readable and printable.
- A small stock or vial-strip output keeps every pictogram and does not claim to
  be complete primary.
- A no-GHS chemical does not produce a false hazard label.
- A transient upstream-error result blocks hazard-label printing.
- Custom tiny complete-primary stock routes to A4/Letter instead of enabling an
  invalid primary label.
- Custom supplemental stock stays printable as supplemental and keeps every
  pictogram.

## Local Code Contract

Run this targeted print contract before the full suite when iterating on print:

```bash
cd frontend
npm run test:print-contract
```

To generate a machine-readable print QA matrix report for the core production
outputs, run:

```bash
cd frontend
PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report
```

On Windows PowerShell:

```powershell
cd frontend
$env:PRINT_QA_REPORT_PATH='build/print-qa-report.json'; npm run qa:print-report
```

When a visual browser pass is needed but the app backend is not the thing under
test, also emit preview HTML artifacts:

```powershell
cd frontend
$env:PRINT_QA_REPORT_PATH='build/print-qa-report.json'
$env:PRINT_QA_PREVIEW_DIR="$env:TEMP\ghs-print-qa-previews"
npm run qa:print-report
```

Serve that directory with a local static server and inspect the individual
HTML files in Browser Use. Prefer a temp directory rather than `build/` for
long-lived visual inspection so Vite can freely clean the production build
directory. These artifacts reuse the same preview renderer as the app and now
cover A4 Primary, Letter Primary, bottle supplemental, Avery 5163, Avery 5164,
rack landscape, tube/vial quick-ID, Brother 62 mm quick-ID, QR supplement, and
Brother 62 mm QR supplement for Hydrochloric Acid, plus lower-density Ethanol,
single-pictogram Sodium Hydroxide, and long-name corrosive bottle and tube
fixtures that verify identity shrink rules keep CAS visible.

The report records the expected `qa_handoff` attributes, preview scale, actual
print-document HTML checks, and a `productionBrowserQa` section listing the
production URL, QA handoff URL, required `print-qa-status` attributes, search
term, expected label kind, expected stock, expected QR state, and required
pictograms for each matrix case. It also includes stable selectors and
case/custom-field steps so production Chrome QA can be repeated without
re-inventing the workflow each time. Use it as a code-level and renderer-level
gate before doing production Browser QA; it does not replace clicking the
deployed app because it cannot verify Zeabur freshness or extension/browser
behavior.

For production Chrome or Browser QA, append `?qaPrintHandoff=1` to the deployed
frontend URL before clicking the print action. In that mode the app performs the
same image and layout preflight, publishes a hidden `print-qa-status` element,
and avoids opening the native print dialog. Verify these attributes after each
case:

- `data-status="qa_handoff"` for printable output, or `data-status="blocked"`
  with `data-issue-types` for blocked output.
- `data-label-kind` matches `complete-primary`, `supplemental`, `quick-id`, or
  `qr-supplement`.
- `data-pictograms` contains every expected GHS code for the chemical.
- `data-has-qr` is `true` only for QR supplemental labels.
- `data-cas-numbers` contains the selected chemical's CAS number and
  `data-has-cas="true"` so small-label identity fields cannot disappear
  silently.
- `data-label-width-mm`, `data-label-height-mm`, and `data-page-size` match the
  selected stock. This is the production check for "the user selected this
  physical label, not just some printable fallback."
- `data-template` and `data-stock-preset` match the selected target.
- If production blocks a print, the alert must name the current stock and
  physical size. A blocked job is only acceptable when the message tells the
  user how to get a truthful output instead of merely refusing the print.
- When batch/case-style custom identity data is filled in, compact supplemental
  labels must keep it as an identity chip while still keeping CAS and every GHS
  pictogram visible.
- The QA matrix includes a compact quick-ID case with
  `CASE-2026-0007`; that case must keep the case identity in both preview and
  generated print HTML.

The full shipping gate is still:

```bash
cd frontend
npm run test:i18n
npm test -- --runInBand
npm run build
cd ../backend
python -m pytest test_name_search.py -q
```
