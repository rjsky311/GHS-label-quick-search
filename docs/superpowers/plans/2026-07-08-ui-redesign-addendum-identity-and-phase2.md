# UI Redesign — Addendum: Identity Assets + Phase 2/3 (2026-07-08)

Addendum to `2026-07-07-ui-visual-redesign-graphite-editorial.md`. Phase 0–1
(tokens/fonts/material/shell/search) is already committed on `codex/ui-redesign`
(`c521e9d`) and screenshot-verified in both themes. This addendum records the
decisions finalized after that commit and defines the next dispatch. All RED
LINES and QA gates from the base plan still apply.

## Finalized decisions (locked with the maintainer)

1. **Typography = Option A (pure IBM Plex).** Drop Fraunces entirely. Display,
   body, and headings use IBM Plex Sans (+ Noto Sans TC for Chinese); data/codes
   use IBM Plex Mono. One superfamily = one voice, maximum coherence, and it
   removes the tofu risk (Fraunces has no CJK glyphs). This CORRECTS Phase 0–1,
   which still ships Fraunces.
2. **Icon system = fully custom SVG line set.** Replace lucide usage with a
   custom monoline icon set in the "graphite editorial" language shown in
   `docs/design-mockups/2026-07-07-ui-redesign/icon-language-seed.html`
   (24px grid, ~1.9px stroke, round caps/joins, `currentColor` line + sparing
   teal accent via token; GHS/hazard diamonds keep red per convention). Covers
   the full inventory used in the app (54 lucide names — enumerate from
   `grep -rhoE '\{[^}]*\} from "lucide-react"'`). Favicon (inline SVG in
   `index.html`) is re-drawn to match (graphite/ink diamond, red hazard mark).
3. **Hero illustration = generated pair (already produced + verified).**
   Light + dark webp assets are ALREADY placed at
   `frontend/src/assets/generated/ghs-empty-workflow-light.webp` and
   `…-dark.webp` (1200×900, optimized). The dark version keeps printed
   paper/labels WHITE on a dark bench (print-truth). Replace the old
   `ghs-empty-workflow.webp` usage in `EmptyState.jsx` with the theme-appropriate
   asset (light in comfort-dim, dark in dark-bench). Do NOT invert or recolor
   the images; use them as shipped.

## Dispatch scope (this next Codex run — STOP for review after)

Foundational identity finalization; work on `codex/ui-redesign` (default model
— `gpt-5.4-codex` is rejected on this account; do not pin it):

- **A. Type → Option A.** Remove Fraunces from `index.html` font `<link>` and
  from `--font-display` / any component; `--font-display` becomes IBM Plex Sans
  (heavier weight for display). No Fraunces references remain. No behavior/i18n
  change.
- **B. Custom icon set.** Create a custom SVG icon module (e.g.
  `src/components/icons/`) exporting components for every icon currently
  imported from `lucide-react`, matching the seed language; swap all
  `lucide-react` imports to it. Preserve each call site's size, `aria-label`/
  `aria-hidden`, and color inheritance (`currentColor` + teal token for accent).
  Redraw the favicon in `index.html` to match. GHS/hazard diamonds stay red.
- **C. Hero wiring.** Point `EmptyState.jsx` at the two new theme webp assets
  (light/dark) by theme; drop the old single webp reference. Keep the empty
  state's layout, copy, and alt text.
- Run all QA gates (below), commit, and **STOP for maintainer review**
  (Claude screenshots both themes desktop+mobile, curates icon rendering).

## Deferred to the following dispatch (after review)

- **Phase 2** results surface + **Phase 3** print-modal chrome (base plan),
  keeping the label preview print-true and white in both themes.
- These come only after the identity dispatch is reviewed.

## QA gates (this dispatch)

Base gates: `git diff --check`, `npm run lint`, `npm run test:i18n`,
`npm test -- --runInBand`, `npm run build`, `npm run test:print-contract`
(zero print-HTML diff), `npm run test:docs`.

New mechanical checks adopted from the poster/deck playbook (add as scripts or
assertions where feasible; otherwise manual):
- **Contrast ≥ 4.5:1** for body/label text against its surface in BOTH themes.
- **Glyph coverage / no-tofu:** every declared font must render its text; since
  Fraunces (no CJK) is removed, verify no element assigns a Latin-only font to
  Chinese text. Flag any missing-glyph fallback.
- **Visual-regression baseline:** the approved Phase 0–1 screenshots are the
  baseline; diff new screenshots per theme and review only changed regions.

## Red lines (unchanged, re-stated)

- Preview truth: never restyle the label-preview sheet contents or
  `printLabelStyles.js` / `printLabels.js`; `test:print-contract` = zero diff.
- White label preview in both themes; hero dark keeps printed paper white.
- No behavior/route/version change; keep the `themeMode` toggle.
- Icons: functional legibility + accessibility preserved (aria, 44px targets,
  focus rings, high-contrast pictograms).

## Stop conditions

Stop and report if: replacing lucide would break accessibility/tests beyond a
mechanical swap; the icon set can't hold visual consistency at 16–20px; any red
line or existing test is threatened; or you reach the end of the identity
dispatch (commit + STOP for review).
