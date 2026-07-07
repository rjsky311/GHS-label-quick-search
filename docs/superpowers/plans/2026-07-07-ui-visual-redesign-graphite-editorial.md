# UI Visual Redesign — Graphite Editorial (Paper × Bench) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development for behavior code; visual/token work is verified by the QA gates + screenshots below. Use checkbox (`- [ ]`) task tracking. Work on branch `codex/ui-redesign` off latest main; do NOT push to `main`. This is a PHASED redesign: implement Phase 0–1 first, run the gates, COMMIT, and STOP for maintainer review before Phase 2+. Do not restyle everything in one pass.

**Goal:** Re-skin the GHS Quick Safety app to the locked "Graphite Editorial (Paper × Bench)" visual direction — editorial two-column layout, Fraunces serif display + IBM Plex body/mono, a graphite+teal color system with warm-paper (light) and warm-graphite (dark) themes, and subtle CSS paper/bench material. **Only visuals change.** No product behavior, print output, statement selection, data trust boundaries, routes, or version number change.

**Locked design reference (source of truth):**
`docs/design-mockups/2026-07-07-ui-redesign/R2-warm-strong-paper.html` — a self-contained toggle mockup showing both themes (button top-right flips light/dark). Every color, type, spacing, and material decision below is taken from it. When this plan and the mockup disagree, the mockup wins for look; this plan wins for which real files/tokens to touch.

**Design language authority:** `EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md` (Comfort Dim + Dark Bench themes, button/chip language, material rules, responsive rules, accessibility + QA gates) and `DESIGN.md`. This redesign REFINES that language; it does not replace it.

**Tech stack:** React + Vite, Tailwind (`darkMode: ["class"]`), shadcn/ui (new-york, `cssVariables: true`, tokens in `src/index.css`), lucide icons, Jest. Fonts via Google Fonts `<link>` in `index.html`.

---

## Current State (verified 2026-07-07 — this is a RE-TONE, not a rebuild)

- A full `--notebook-*` token system already exists in `src/index.css` with two theme classes: `.theme-comfort-dim` (light warm paper) and `.theme-dark-bench` (dark graphite). Default `:root` mirrors comfort-dim.
- `src/utils/themeMode.js` defines `THEME_MODES` (`comfort-dim` / `dark-bench`), persistence (`ghs-theme-mode`), and `getThemeModeClassName`. `App.jsx` applies `getThemeModeClassName(themeMode)` + `notebook-app` on the shell (`data-testid="app-shell"`) and toggles it (see `App.themeMode.test.js`). KEEP this mechanism — do not rebuild theming.
- Components already consume the tokens (e.g. `bg-[hsl(var(--notebook-surface-raised))]`, `text-[hsl(var(--notebook-ink))]`). Re-toning the tokens in `index.css` recolors most of the app for free.
- `--notebook-print-surface: 0 0% 100%` (white) and `--notebook-print-ink` already exist in BOTH themes — the "printed label preview stays white in dark mode" rule is already tokenized. KEEP it.
- The app UI currently loads NO web fonts (system stack only). This redesign adds Fraunces + IBM Plex.
- Real component inventory: `components/Header.jsx`, `SearchSection.jsx` + `SearchAutocomplete.jsx`, `ResultsTable.jsx`, `DetailModal.jsx`, `AuthoritativeSourceNote.jsx`, `Footer.jsx`, `GHSImage.jsx`/`GHSPictogramStrip.jsx`, `LabelPrintModal.jsx` + `components/label-print/*` (`LabelOutputSelector.jsx`, `LabelPreviewPanel.jsx`, `LabelPreviewSection.jsx`, `LabelPrintFooter.jsx`, `LabelPrintConfigControls.jsx`, `ResponsibleProfileControls.jsx`, …).

## Contract To Preserve (RED LINES)

