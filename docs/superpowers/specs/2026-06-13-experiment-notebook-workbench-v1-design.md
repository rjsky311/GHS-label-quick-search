# Experiment Notebook Workbench v1 Design Spec

Status: proposed design spec for review. This document defines the next UI
product slice before implementation. It does not change product behavior,
print output rules, data trust boundaries, runtime version, or deployment
settings.

## Goal

Make the current Experiment Notebook visual direction feel like a coherent
working product instead of a set of token-level surface changes. The v1 slice
should connect the first screen, print-preview reading experience, shared
controls, and responsive QA into one testable workbench pass.

The user-facing outcome is:

- The first screen feels like an experiment notebook label workbench, not a
  generic SaaS feature-card page.
- Users can understand the search -> review -> print/export path without
  scattered card grids.
- The label print modal remains print-faithful while making CAS, English name,
  Chinese name, output type, and preview scale easier to read.
- Comfort Dim is the implemented baseline. Dark Bench remains token-ready, and
  printed label previews stay white in every theme.

## Source Evidence

This slice is opened from direct production screenshots and code inspection on
2026-06-13:

- Production screenshot showed the empty-state workflow cards, feature cards,
  and trust panel using different grid widths and starting x positions.
- Measurement at a 1440 px viewport confirmed:
  - Workflow cards start at x=144.
  - Feature cards and trust panel start at x=208.
  - The first screen uses separate `max-w-6xl` and `max-w-5xl` containers.
- Old/current print-preview comparison between commit `4c074a9` and production
  commit `3e162c4` confirmed no regression in actual preview typography:
  - A4 Fit preview scale stayed 24%.
  - A4 Inspect preview scale stayed 63%.
  - A4 name CSS stayed 26px.
  - A4 CAS chip CSS stayed 10.5px.
  - QR small label scale stayed 179%.
  - Identification small label scale stayed 159%.
- The print issue is therefore a preview-reading UX problem, not proof that the
  notebook pass changed printed label font sizes.

## Product Boundaries

This slice must preserve the current GHS and print contracts.

- Public print outputs remain exactly:
  1. Complete A4/Letter label.
  2. QR small label.
  3. Identification small label.
- Complete labels keep CAS, English name, Chinese name, all available GHS
  pictograms, full H/P statements, QR lookup, and responsible profile handling.
- QR and identification small labels keep identity plus available pictograms
  across same-output continuation labels. They do not gain H/P text.
- Printed labels must not silently omit available pictograms.
- Safety-critical label content stays free of ads and unrelated promotion.
- SDS, supplier-label, and local-regulation authority boundaries remain visible.
- Printable label HTML/CSS is not changed merely to improve on-screen preview
  comfort. Preview UI may add surrounding readout and controls, but label body
  rendering stays print-faithful unless a separate print-specific slice proves a
  separate renderer issue.
- No version bump.

## Non-Goals

This slice will not:

- Launch a public theme switcher.
- Fully implement Dark Bench across every surface.
- Change backend APIs, data governance, source ranking, QR targets, or export
  data contracts.
- Redesign the actual printable label visual language.
- Add new label sizes or output types.
- Add NotebookLM, YouTube research, or external research workflow features.
- Convert the app into a marketing landing page.
- Rework result-table data behavior, sorting, selection, or batch planning.

## Design Direction

The selected direction remains **Experiment Notebook Label Workbench**.

The app should feel like a careful lab notebook and label-preparation station:
warm, organized, tactile, operational, and safe. It should avoid generic SaaS
feature-card sprawl and avoid decorative notebook effects that hurt
readability.

Adopt:

- A shared ruled-paper workbench container.
- Numbered notebook entries for the core user path.
- Paper-tab controls with visible borders and clear active states.
- A stronger product-specific label-preview memory.
- Warm low-glare surfaces around the work.
- White or near-white label preview surfaces that represent physical output.

Avoid:

- Independent floating card grids with different widths.
- Large saturated blue rectangular buttons.
- Sticker-like controls that do not look clickable.
- Dense text inside small white cards.
- Texture behind dense tables or safety statements.
- Any treatment that suggests Dark Bench changes printed label color.

## User Flow

The first-screen path should read as one continuous workbench:

1. User lands on the search workbench.
2. User searches by CAS, English name, or Chinese name.
3. Empty-state guidance shows a compact 1/2/3 notebook flow:
   Search -> Check sources -> Print/export.
4. A product-specific label preview or output specimen visually anchors the
   workflow before feature details.
5. Trust and feedback actions sit on the same grid as the workbench, not as a
   detached card row.
6. When printing, the modal shows the selected output, identity readout,
   preview scale, and physical size before the user acts.

## Affected Surfaces

### First Screen / Empty State

The current `EmptyState.jsx` should move from independent hero, workflow,
feature, and trust card grids into a single workbench composition.

Requirements:

- Use one shared max-width container and one shared column system.
- Keep search first and immediately usable.
- Keep the generated workflow visual only if it supports the workbench
  hierarchy; it should not cause card misalignment.
- Replace the scattered feature-card row with notebook entries or a compact
  ledger/checklist.
- Keep example CAS buttons visible and clickable.
- Keep batch search, label print, export, and favorites discoverable without
  making four equal marketing cards the main visual structure.
- Align the trust panel to the same grid.

Suggested layout:

- Workbench container: shared 12-column grid on desktop, stacked single column
  on mobile.
- Left/main area: title, short body, example CAS controls, and 1/2/3 workflow.
- Right/support area: label-output specimen plus compact tool availability.
- Lower band: trust checklist and feedback controls aligned to the same grid.

### Product Trust Panel

