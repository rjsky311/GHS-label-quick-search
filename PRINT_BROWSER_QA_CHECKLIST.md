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
When compact stock rendering changes, the freshness check must also prove that
stock-specific markers such as `label-stock-small-rack` and
`label-stock-medium-rack` are present in the deployed bundle. Content-policy
changes must also prove that policy markers such as
`label-content-`, `label-hazard-mode-`, `h_codes_only`, and `qr_reference`
are present.

For the normal post-deploy print gate, use the combined runner:

```bash
cd frontend
npm run qa:production-print
```

This generates `build/print-qa-report.json`, launches the deployed site through
the production handoff runner, renders local print HTML artifacts into PDFs,
writes `build/production-print-handoff-report.json` and
`build/print-pdf-report.json`, writes
`build/production-print-qa-summary.json`, and captures preview screenshots under
`build/production-print-screenshots/`. It also runs bundle freshness and search
UI checks before the matrix handoff. Use the lower-level commands below only
when debugging one part of the flow.

The same deployed-browser matrix can also run in GitHub Actions through
`Production Print QA` (`.github/workflows/production-print-qa.yml`). Trigger it
manually with one of these modes:

- `product`: default five-block closure gate for user-facing product work.
- `smoke`: fast high-risk deployed print path.
- `primary`: full-page primary and continuation outputs.
- `compact`: compact bottle/rack/QR/quick-ID outputs.
- `multi-chemical`: cross-chemical production-searchable outputs.
- `prepared`: prepared creation, reprint, and preset reuse.
- `full`: local print matrix + PDF artifacts + deployed handoff.
- `all`: `full` plus prepared workflow QA.

The workflow also runs the `product` mode on a weekly schedule and uploads JSON
reports, screenshots, print HTML artifacts, generated PDFs, and the summary
manifest as a GitHub artifact.

Physical paper/stock validation is tracked separately in
`PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`. Use that checklist after automated
Browser/PDF/production gates pass when a change affects real printer behavior,
paper stock, roll labels, QR scan reliability, or physical readability. After
`build/print-qa-report.json` exists, run `npm run qa:physical-print-plan` to
generate the current physical-print work order under `frontend/build/`.

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
Hydrochloric Acid, Formaldehyde, Ethanol, Sodium Hydroxide, Methanol, Hydrogen
Peroxide, Nitrogen, Zinc Oxide, and Boric Acid outputs, while skipping local
fixture-only `QA-*` cases. In
addition to the handoff status attributes, it inspects the preview iframe
geometry and fails when required identity text, CAS, GHS pictograms, signal
word, QR, or support chips are hidden or clipped before print handoff. It also
verifies the exact GHS pictogram set, the required/forbidden language-specific
identity names, actual B/W image filtering, and minimum visible GHS/QR image
sizes so compact labels cannot silently regress into unreadable output. The
matrix also carries stock-fit expectations from the renderer contract; selected
case/support chips must be visibly inside the preview label and must not collide
with pictograms, QR blocks, or the signal word. The
Formaldehyde case is intentionally dense enough to require continuation-page
complete-primary output; it must keep the preview intact, keep the print action
enabled, hand off multiple complete-primary pages, and preserve identity, CAS,
signal word, and every pictogram on the continuation pages instead of clipping
or hiding statements. Use
`PRINT_QA_SEARCH_TERM=7647-01-0` for the older Hydrochloric-Acid-only pass,
`PRINT_QA_CASES=tube-vial-quick-id-with-case` for one high-risk compact case, or
`PRINT_QA_CASES=all` to explicitly request the same real production-searchable
default set.
The script actively clicks the target, stock, name-display, color-mode, custom
field, and print controls before reading the QA handoff status; do not treat the
report as a static preview-only check. After selecting a target or stock, it
waits until the visible selected state and preview iframe label-kind/stock
classes match the matrix contract before taking evidence, so fast CI runners do
not accidentally validate a stale modal state. Production search acquisition
also retries a small number of times when PubChem or the backend returns a
temporary no-action result, but it still fails if no usable selectable result is
available after those retries.
Set `PRINT_QA_SCREENSHOT_DIR` to save preview iframe screenshots for visual
review. The script writes `build/production-print-handoff-report.json` by
default; set `PRINT_QA_HANDOFF_REPORT_PATH` only when a different report path is
needed. Console output is concise by default; set `PRINT_QA_VERBOSE=1` when the
full JSON report is needed in terminal output. Failure summaries include the
case id, search term, print-button state, preview label kind, and preview text
sample so blocked output is diagnosable without opening the full JSON first.
The script uses `playwright-core` with the local Chrome/Edge executable; if discovery fails, set
`PLAYWRIGHT_CHROME_EXECUTABLE_PATH`.

