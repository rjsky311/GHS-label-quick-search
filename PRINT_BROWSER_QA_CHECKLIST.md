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

## Required Evidence

Record these outputs in the final implementation note:

- Commit hash.
- CI run URL and conclusion.
- Production bundle asset name.
- Browser target URL.
- Search term and selected chemical.
- Decision summary text for each tested output.
- Preview `srcdoc` checks for label-kind class, pictogram codes, QR presence,
  B/W state, language state, and `more-pics` absence.
- Print button enabled/disabled state for allowed and blocked outputs.

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
7. Confirm `selected-stock-summary` shows the current physical target size and
   `stock-size-picker` is collapsed until the user chooses to change stock.
8. Expand `stock-size-picker`, choose another stock, and confirm the selected
   stock summary plus preview update.
9. Confirm the responsible profile section is collapsed when profile data is
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

The full shipping gate is still:

```bash
cd frontend
npm run test:i18n
npm test -- --runInBand
npm run build
cd ../backend
python -m pytest test_name_search.py -q
```