1. **Preview truth.** The label preview inside the app is produced by the print pipeline (`utils/printLabels.js` → `printPreviewStyles.js` / `printLabelStyles.js`). Its internal contents and typography MUST NOT be restyled by this redesign — it must keep matching printed output. The redesign styles the app CHROME around it (and the label-stock canvas backing the white sheet), never the white sheet's own layout/fonts.
2. **Print output unchanged.** Do not touch `printLabelStyles.js`, `printLabels.js` statement/pagination/font logic, or `printContentPolicy`. `npm run test:print-contract` stays green with zero diff to generated print HTML.
3. **White label preview in both themes.** `--notebook-print-surface` stays white in comfort-dim AND dark-bench.
4. **Three public outputs** (Complete A4/Letter, QR small, Identification small) stay distinct in the output selector. No new outputs. Safety-critical label content stays free of ads/promo.
5. **No behavior change.** Search, batch, print handoff, PDF export, admin/pilot flows, i18n keys, routes, and version number are untouched. This is CSS/markup-class/typography only, plus font `<link>` and material layers.
6. **Accessibility.** Contrast in both themes (WCAG AA for text), visible focus rings in both themes, 44px min touch targets for primary/mobile actions, keyboard nav intact, GHS pictograms high-contrast. Material may be reduced on narrow screens and must never sit behind dense text tables at readability-harming contrast.
7. **Keep the existing `themeMode` toggle + storage.** Just re-tone what the two theme classes resolve to.

## Design Tokens (map to existing `--notebook-*` names in `src/index.css`)

Hex values below are authoritative (from the R2 mockup). Convert each to the `H S% L%` triplet format the file already uses for color tokens. Update the default `:root`, `.theme-comfort-dim`, and `.theme-dark-bench` blocks. Opacity/blend/rgba tokens are new and stay as raw values.

### Comfort Dim (light · warm paper, strong grain)
| Token | Value (hex → convert to HSL) | Role |
| --- | --- | --- |
| `--notebook-app` | `#f1ead9` | app background (warm paper) |
| `--notebook-surface` | `#faf4e7` | main surface |
| `--notebook-surface-raised` | `#fffdf6` | raised card |
| `--notebook-ink` | `#17130b` | primary ink + heavy editorial rules |
| `--notebook-muted-ink` | `#5a5344` | secondary ink |
| `--notebook-border` | `#dbd2be` | hairline borders |
| `--notebook-action` | `#0c6b62` | **teal accent** (was blue) — links/active/focus |
| `--notebook-action-border` | `#0a5c54` | accent border |
| `--notebook-action-soft` | `#e0efec` | accent tint fill (chips/active bg) |
| `--notebook-danger` | `#cf3324` | signal/danger |
| `--notebook-danger-soft` | `#f7ece9` | danger tint |
| `--notebook-print-surface` | `#ffffff` | UNCHANGED (white) |

### Dark Bench (dark · warm-neutral graphite)
| Token | Value (hex → convert to HSL) | Role |
| --- | --- | --- |
| `--notebook-app` | `#161714` | graphite bench bg |
| `--notebook-surface` | `#1e201c` | graphite surface |
| `--notebook-surface-raised` | `#232520` | raised card |
| `--notebook-ink` | `#e8e7dd` | light warm ink |
| `--notebook-muted-ink` | `#8d8d80` | secondary |
| `--notebook-border` | `#33352c` | border / heavy rules become graphite hairlines |
| `--notebook-action` | `#40d3c4` | **bright teal accent** |
| `--notebook-action-border` | `#45cabc` | accent border |
| `--notebook-action-soft` | `#123734` | accent tint fill |
| `--notebook-danger` | `#f0806f` | coral danger |
| `--notebook-danger-soft` | `#2a1512` | danger tint |
| `--notebook-print-surface` | `#ffffff` | UNCHANGED (white — print truth in dark) |

Keep `--notebook-warning*` (amber) and `--notebook-ready*` (green) families; only nudge them for contrast in each theme if the gates flag it.

