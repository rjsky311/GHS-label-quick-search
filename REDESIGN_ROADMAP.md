# Productized Redesign Roadmap

## North Star

Turn GHS Label Quick Search into a polished free safety workspace that users trust and return to:

- Search and label work stays fast.
- Safety boundaries stay explicit.
- The UI becomes light, clean, and pleasant for daily lab use.
- Brand visibility appears through usefulness, not pressure.

## Current Baseline

As of the v1.10 codebase:

- Frontend is React 19, Vite 6, Tailwind 3.4, Radix/shadcn primitives.
- Runtime version is `1.10.0`.
- Print workflow includes stock presets, QR template, live preview, recent print reload, lab profile, template save/load, and calibration controls.
- Admin/pilot surfaces exist behind configuration.
- Current redesign pass has moved the main app to a light-first utility shell, added trust/feedback surfaces, fixed local Vite CORS for browser QA, split Vite vendor bundles, and started the generated visual asset system with a first-use workflow illustration. Remaining work is deeper workflow polish and deployment QA.

## Phase 1: Documentation And Design Contract

Status: landed in the current productization pass.

Deliverables:

- `DESIGN.md`
- `BRANDED_UTILITY_STRATEGY.md`
- `REDESIGN_ROADMAP.md`
- README/AGENTS/roadmap sync for v1.10 and Vite
- Local Vite CORS alignment for browser-based QA

Acceptance:

- The product direction is documented before broad styling work.
- Brand/monetization boundaries are explicit.
- No safety-critical output can accidentally become an ad surface.

## Phase 2: Light-First App Shell

Goal: remove the dark-dashboard first impression without changing core behavior.

Scope:

- `App.jsx` page background and toaster theme.
- `Header.jsx` white header, quieter action buttons, semantic badges.
- `SearchSection.jsx` white search workspace, blue primary actions.
- `SearchAutocomplete.jsx` white dropdown.
- `EmptyState.jsx`, `Footer.jsx`, `SkeletonTable.jsx`, alert notes.

Acceptance:

- First viewport looks like a professional lab utility.
- Search remains the dominant affordance.
- No component loses test IDs or keyboard behavior.
- Frontend tests and build pass.

## Phase 3: Results Workspace

Goal: make results feel like a trustworthy data grid, not a decorative card.

Scope:

- `ResultsTable.jsx` action hierarchy and table colors.
- Source/cache badges.
- Filter toolbar.
- Selection controls.
- Signal word and no-GHS states.

Acceptance:

- CAS/name/GHS/signal/action columns scan quickly.
- Print/export/compare actions are visually grouped.
- Safety colors are semantic and not used as generic decoration.

## Phase 4: Detail And Safety Summary

Goal: make the detail modal the place users understand source, hazards, and next action.

Scope:

- Identity and provenance block.
- Pictogram/signal summary.
- H/P statement grouping.
- SDS/ECHA links.
- Authoritative source note.

Acceptance:

- A user can answer "what is the hazard and where did it come from?" in one scan.
- Prepared-solution trust boundary stays visible.
- Focus trap and modal accessibility remain intact.

## Phase 5: Print Workflow Polish

Goal: make label printing feel like a confident workflow.

Scope:

- `LabelPrintModal.jsx` hierarchy.
- Stock preset selection.
- Template/content density language.
- Live preview sizing and warnings.
- Recent print/template/lab profile surfaces.
- Printed `standard` and `qrcode` label hierarchy if owner feedback still rejects current output.

Acceptance:

- Users can choose stock/template without guessing.
- Compact labels do not pretend to carry full hazard detail.
- QR labels make scan behavior obvious.
- Printed labels remain free of ads and unrelated brand content.

## Phase 6: Soft Brand And Growth Surfaces

Goal: add brand utility paths only after the core workflow is strong.

Status: first pass landed; generated visual onboarding pass in progress.

Scope:

- Footer/resource links.
- Empty-state trust panel.
- Post-result trust/feedback panel.
- Post-print or post-export suggestions.
- Optional label stock guide.
- Optional SDS/label review CTA.
- Generated onboarding/workflow visuals that stay outside safety-critical content.

Acceptance:

- No CTA blocks the workflow.
- No promotional element is placed inside safety-critical content.
- The app still feels like a tool, not a landing page.

## Phase 7: Verification

Each implementation pass should run:

- Frontend unit tests: `npm test -- --runInBand`
- Frontend build: `npm run build`
- Backend tests when backend behavior changes: `python -m pytest -v`

For visual QA:

- Desktop first viewport.
- Mobile first viewport.
- Generated empty-state asset with transparent background and no fake GHS symbols.
- Results table with multiple hazards.
- Detail modal.
- Label print modal.
- At least these chemicals: Ethanol, Hydrochloric acid, one 3-pictogram chemical, one prepared solution.

Browser automation is preferred when available. If browser automation is blocked, rely on build/tests and manual screenshot review in the deployed/local app.