For prepared-solution production clickthrough, run:

```bash
cd frontend
npm run qa:production-prepared
```

This opens the deployed site in Chrome/Edge, searches Hydrochloric Acid, enters
the detail workflow, creates a prepared solution, opens the label print modal,
and verifies A4 primary, bottle supplemental, and tube quick-ID prepared outputs.
It also covers prepared-sidebar reprint and prepared preset reuse for the same
output families. The preset branch records preset prefill evidence and proves
that stale operational fields are not carried into new prepared labels. The QA
fixture uses run-relative prepared and expiry dates so the production check
stays fresh over time instead of becoming a date-expired artifact.

For result-table and pictogram presentation changes, run:

```bash
cd frontend
npm run qa:production-search-ui
```

This opens the deployed search page in Chrome/Edge, searches Hydrochloric Acid,
captures `build/production-search-ui-screenshots/search-results.png`, checks
the result-row action buttons for vertical text regressions, verifies the
visible GHS pictogram strip uses square readable tiles, checks the deployed
results-page trust note, source badge, product trust panel, separated
data-correction/workflow support links, and PubChem SDS link shape, expands the
alternate classification drawer, captures
`build/production-search-ui-screenshots/search-results-expanded-classifications.png`,
checks each expanded classification card for a shared pictogram strip with
readable official-symbol imagery, then opens the detail modal and captures
`build/production-search-ui-screenshots/detail-modal-classification-comparison.png`.
The detail pass verifies that the selected classification uses the shared
`selected` strip variant, every comparison-table pictogram image loads and
remains readable, and every detail reference link exposes safe
`http`/`https`, known type, and non-empty source metadata. Treat failures such
as `result-ghs-pictogram-*`, `other-classification-*-pictogram-*`,
`detail-comparison-*-pictogram-*`, `results-*-missing`,
`detail-reference-*-missing`, or `result-action-button-vertical-text` as
product regressions, not just test noise.

After generating `build/print-html-artifacts/`, the print/PDF artifact gate can
be run independently:

```bash
cd frontend
PRINT_QA_PRINT_HTML_DIR=build/print-html-artifacts npm run qa:print-pdf
```

This loads each generated print document with Chrome print media, exports a PDF
with `preferCSSPageSize`, verifies the PDF header/size, and checks the print DOM
for loaded images, exact GHS pictogram sets, QR state, `more-pics` absence, and
visible overflow/clipping in identity, hazard, QR, and compliance containers.
It also fails on compact visual-overlap classes such as pictogram collision
with CAS, signal word, product name, QR, or the label boundary.
It reads the stock-fit expectations generated by `qa:print-report`, so
undersized stock-specific pictograms or QR blocks fail the PDF gate even when
the DOM contains all required elements.

## Required Evidence

Record these outputs in the final implementation note:

- Commit hash.
- CI run URL and conclusion.
- Production bundle asset name.
- Browser target URL.
- Handoff report path.
- Production QA summary report path.
- PDF report path.
- PDF artifact directory.
- Search term and selected chemical.
- Decision summary text for each tested output.
- Content policy for each tested output: output role, H-text mode, P-text mode,
  and detail source from `build/print-qa-report.json`.
