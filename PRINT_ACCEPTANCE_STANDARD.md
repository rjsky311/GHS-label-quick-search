# Print Acceptance Standard

This document defines the product acceptance bar for GHS label output. It is a product and engineering standard, not legal advice. Final use still requires the official SDS, supplier label, and local regulations.

Deployment and Browser Use verification steps live in
`PRINT_BROWSER_QA_CHECKLIST.md`. Real paper, label stock, printer scaling, QR
scan, and physical readability checks live in
`PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`; generate the current work order with
`npm run qa:physical-print-plan` after `qa:print-report`.
Fixed-stock batch-print requirements live in
`BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.

## Grounding References

- OSHA HazCom Appendix C: product identifier, responsible party information, signal word, hazard statements, pictograms, and precautionary statements are the core shipped/container label elements.
- OSHA HazCom side-by-side comparison: product identifier, signal word, hazard statements, pictograms, precautionary statements, and responsible party information must be provided; signal word, hazard statements, and pictograms must be located together.
- Taiwan GHS overview: GHS communication elements include pictograms, signal words, hazard statements, precautionary information, product/chemical identifier, and supplier identifier.
- BAuA CLP/GHS pictogram guidance: pictograms should remain visually prominent and have practical minimum area. This app uses that principle as a conservative UX guardrail, even when a small label is only supplemental.
- ECHA CLP labelling guidance and recent CLP revision material: label text
  should remain easily readable; 1.2 mm x-height is a useful reference floor,
  line spacing should not collapse, and pictograms should scale with the label
  area rather than stay tiny on larger labels.
- EPA electronic-label specifications: 12 point is preferred for most
  regulatory text and 6 point is a practical minimum reference for printed
  label text. This app uses that as a conservative lower bound for complete
  primary label prose, while compact supplemental chips may be smaller only
  when they are identity/code helpers rather than full instructions.
- DENSO WAVE QR implementation guidance: QR codes need a four-module quiet
  zone and module size must reflect printer resolution. For general phone
  scanning, this app treats about 20 mm square as the practical default floor
  for QR supplements unless a specific physical-printer validation proves a
  smaller code reliable.

Reference URLs:

- https://www.osha.gov/hazcom/appendix-c
- https://www.osha.gov/hazcom/side-by-side
- https://ghs.osha.gov.tw/ENG/intro/ghsScope.aspx
- https://www.baua.de/EN/Topics/Chemicals-biological-agents/Hazardous-substances/Classification-and-labelling/Labelling-elements/Hazard-pictograms-and-signal-words
- https://www.prevencionintegral.com/sites/default/files/noticia/47842/field_adjuntos/clplabellingen.pdf
- https://circabc.europa.eu/d/d/workspace/SpacesStore/90ee0974-9aac-4ba3-a8e9-630bd1836906/AP5_Open_session_CLP%20revision%20-%20provisional%20agreement_presentation.pdf
- https://www.epa.gov/sites/default/files/2017-02/documents/full_specs.pdf
- https://www.qrcode.com/en/howto/code.html
- https://www.qrcode.com/en/howto/cell.html
- https://qrplanet.com/help/article/what-is-the-minimum-size-of-a-qr-code

## Output Classes

### Content Policy Matrix

The renderer, planner, modal copy, and QA matrix must use the shared content
policy in `frontend/src/utils/printContentPolicy.js`. These terms are product
terms, not just CSS classes:

| Output role | Hazard text policy | P text policy | Detail source |
| --- | --- | --- | --- |
| Complete primary | Full H/P on the printed label | Full P text | Printed A4/Letter or other verified complete primary |
| Complete primary continuation | Full H/P split across pages | Full P text split across pages | Printed continuation set |
| Container front | Priority H summaries when roomy, H codes only when compact | Omitted from the face label | A4/Letter primary, SDS/QR, or back/fold-out label |
| Quick-ID | No full H/P text | Omitted | Complete primary or SDS |
| QR supplement | QR/SDS reference with optional teaser only when it fits | Omitted | QR/SDS path plus complete primary when required |

Bilingual labels are preferred when readable, but compact physical labels may
fall back to the active language for names and statements. That fallback is a
policy decision, not an ad hoc renderer deletion.

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
- If the complete H/P text is too dense for one A4/Letter primary page, the app
  prints a continuation set instead of clipping or silently omitting statements.
  Each continuation page repeats product identity, CAS, signal word, all
  available GHS pictograms, responsible profile, and a continuation marker.

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
- P-statements are intentionally omitted from the front face by default; the
  UI must state that complete H/P content belongs on A4/Letter primary,
  continuation pages, SDS/QR, or another complete source.
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
- CAS is present when available.
- Every available GHS pictogram is printed.
- Signal word is present when available.
- The workflow makes clear this is identification/supplemental output.

## Readability Gates

These are acceptance targets for the renderer and Browser QA:

- Page geometry must fit the selected sheet before printing. The physical grid
  width and height must fit inside the selected page, margins, padding, and
  footer clearance. A rendered PDF must not create blank overflow pages.
- Standard A4 portrait sheet presets should use the sheet efficiently:
  large-primary is 3/page without blank interleaved pages, medium bottle is
  10/page, and 70 x 24 mm vial strips are 20/page on portrait A4. Any future
  stock change must update this document and the PDF QA matrix.
- Complete-primary prose should stay at or above roughly 6 point equivalent.
  Prefer 8-12 point where the label size allows it. Supplemental identity
  chips may go below this only for short CAS/case/code text; long H/P prose
  below this floor must become H-code summary, QR/SDS reference, continuation,
  or a larger stock recommendation.
- QR supplements should default to a stock that can keep a QR code near the
  practical 20 mm floor plus quiet zone. A 70 x 24 mm vial strip may remain a
  quick-ID label, but it should not be the default QR supplement stock.
- GHS pictograms on compact supplemental labels should not fall below the
  renderer's stock-specific minimums. For complete or large-front labels,
  pictograms must grow with the label and remain visually dominant instead of
  being left at tiny compact-label size.
- Preview and print use the same rendered HTML fragment.
- A4 and Letter primary labels show the whole label in preview without clipping.
- Multi-page and continuation outputs expose preview page controls so each
  printed page can be inspected before opening the print dialog.
- Small labels reflow and scale before content is summarized.
- Compact summaries prioritize severe H-statements and response/PPE P-codes before lower-priority storage/disposal text.
- GHS pictograms are never hidden behind QR, summarized as `+N`, or omitted.
- Strip-style labels place pictograms in a horizontal row when that preserves recognizability better than a tall rail.
- Color mode and black-and-white mode both preserve pictogram recognizability.
- Chinese, English, and bilingual modes all update the preview and printed HTML.
- The print button is disabled only when the app lacks required data or cannot produce a truthful printable output.
- The first-level print workflow shows a concise decision summary before stock details: output role, GHS icon handling, and H/P text handling.
- The first-level print workflow starts with the physical use target, not a
  generic template or tuning panel.
- Page count and copy quantity are summarized inside the selected-label details,
  not as a separate first-level diagnostic block.
- Less common stock sizes remain available but are collapsed behind a secondary control so the main workflow does not read like a template catalog.
- Responsible lab/supplier fields are collapsed unless the selected complete-primary output is blocked by missing profile data.
- Custom stock size controls remain advanced and must still pass the same planner rules as curated stock.
- Batch label printing keeps one selected physical stock for the batch. The
  app may classify, reduce, continue, or exclude individual items, but it must
  not silently auto-mix paper/roll sizes.
- Batch preview must include representative labels beyond the first selected
  item: first included, worst-fit, longest-name, most-pictograms, densest-text,
  and excluded-list views where applicable.

## Required QA Matrix

Run this matrix before shipping print-workflow changes:

| Chemical | Output | Language | Color | Required result |
| --- | --- | --- | --- | --- |
| Hydrochloric Acid | A4 Primary | Bilingual | Color | Complete primary, no QR body, no H/P summaries, all pictograms |
| Hydrochloric Acid | Letter Primary | Bilingual | Color | Complete primary, Letter page, no QR body, all pictograms |
| Formaldehyde | A4 Primary | Bilingual | Color | Complete primary continuation set, multiple pages, all pictograms repeated, no clipping |
| Hydrochloric Acid | Main Container Target | Bilingual | Color | Complete-primary intent is preserved; dense content routes to A4/Letter primary instead of supplemental fallback |
| Hydrochloric Acid | Standard Bottle | Bilingual | Color | Supplemental, printable, all pictograms, no `more-pics` |
| Hydrochloric Acid | Large Primary | Bilingual | Color | Container front label when full content cannot fit; identity and pictograms are visually prominent, all pictograms, priority H summaries only |
| Hydrochloric Acid | 2 x 4 in / medium sheet | Bilingual | Color | Recommends full-page primary and keeps the medium output supplemental |
| Hydrochloric Acid | Vial Strip / Small Stock | Bilingual | Color | Supplemental, printable, all pictograms, strip pictogram row |
| Hydrochloric Acid | Tube/Vial Quick ID | Bilingual | Color | Quick-ID supplemental output, printable, all pictograms, no QR body, no `more-pics` |
| Hydrochloric Acid | Small Rack Quick ID | Bilingual | Color | 54 x 32 mm compact output, all pictograms, CAS/signal/name visible, no visual overlap |
| Hydrochloric Acid | Small Rack QR Supplement | Bilingual | Color | 54 x 32 mm QR supplement, QR plus all pictograms, no QR/pictogram collision |
| Hydrochloric Acid | 62 mm Continuous Quick ID | Bilingual | Color | Compact roll output, all pictograms, identity chips do not clip or collide |
| Hydrochloric Acid | Medium Rack Quick ID | Bilingual | Color | Stock-specific compact geometry, all pictograms, CAS/case identity remains readable |
| Hydrochloric Acid | Medium Rack QR Supplement | Bilingual | Color | QR supplement on medium stock, QR and pictograms stay separated and visible |
| Hydrochloric Acid | QR Supplement | English | B/W | QR present, all pictograms, no Chinese body text, B/W filter |
| Hydrochloric Acid | Custom tiny stock | Bilingual | Color | Cannot bypass full-page recommendation for complete primary; supplemental remains printable |
| Prepared Hydrochloric Acid | A4 Primary | Bilingual | Color | Prepared identity, concentration, solvent, CAS, signal word, all pictograms, and full H/P content remain visible |
| Prepared Hydrochloric Acid | Standard Bottle | Bilingual | Color | Prepared supplemental output keeps parent identity, concentration, solvent, CAS, signal word, all pictograms, and truthful hazard summary |
| Prepared Hydrochloric Acid | Tube/Vial Quick ID | Bilingual | Color | Prepared quick-ID output keeps parent identity, concentration, solvent, CAS, signal word, and all pictograms without pretending to be complete primary |
| Ethanol | Standard Bottle | Bilingual | Color | Lower-density supplemental/primary-candidate path remains readable |
| Ethanol | Tube/Vial Quick ID | English | B/W | Compact ID output keeps both pictograms and remains readable |
| Sodium Hydroxide | QR Supplement | Bilingual | Color | Corrosive QR output keeps QR and all pictograms |
| Nitrogen | Tube/Vial Quick ID | English | Color | Sparse single-pictogram GHS04 compressed-gas output keeps identity, CAS, signal, and pictogram visible |
| Zinc Oxide | QR Supplement | English | Color | Sparse single-pictogram GHS09 environmental output keeps QR and environmental pictogram visible |
| Boric Acid | Standard Bottle | English | Color | Sparse single-pictogram GHS08 health-hazard output keeps the hazard statement readable without dense-label assumptions |
| Long-name corrosive fixture | Standard Bottle | English | Color | Long product name does not hide identity or pictograms |
| Water / no GHS | Any hazard label | Any | Any | Does not present false hazard data |
| Upstream error | Results and print entry | Any | Any | Does not present missing data as no hazard |

## Code-Level Checks

Unit tests should keep these invariants pinned:

- Complete primary bodies do not contain `qrcode-img`, `hazard-more`, or `precaution-more`.
- Dense complete primary continuation output produces multiple printed labels
  and keeps every expected pictogram on each continuation page.
- Preview rendering can target later continuation pages, not only the first
  rendered label.
- Every expected pictogram code appears in the printed body.
- Supplemental and QR labels carry explicit `label-kind-*` classes.
- Quick-ID labels carry `label-kind-quick-id`, planner output kind `QUICK_ID`,
  every expected pictogram, and no QR body.
- Compact labels preserve critical identity chips such as batch/case number
  without ellipsis or critical-element clipping.
- Small QR labels keep QR plus every expected pictogram in the printed body.
- Strip labels use a four-pictogram row for dense multi-pictogram chemicals.
- Sparse single-pictogram labels must remain visually balanced while still
  preserving CAS, signal word, and the one pictogram.
- Pictogram dimensions and visible H/P budgets increase with available physical label area.
- Custom tiny complete-primary configs route to A4/Letter instead of enabling an invalid primary label.
- Custom supplemental configs keep every pictogram and print as supplemental, not complete primary.
- Compact standard and QR labels show the highest-priority H/P items first when summary budgets are limited.
- The shared content policy is the source of truth for output role, H-text
  mode, P-text mode, QR reference behavior, and compact bilingual fallback.
  Planner, renderer, modal copy, and QA reports must not invent separate
  deletion rules.
- No-GHS and upstream-error cases are blocked from hazard-label printing with distinct planner issues.
- Prepared-solution cases must cover direct creation, prepared-sidebar reprint,
  and preset reuse. Preset reuse must not carry stale operational fields into a
  new print job.
- Browser Use production checks must include actual search, checkbox selection, modal opening, stock/purpose switching, language switching, color switching, and print-button enabled/disabled state.
- Browser Use print-action checks should use `qaPrintHandoff=1` and verify
  `print-qa-status` data attributes for label kind, pictogram codes, QR state,
  template, and stock preset.
- `qa:print-report` must inspect both preview fragments and the actual print
  document body so a preview-only pass cannot mask missing print output.
- PDF artifact QA must assert that visual issues are empty, including
  pictogram/CAS, pictogram/signal, pictogram/name, QR/pictogram, and
  outside-label overlap classes for compact labels.
- Production bundle QA must check current stock-specific print markers when
  compact stock rendering changes, including small-rack and medium-rack markers.
- Targeted local print contract checks are available with `npm run test:print-contract` from `frontend/`.
