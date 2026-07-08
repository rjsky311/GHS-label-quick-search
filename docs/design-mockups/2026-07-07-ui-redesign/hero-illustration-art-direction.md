# Hero Illustration — Art-Direction Brief (for generated image)

Role: empty-state / hero visual for the GHS Quick Safety app, replacing the
off-theme raster `frontend/src/assets/generated/ghs-empty-workflow.webp`.
Medium: **generated raster illustration** (user chose a rich, crafted image
over flat SVG for this one asset). The whole point is that it must lock onto
our theme — so **style is fixed by this brief; the model may only vary
composition.** Generate several composition candidates; Claude curates; the
user picks; then finalize.

## Concept (conceptual illustration — NOT a data figure)

A calm, editorial "label-preparation" lab-bench vignette that carries the
product's story: **search → verify → label.** Suggested elements (arrange
freely): a reagent bottle with a small secondary-container label, a printed
GHS label sheet, a magnifier over it, optionally a test tube / beaker. It is
decorative and conceptual — abstract the label text, show no readable data.

## Aesthetic target — "Graphite Editorial (Paper × Bench)"

- Restrained, editorial, tactile analog-print feel. Matte, flat tonal shapes
  with subtle paper/graphite grain. Confident negative space. Rich but
  **graphic, not painterly-photoreal** — it must sit next to a set of clean
  line icons without clashing (think editorial screen-print / risograph, not
  glossy 3D).
- **Hard NOs (these are the "AI-slop" tells to avoid):** glossy 3D render,
  isometric SaaS mascot, neon, heavy gradients, lens flare, bokeh, drop
  shadows/glow, cartoon, photorealistic stock, cluttered desks, googly-eyed
  characters, rainbow palettes.

## Palette — must match the app tokens (two theme renders)

Light (Comfort Dim):
- ground warm paper `#f1ead9`; surfaces `#faf4e7`–`#fffdf6`
- primary ink line/shape `#17130b`; muted warm neutrals `#5a5344` / `#c9bfa6`
- teal accent `#0c6b62` (use sparingly: liquid, QR, lens, "active" bits)
- hazard red `#cf3324` — GHS diamond only (red border + white field per GHS)

Dark (Dark Bench):
- ground warm graphite `#161714`; surfaces `#1e201c`
- ink/line warm cream `#e8e7dd`; muted `#8d8d80`
- teal accent `#40d3c4`; hazard coral-red `#f0806f` (GHS diamond)
- Print-truth constraint: dark theme changes the bench/background, not the
  physical printed labels. Printed label sheets, peel-off labels, and bottle
  labels stay white / near-white paper with dark ink in both themes.

Limited palette only — the two grounds + ink + one teal + hazard red. No other
hues.

## Safety / correctness red lines

- Conceptual illustration; do not depict fake SEM/AFM/spectra/data.
- Any GHS pictogram = red diamond border on white field, upright; do not invent
  misleading hazard symbols; keep any symbol generic/abstracted.
- In the dark-theme render, never invert printed paper or bottle labels to dark
  surfaces; white paper sitting on a dark bench is the intended visual truth.
- No real product/brand names, no promotional copy, no readable H/P text.

## Output

- Two final renders: **light-theme** and **dark-theme** versions (a raster
  can't recolor itself, so we ship one per theme — accepted trade-off).
- Landscape, ~4:3, sized for the empty-state slot at ≥2× (target ≈ 1600×1200),
  optimized `webp` + keep the source. Ground = the theme surface (not
  transparent) so it reads as a framed vignette.

## Process (fixes the original "model pre-narrows the style" pain)

1. Generate **4 distinct COMPOSITION candidates in the LIGHT theme only**
   (vary arrangement/crop/element mix — NOT the palette or aesthetic). Do not
   pre-select one.
2. Save all candidates to
   `docs/design-mockups/2026-07-07-ui-redesign/hero-candidates/`.
3. Claude reviews against this brief (palette lock, no-AI-slop, sits-with-icons,
   safety) and curates 2–3; the user picks one.
4. Only then render the chosen composition's **dark-theme** variant + finalize
   both, replace the webp.

Style-ledger note: this locks the GHS project's "signature element = line-icon
system + one conceptual editorial hero (paper/graphite, teal accent)."
