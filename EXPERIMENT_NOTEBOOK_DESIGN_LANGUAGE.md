# Experiment Notebook Design Language

Status: design-language baseline for future UI work. This document records the
current preferred visual system before implementation. It does not change
product behavior, print output rules, data trust boundaries, or version
number.

Use this after `PROJECT_STATUS_AND_NEXT_PLAN.md`, `DESIGN.md`, and
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` when opening a UI slice that touches app
shell, search, results, label preview, print modal, or shared controls.

## Design Direction

The selected direction is **Experiment Notebook Label Workbench**.

The product should feel like a careful lab notebook and label-preparation
workspace: warm, organized, tactile, and clearly operational. It should not
feel like a generic SaaS dashboard, a marketing landing page, a dark command
center, or a photorealistic desk scene.

Adopt:

- Clear numbered sections, like notebook entries.
- Warm low-glare surfaces instead of pure white glare.
- Subtle paper, ledger, grid, or label-stock texture where it helps structure.
- Paper-tab controls, ink-line borders, and stamp-like report actions.
- Label preview as the strongest product-specific visual memory.
- Responsive modules that stack cleanly on narrow screens.

Avoid:

- Large saturated blue rectangular buttons.
- Decorative stickers that do not read as clickable controls.
- Fixed desktop-only notebook binding, spiral rings, or overlapping scraps.
- Texture-heavy surfaces that reduce readability.
- Any treatment that changes printed label meaning or preview truth.

## Theme Set

Only two product themes are selected for this design language:

1. **Comfort Dim**
2. **Dark Bench**

Do not introduce Warm Light as a public theme in this direction unless a later
product decision reopens theme scope. Comfort Dim is the default visual target
because it keeps the notebook warmth while reducing screen glare for repeated
daily use.

### Comfort Dim

Comfort Dim is the default day-to-day theme.

Intent:

- Lower glare than a pure white UI.
- Preserve experiment-notebook warmth.
- Keep safety, search, and label preview highly readable.

Surface model:

- App background: muted warm gray or dim paper.
- Main surface: warm off-white notebook paper.
- Raised card: slightly lighter paper with soft border.
- Label preview canvas: white or near-white paper to match print reality.
- Warning note: pale amber paper, not a full amber wash.
- Focus/action accent: blue ink.

### Dark Bench

Dark Bench is a future dark theme with the same design language.

Intent:

- Support low-light or long-session use.
- Keep the product recognizable as the same notebook workbench.
- Avoid turning the app into a cyber or command-center dashboard.

Surface model:

- App background: charcoal or graphite lab-bench tone.
- Main surface: dark graphite paper with subtle ruled texture.
- Raised card: low-luminance card with clear border and shadow.
- Warning note: low-saturation amber/brown note with readable contrast.
- Focus/action accent: cyan-blue ink derived from the same action token.

Critical rule:

- **Printed label previews stay white in Dark Bench.**

The app chrome may be dark, but label previews represent physical output.
Complete A4/Letter labels, QR small labels, and identification small labels
must keep a white or near-white label surface in preview so users do not think
the printed label itself changes with the theme.

## Print And Safety Boundaries

This design language does not alter the print contract.

- Public print output remains exactly three outputs:
  Complete A4/Letter label, QR small label, and Identification small label.
- Complete labels carry full H/P content and QR lookup links.
- Small labels carry identity and GHS pictograms only.
- Printed hazard labels must never silently omit available GHS pictograms.
- QR or supplemental labels must not replace required visual hazard
  communication.
- Safety-critical label content must stay free of ads and promotional copy.
- SDS, supplier-label, and local-regulation authority boundaries remain
  visible.

The UI can use notebook materials around the workflow, but the printable label
itself should remain crisp, high-contrast, and print-faithful.

## Button Language

Buttons should feel like notebook-native controls, not generic web buttons or
decorative labels.

### Shared Button Rules

Every clickable control must have:

- Icon plus text when space allows.
- Minimum 44 px touch height on mobile and primary desktop actions.
- Visible border or edge treatment.
- Hover, active, focus, loading, and disabled states.
- A focus ring that is visible in both Comfort Dim and Dark Bench.
- A shape that remains recognizable across themes.

Do not rely on color alone. Do not make controls look like non-clickable
stickers.

### Primary Actions

Use for `查詢`, `列印批次`, and other main step-completion actions.

Preferred form:

- Paper-tab rectangle.
- Pale ink-fill, not large solid blue.
- Blue-ink border.
- Icon on the left.
- Slight raised shadow.
- Optional small tab notch or folded-corner hint only when it remains CSS
  feasible.

Avoid:

- Large saturated blue blocks.
- Overly soft pill buttons.
- Handwritten-style buttons that reduce legibility.

### Secondary Actions

Use for `匯出 CSV / Excel`, `儲存`, `檢視來源`, `清除`, and similar support
actions.

Preferred form:

- Paper or graphite surface matching the current theme.
- Thin graphite or blue-gray border.
- Icon plus label.
- Lower visual weight than primary actions.

### Report And Destructive Actions

Use for `回報資料問題` and other caution/destructive actions.

Preferred form:

- Red stamp-outline style.
- Red icon and border.
- No solid red fill for ordinary report actions.
- Stronger contrast in Dark Bench without neon glow.

### Tabs And Segmented Controls

Use for single/batch search and label output selection.

Preferred form:

- Notebook tab or paper divider.
- Active state uses blue-ink underline, edge, or slight raised treatment.
- Output selector must keep the three public print outputs visually distinct:
  Complete A4/Letter, QR small label, Identification small label.

### Status Chips

Status chips are informational and should not look like buttons.

Use flatter chips for:

- Ready
- Needs Review
- Upstream Retry
- Missing trusted name
- No data / unresolved

Chips may use semantic color, but should remain quieter than actions.

## Background And Texture

Material feel should survive responsive layout, but it must be tokenized.

Use CSS-feasible effects:

- Subtle paper grain or noise.
- Very light ruled lines.
- Low-contrast grid in label-preview or workbench zones.
- Thin borders and soft shadows.
- Small corner folds only on preview surfaces, not as layout anchors.

Avoid:

- Large fixed background images.
- Photorealistic paper or desk photos.
- Decorative objects that must be absolutely positioned.
- Texture behind dense text tables.

Responsive rule:

- Texture may be reduced or removed on narrow screens when it competes with
  readability.
- The material identity should remain through surface color, borders, tabs,
  and button shape even when decorative texture is reduced.

## Responsive Layout Principles

The design must be implementable as responsive web UI, not only as a static
mockup.

Desktop:

- Use CSS grid/flex layouts.
- Prefer two-column or three-column work surfaces.
- Keep search/source modules and label preview modules independently stackable.
- Keep label preview in an aspect-ratio container.

Tablet:

- Collapse multi-column sections into two columns or stacked groups.
- Keep action groups near the related section.

Mobile:

- Use a single-column card stack.
- Search appears first.
- Source and safety boundary appear before print action.
- Label preview uses a compact aspect-ratio card or horizontal carousel.
- Primary actions move into a sticky action tray only when it does not obscure
  safety warnings.
- All touch targets stay at least 44 px tall.

Do not use notebook rings, fixed two-page spreads, or overlapping paper scraps
as required layout structure. They can appear only as optional desktop
decorative hints and should disappear on mobile.

## Accessibility And QA Expectations

Before any implementation claims this language is adopted, verify:

- Contrast in Comfort Dim and Dark Bench.
- Focus rings on keyboard navigation.
- Hover, active, loading, and disabled states.
- Mobile tap target sizes.
- Text wrapping in Traditional Chinese and English.
- GHS pictograms remain high-contrast.
- White label previews remain white in Dark Bench.
- Print preview does not imply dark-mode printed labels.

Suggested UI implementation gates:

```powershell
git diff --check
npm run test:docs
npm test -- --runInBand
npm run test:i18n
npm run build
```

Print or label-preview implementation must also run:

```powershell
npm run test:print-contract
npm run qa:print-pdf
```

## Implementation Advice

Do not implement the whole redesign at once.

Recommended order after user approval:

1. Add theme tokens and primitive control styles for Comfort Dim and Dark
   Bench.
2. Prototype the button system in one low-risk surface.
3. Apply app background and paper surfaces to the shell/search page.
4. Apply label-preview surface rules, keeping print previews white in Dark
   Bench.
5. Apply the same language to results and print modal only after the primitive
   system is stable.
6. Run desktop and mobile screenshots before deciding the style is adopted.

This keeps the design language unified without letting visual polish change
data, safety, or print behavior.