### New tokens to add (both themes)
| Token | Comfort Dim | Dark Bench | Role |
| --- | --- | --- | --- |
| `--notebook-action-solid` | `#17130b` (ink) | `#40d3c4` (teal) | primary button FILL |
| `--notebook-action-solid-fg` | `#f1ead9` | `#08201d` | primary button text |
| `--notebook-canvas` | `#e7ddc9` | `#0b0c08` | label-stock backing behind the white preview sheet |
| `--notebook-rule-line` | `23 19 11` (used `/ .045`) | `255 255 250` (used `/ .022`) | faint full-page ledger rule color |
| `--notebook-grain-opacity` | `.14` | `.055` | fixed paper/bench grain layer opacity |
| `--notebook-grain-blend` | `multiply` | `screen` | grain blend mode |
| `--notebook-canvas-grain-opacity` | `.66` | `.5` | grain opacity inside the label-stock canvas |

### Typography tokens (new; app chrome only)
- `--font-display: "Fraunces", "Noto Serif TC", serif;` (chemical name, section headings, output names, primary-action labels can stay mono)
- `--font-sans: "IBM Plex Sans", "Noto Sans TC", system-ui, sans-serif;` (body, Chinese)
- `--font-mono: "IBM Plex Mono", "Consolas", monospace;` (CAS/H/P codes, kickers, meta, seg controls)
- Add the Google Fonts `<link>` (Fraunces ital/opsz, IBM Plex Sans, IBM Plex Mono, Noto Sans TC) to `index.html`. `preconnect` included. Do NOT add fonts to the print stylesheet.

## Material System (CSS-only, tokenized, responsive)

Per the mockup and design-language "subtle, tokenized, reduce on mobile, never behind dense tables":
- **Grain layer:** a single fixed full-viewport `.notebook-grain` div (pointer-events:none, z-index behind content) using an inline grayscale SVG `feTurbulence` noise, `opacity: var(--notebook-grain-opacity)`, `mix-blend-mode: var(--notebook-grain-blend)`. Multiply on light = paper tooth; screen on dark = graphite speckle.
- **Ledger rules:** faint full-page horizontal lines via `repeating-linear-gradient(... hsl(var(--notebook-rule-line) / <alpha>) ...)` on the shell background at ~33px pitch, contrast ≤ ~4.5% light / ~2.2% dark.
- **Label-stock canvas:** the container that backs the white preview sheet uses `--notebook-canvas` + a scoped grain `::before` at `--notebook-canvas-grain-opacity`. The WHITE SHEET ITSELF stays print-true (no grain, no restyle).
- **Responsive:** grain + ledger rules may be reduced/removed under ~640px; material identity survives via surface colors, borders, and button shape.
- Exact SVG noise data-URIs, grain sizes (170px page / ~110px canvas), and pitch are in the R2 mockup `<style>` — copy them.

## Layout & Type Treatments (app chrome)

From R2, applied to the real shell/components (not the print preview internals):
- Editorial masthead rule under `Header`; `01 —` / `02 —` mono kickers before search and result sections.
- Search: large Fraunces italic input affordance; mono primary "Search" button (ink-solid light / teal-solid dark); mono segmented 單筆/批次.
- Result identity: oversized Fraunces chemical name (EN) + Noto Sans TC Chinese, mono CAS chip, Fraunces filled danger "危險 Danger" signal, mono source line.
- Hazard board: pictograms in white-backed bordered tiles; H-code rows with mono red codes, top ink rule; teal "expand P-codes" affordance.
- `LabelOutputSelector`: three outputs as an editorial list with Fraunces names, mono sub-labels, teal active marker/underline (stay visually distinct).
- Actions (`LabelPrintFooter`): primary solid (ink light / teal dark), secondary outline; report action = red stamp-outline (no solid fill); keep existing 下載 PDF handoff wiring untouched.
- `AuthoritativeSourceNote` / disclaimers: left-red-rule note card using `--notebook-disc`/danger + Fraunces bold lead.
- Status chips (Ready / Needs Review / etc.): flatter than buttons, semantic color, quieter than actions.

## Phased Task Plan

