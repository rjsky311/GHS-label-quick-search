# 2026-06-14 Print Layout Evidence

Evidence captured from manual production testing with
`qa/fixtures/organic-inventory-2026-06-14.csv`.

## Files

- `ghs-label-identification-small-batch.pdf`: identification small-label PDF.
  It is A4 portrait, 4 pages, 20 labels per page.
- `ghs-label-qr-small-batch.pdf`: QR small-label PDF. It is A4 landscape,
  7 pages, 12 labels per page.

## Observations

- Identification labels preserve CAS, English name, Chinese name, and GHS
  pictograms, but the internal layout leaves large unused space on the right
  side of most labels.
- QR labels preserve QR and pictograms, but the identity block remains small
  relative to the available left-side area.
- The user screenshot shows an A4 complete-label preflight pause for
  `name-en-overflow`, `name-zh-overflow`, and `required-name-en-clipped` even
  though the preview has substantial blank space. Treat this as fit-inspection
  evidence to investigate before further visual polish.

## Boundary

These PDFs are output evidence, not product source. Keep printed GHS labels free
of ads or unrelated promotional copy, and verify final safety labels against
SDS, supplier labels, and local regulations.