- Preview mode state: `Fit` should be the default whole-label view, and changing
  target or stock after using `Inspect` should return the preview to `Fit`.
- First-screen visual context: `preview-context-strip` must show exactly the
  output role, GHS pictogram preservation state, and current stock. Do not
  accept a regression that replaces it with a long row of template, density,
  orientation, language, and color chips on the default path.
- Multi-page and continuation outputs must show preview page controls. Use them
  to inspect at least the second continuation page before accepting the print
  flow.
- Preview `srcdoc` and geometry checks for label-kind class, pictogram codes,
  exact pictogram-set parity, signal-word visibility, chemical identity-name
  visibility, required/forbidden language state, QR presence, minimum visible
  GHS/QR image size, CAS/support-chip visibility, actual B/W image filtering,
  critical-element clipping, preview/print handoff pictogram parity, and
  `more-pics` absence.
- Print button enabled/disabled state for allowed and blocked outputs. Every
  printable matrix case must prove that the print button is enabled before the
  QA handoff click. Continuation cases must also prove that
  `data-total-labels` and `data-total-pages` are greater than one.
- `print-qa-status` after clicking the print action in QA handoff mode.
  Capture its `data-label-kind`, `data-pictograms`, `data-has-qr`,
  `data-cas-numbers`, `data-has-cas`, `data-label-width-mm`,
  `data-label-height-mm`, `data-page-size`, `data-template`,
  `data-stock-preset`, `data-auto-fit-level`, `data-total-labels`,
  `data-total-pages`, and `data-support-chips` attributes when available.

Do not use the OS print dialog as the primary QA signal. It can block the
browser automation session. Verify the print button state and the exact preview
fragment; only click print when intentionally testing the native dialog path.

### Product-Level Production Gate

Use:

```bash
npm run qa:production-product
```

This runs the deployed print smoke gate, deployed prepared-solution gate, and
then writes `build/production-product-qa-report.json`. The summary maps evidence
back to the five active product blocks: print renderer/stock fit, result-table
pictogram unity, trust/source/SDS boundaries, prepared reprints, and
whole-product UX/support positioning. Use this gate when closing broad
productization rounds rather than a single renderer or search-table fix.

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
12. Confirm the preview context strip contains only output role, GHS icon
   preservation, and current stock; full configuration details should stay in
   the lower inspection strip or advanced controls.
13. Choose `Bottle label` and confirm it routes to the bottle stock and the
   planner changes dense content to supplemental rather than hiding pictograms.
14. Expand `stock-size-picker`, choose another stock, and confirm the selected
   stock summary plus preview update.
15. Confirm the responsible profile section is collapsed when profile data is
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
- Small-rack and medium-rack quick-ID outputs keep CAS, signal word, product
  identity, and every pictogram visible without overlap.
- Small-rack and medium-rack QR outputs keep QR and every pictogram visible
  without QR/pictogram collision.
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
cover A4 Primary, Letter Primary, A4 Chinese/B&W, Letter English/B&W, bottle
supplemental, bottle supplemental with case identity, Avery 5163, Avery 5164,
rack landscape, tube/vial quick-ID, tube/vial quick-ID with case identity,
Brother 62 mm quick-ID, QR supplement, Brother 62 mm QR supplement, and custom
tiny supplemental stock for Hydrochloric Acid, plus lower-density Ethanol,
Sodium Hydroxide QR, Methanol B/W, Hydrogen Peroxide English QR, sparse
single-pictogram Nitrogen, Zinc Oxide, and Boric Acid outputs, and long-name
corrosive bottle and tube fixtures that verify identity shrink rules keep CAS
visible. Blocked custom complete-primary cases remain in the matrix report but
are excluded from PDF artifact generation because they should not reach print
handoff.

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
- `data-auto-fit-level` is present and matches the preview/report expectation.
  Dense compact labels should show a tighter level instead of clipping identity,
  CAS, signal, QR, or GHS pictograms.
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