### Phase 0 — Tokens + fonts + material primitives
**Files:** `src/index.css`, `index.html`, `tailwind.config.js` (only if a font-family utility mapping is wanted)
- [x] Re-tone `:root` / `.theme-comfort-dim` / `.theme-dark-bench` `--notebook-*` values to the tables above (convert hex→HSL). Add the new color, material, and typography tokens.
- [x] Add the Google Fonts `<link>` + preconnects to `index.html`. Add `--font-display/-sans/-mono` and wire base `body`/heading font-family to them (app only).
- [x] Add the `.notebook-grain` fixed layer + ledger-rule background + `.notebook-canvas` grain helper as reusable classes/utilities.
- [ ] Gates green (see below). No visual regressions in unrelated flows.

### Phase 1 — Button/control primitives + shell & search  ⟵ STOP-FOR-REVIEW after this
**Files:** `components/ui/*` button/control primitives as needed, `components/Header.jsx`, `components/SearchSection.jsx`, `SearchAutocomplete.jsx`, `App.jsx` shell wrappers, theme toggle control.
- [x] Apply the button language (primary solid, secondary outline, report stamp, segmented tabs) as shared classes/components.
- [x] Apply masthead rule, kickers, editorial search band, and mount the grain + ledger material on the shell. Verify the existing theme toggle flips comfort-dim ⇄ dark-bench and the new material/teal follow.
- [ ] Desktop + mobile screenshots in BOTH themes. Gates green. **Commit and STOP; wait for maintainer review before Phase 2.**

### Phase 2 — Results surface
**Files:** `ResultsTable.jsx`, `DetailModal.jsx`, `AuthoritativeSourceNote.jsx`, `GHSPictogramStrip.jsx`, `Footer.jsx`, `EmptyState.jsx`
- [ ] Result identity, hazard board, source note, chips per the treatments above. Keep table structure stable; no texture behind dense rows.

### Phase 3 — Label print modal (chrome only — NOT the preview sheet)
**Files:** `LabelPrintModal.jsx`, `label-print/LabelOutputSelector.jsx`, `LabelPreviewPanel.jsx`/`LabelPreviewSection.jsx` (canvas backing only), `LabelPrintFooter.jsx`, `LabelPrintConfigControls.jsx`, `ResponsibleProfileControls.jsx`
- [ ] Output selector, action buttons, config controls, and the label-stock canvas backing restyled. The white preview sheet contents stay print-true and untouched. `test:print-contract` stays green with zero print-HTML diff.

### Phase 4 — QA + docs closure
**Files:** `EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md` (mark adopted), `NEXT_PRODUCT_WORK.md`, this plan
- [ ] Full desktop + mobile screenshots, both themes, archived under `qa/evidence/2026-07-07-ui-redesign/`. Confirm all accessibility checks. Update docs to "adopted".

## QA Gates (run per phase)

```
git diff --check
npm run lint
npm run test:i18n
npm test -- --runInBand
npm run build
npm run test:print-contract        # print HTML must be unchanged
npm run test:docs
```
Plus manual: desktop + mobile screenshots in comfort-dim AND dark-bench; verify white label preview stays white in dark-bench; verify focus rings + contrast in both; verify grain/rules do not harm text legibility.

## Definition Of Done

- All phases' checkboxes checked; every gate green; print-contract shows zero change to generated print HTML.
- Both themes match the R2 reference; theme toggle works; label preview is print-true and white in both modes.
- Screenshots (desktop + mobile × 2 themes) archived; no behavior/route/version change.

## Stop Conditions (stop and report — do not improvise)

- Achieving a visual match would require changing the label preview's print-true contents, `printLabelStyles.js`, or print content policy.
- The recolor drops any text/UI below WCAG AA contrast in either theme and can't be resolved by nudging the token within the same hue family.
- Any existing test fails for a reason other than an intended snapshot/class update, or `test:print-contract` shows a print-HTML diff.
- A component's restyle would require restructuring behavior/state rather than classes/markup.
- You reach the end of Phase 1 — commit and STOP for maintainer review before Phase 2+.
