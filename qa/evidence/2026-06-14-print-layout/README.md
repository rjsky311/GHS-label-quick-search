# 2026-06-14 Print Layout Evidence

Evidence captured from manual production testing with the inventory-shaped QA
fixture that now lives at `qa/fixtures/organic-inventory-2026-06-14.csv`.
The fixture is synthetic and retained only for parser/layout coverage.

## Files

The original batch PDF artifacts were removed during the 2026-06-20 public
repository safety pass because they contained historical inventory-derived label
content. Keep this directory as the design-decision note only; regenerate future
print evidence from sanitized fixtures or synthetic cases.

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

Historical print artifacts are output evidence, not product source. Keep printed
GHS labels free of ads or unrelated promotional copy, and verify final safety
labels against SDS, supplier labels, and local regulations.
