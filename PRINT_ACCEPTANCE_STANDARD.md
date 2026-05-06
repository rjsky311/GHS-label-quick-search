# Print Acceptance Standard

This document defines the product acceptance bar for GHS label output. It is a product and engineering standard, not legal advice. Final use still requires the official SDS, supplier label, and local regulations.

Deployment and Browser Use verification steps live in `PRINT_BROWSER_QA_CHECKLIST.md`.

## Grounding References

- OSHA HazCom Appendix C: product identifier, responsible party information, signal word, hazard statements, pictograms, and precautionary statements are the core shipped/container label elements.
- OSHA HazCom side-by-side comparison: product identifier, signal word, hazard statements, pictograms, precautionary statements, and responsible party information must be provided; signal word, hazard statements, and pictograms must be located together.
- Taiwan GHS overview: GHS communication elements include pictograms, signal words, hazard statements, precautionary information, product/chemical identifier, and supplier identifier.
- BAuA CLP/GHS pictogram guidance: pictograms should remain visually prominent and have practical minimum area. This app uses that principle as a conservative UX guardrail, even when a small label is only supplemental.

Reference URLs:

- https://www.osha.gov/hazcom/appendix-c
- https://www.osha.gov/hazcom/side-by-side
- https://ghs.osha.gov.tw/ENG/intro/ghsScope.aspx
- https://www.baua.de/EN/Topics/Chemicals-biological-agents/Hazardous-substances/Classification-and-labelling/Labelling-elements/Hazard-pictograms-and-signal-words

## Output Classes

### Complete Primary

Use for shipped-container style output and main container labels.

Acceptance gates:

- Product identifier is present.
- CAS is present when available.
- Signal word is present when available.
- Every available GHS pictogram is printed once in the label body.
- H-statements are printed without `+N` summaries.
- P-statements are printed without `+N` summaries.
- Responsible lab/supplier name, phone, and address are present.
- QR code is not embedded in the primary body unless a future fit check proves it cannot compromise the required layout.
- The print action is blocked when required responsible profile fields are missing.

### Container Supplemental

Use when a real bottle/container stock cannot truthfully carry the complete primary content.

Acceptance gates:

- Workflow visibly calls the output supplemental.
- Printed label body does not claim to be a complete primary label.
- Product identifier and CAS are present when available.
- Signal word is present when available.
- Every available GHS pictogram is printed.
- GHS pictograms are visually prioritized before H/P text summaries.
- H-statements may be summarized only after typography and layout scaling have been attempted.
- P-statements may be summarized before H-statements when space is limited.
- Print must remain available when the output is truthful as supplemental.

### QR / SDS Supplemental

Use for fast lookup, reprint, SDS, or detail access.

Acceptance gates:

- QR is present and sized to the physical label.
- The label includes product identity, CAS when available, signal word when available, and every available GHS pictogram.
- The label is clearly supplemental in workflow text.
- QR never replaces GHS pictograms.
- QR never replaces a complete primary label when a complete primary label is required.

### Quick ID

Use for bench-side identification where the label is not expected to carry full hazard language.

Acceptance gates:

- Product identity is present.
- Every available GHS pictogram is printed.
- Signal word is present when available.
- The workflow makes clear this is identification/supplemental output.

## Readability Gates

These are acceptance targets for the renderer and Browser QA:

- Preview and print use the same rendered HTML fragment.
- A4 and Letter primary labels show the whole label in preview without clipping.
- Small labels reflow and scale before content is summarized.
- Compact summaries prioritize severe H-statements and response/PPE P-codes before lower-priority storage/disposal text.
- GHS pictograms are never hidden behind QR, summarized as `+N`, or omitted.
- Strip-style labels place pictograms in a horizontal row when that preserves recognizability better than a tall rail.
- Color mode and black-and-white mode both preserve pictogram recognizability.
- Chinese, English, and bilingual modes all update the preview and printed HTML.
- The print button is disabled only when the app lacks required data or cannot produce a truthful printable output.
- The first-level print workflow shows a concise decision summary before stock details: output role, GHS icon handling, and H/P text handling.
- Less common stock sizes remain available but are collapsed behind a secondary control so the main workflow does not read like a template catalog.
- Responsible lab/supplier fields are collapsed unless the selected complete-primary output is blocked by missing profile data.
- Custom stock size controls remain advanced and must still pass the same planner rules as curated stock.

## Required QA Matrix

Run this matrix before shipping print-workflow changes:

| Chemical | Output | Language | Color | Required result |
| --- | --- | --- | --- | --- |
| Hydrochloric Acid | A4 Primary | Bilingual | Color | Complete primary, no QR body, no H/P summaries, all pictograms |
| Hydrochloric Acid | Letter Primary | Bilingual | Color | Complete primary, Letter page, no QR body, all pictograms |
| Hydrochloric Acid | Standard Bottle | Bilingual | Color | Supplemental, printable, all pictograms, no `more-pics` |
| Hydrochloric Acid | Large Primary | Bilingual | Color | Complete primary when the content fits, all pictograms, no H/P summaries |
| Hydrochloric Acid | 2 x 4 in / medium sheet | Bilingual | Color | Recommends full-page primary and keeps the medium output supplemental |
| Hydrochloric Acid | Vial Strip / Small Stock | Bilingual | Color | Supplemental, printable, all pictograms, strip pictogram row |
| Hydrochloric Acid | QR Supplement | English | B/W | QR present, all pictograms, no Chinese body text, B/W filter |
| Hydrochloric Acid | Custom tiny stock | Bilingual | Color | Cannot bypass full-page recommendation for complete primary; supplemental remains printable |
| Ethanol | Standard Bottle | Bilingual | Color | Lower-density supplemental/primary-candidate path remains readable |
| Water / no GHS | Any hazard label | Any | Any | Does not present false hazard data |
| Upstream error | Results and print entry | Any | Any | Does not present missing data as no hazard |

## Code-Level Checks

Unit tests should keep these invariants pinned:

- Complete primary bodies do not contain `qrcode-img`, `hazard-more`, or `precaution-more`.
- Every expected pictogram code appears in the printed body.
- Supplemental and QR labels carry explicit `label-kind-*` classes.
- Small QR labels keep QR plus every expected pictogram in the printed body.
- Strip labels use a four-pictogram row for dense multi-pictogram chemicals.
- Pictogram dimensions and visible H/P budgets increase with available physical label area.
- Custom tiny complete-primary configs route to A4/Letter instead of enabling an invalid primary label.
- Custom supplemental configs keep every pictogram and print as supplemental, not complete primary.
- Compact standard and QR labels show the highest-priority H/P items first when summary budgets are limited.
- No-GHS and upstream-error cases are blocked from hazard-label printing with distinct planner issues.
- Browser Use production checks must include actual search, checkbox selection, modal opening, stock/purpose switching, language switching, color switching, and print-button enabled/disabled state.
- Targeted local print contract checks are available with `npm run test:print-contract` from `frontend/`.