`ProductTrustPanel.jsx` should keep safety boundaries visible while adopting the
same grid rhythm as the empty-state workbench.

Requirements:

- The empty-state variant should not introduce a different max-width than the
  surrounding workbench.
- Proof cards should read like safety checklist entries, not detached SaaS
  cards.
- Report data and workflow request actions should remain outside printed label
  content.

### Label Print Modal / Preview Panel

The print modal should remain truthful to physical output while improving
readability.

Requirements:

- Do not change actual label renderer CSS for this UI slice.
- Add or improve a preview identity readout outside the iframe:
  - CAS number.
  - English name.
  - Chinese name when trusted.
  - Selected output type.
  - Physical stock size.
  - Fit/Inspect scale.
- For Complete A4/Letter labels, make the relationship between Fit and Inspect
  clear:
  - Fit means full label visible.
  - Inspect means zoomed review, especially for CAS/name/H/P detail.
- Keep Fit available because it proves the whole label exists.
- Make Inspect easier to discover for A4 labels without hiding Fit.
- QR and identification small labels should explain that small text is a
  physical stock/readability constraint, not a theme issue.
- Preview label surfaces stay white in Comfort Dim and future Dark Bench.
- Footer and primary print action must remain visible without covering safety
  warnings or critical blocked-state explanations.

### Shared Controls

The existing notebook controls should become the default language for the
surfaces touched by this slice.

Requirements:

- Primary actions use paper-tab controls with blue-ink border/fill.
- Secondary actions use quieter paper controls.
- Report actions use stamp-outline danger treatment.
- Tabs and segmented controls use notebook divider/active-edge treatment.
- Controls retain icon plus text where space allows.
- Touch targets remain at least 44 px where used as primary mobile actions.
- Disabled states remain visibly disabled and do not look like inactive labels.

### Themes

Comfort Dim is the implementation target for this slice.

Dark Bench requirements are limited to preserving token compatibility:

- Do not hard-code new pure-white UI panels outside actual label preview
  surfaces.
- Do not darken printable label previews.
- Add tests or CSS assertions only where this slice touches theme-sensitive
  tokens.

## Responsive Requirements

Desktop:

- Use a shared grid for empty-state hero, workflow, feature/trust content.
- Avoid separate `max-w-*` containers that create visible misalignment.
- Label print modal may use two columns when width allows.

Tablet:

- Workbench modules can collapse into two columns or stacked sections.
- Action groups stay near the relevant section.

Mobile:

- Single-column stack.
- Search remains first.
- Workflow entries appear before secondary feature details.
- Trust boundary appears before print/export promotional or support actions.
- Label preview uses a bounded height and scrolls internally when needed.
- Modal footer cannot cover the last content without allowing scroll access.

## Acceptance Criteria

### Visual/Product Acceptance

- First screen reads as one experiment notebook workbench.
- Empty-state workflow, feature/tool, and trust content share a common grid and
  no longer appear as misaligned independent card rows.
- The first viewport still makes the product and search action obvious.
- The UI feels warmer and less glare-heavy without reducing text contrast.
- Buttons and tabs look clickable and notebook-native.
- Printed label previews remain white and print-faithful.
- A4 preview no longer forces the user to rely only on a tiny full-label view
  to verify CAS/name.

### Measurable Acceptance

- At a 1440 px viewport, empty-state workbench sections align to the same left
  and right grid boundaries.
- At a 390 px viewport, no card/control text overflows its container.
- Label print modal content is reachable at 900 px, 720 px, and 640 px viewport
  heights.
- A4, QR, and identification previews expose readable metadata outside the
  iframe.
- Fit and Inspect controls remain keyboard reachable.
- No actual print output contract changes are introduced.

## Verification Gates

Before considering implementation complete, run:

```bash
cd frontend && npm test -- --runInBand
cd frontend && npm run test:i18n
cd frontend && npm run build
cd frontend && npm run test:print-contract
cd frontend && npm run qa:print-pdf
```

For production-facing completion after deploy, run:

```bash
cd frontend && npm run qa:zeabur-deployment
cd frontend && npm run qa:production-health
cd frontend && npm run qa:production-search-ui
cd frontend && npm run qa:production-batch-print
```

Add or update focused QA where implementation changes require it:

- Empty-state desktop screenshot at 1440 x 900.
- Empty-state mobile screenshot at 390 x 844.
- Label print modal screenshots for:
  - Complete A4/Letter Fit.
  - Complete A4/Letter Inspect.
  - QR small label.
  - Identification small label.
- Modal viewport-height check for 900, 720, and 640 px.

## Documentation Updates

Implementation should update:

- `EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md` only if this spec changes the
  design language, not for routine implementation details.
- Existing implementation plan docs only if they remain referenced as current
  execution context.
- Test/QA docs if a new visual QA script or acceptance gate is added.
- `PROJECT_STATUS_AND_NEXT_PLAN.md` only if this becomes a shipped baseline or
  changes next-slice selection.

## Implementation Order

The implementation plan should break this into small, testable slices:

1. Workbench layout contract tests.
2. Empty-state workbench composition.
3. Product trust panel alignment.
4. Print preview metadata/readability contract tests.
5. Label print preview panel UX improvements.
6. Modal viewport-height QA.
7. Visual QA screenshots and production verification.

Each slice should preserve existing behavior and commit independently.

## Open Decisions

No additional user decision is required before writing the implementation plan.
The current conservative defaults are:

- Comfort Dim first.
- Dark Bench token compatibility only.
- No actual label renderer changes.
- Homepage/workbench and print-preview UX in the same v1 slice.
- Production deployment only after tests and local visual QA pass.
