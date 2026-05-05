# GHS Quick Safety Workspace Design System

## Product Position

GHS Label Quick Search is a free, public chemical safety utility. Its first job is to help lab and operations users quickly find GHS hazard information, produce usable secondary-container labels, and verify source context before work continues.

This is not a mixture-classification engine, an inventory system, or a final compliance authority. The UI must make that boundary clear without making the product feel hostile or unfinished.

The product direction is **GHS Quick Safety Workspace**:

- Tool first, brand second.
- Safety and provenance first, promotion second.
- Light, fast, precise, and pleasant enough for daily bench use.
- Useful for public discovery while still creating trust and brand visibility.

## Primary Users

### Daily Lab Users

Research assistants, students, technicians, teaching assistants, and bench scientists use the tool while preparing bottles, tubes, and teaching-lab materials. They need fast search, forgiving name/CAS input, low-friction label output, and clear hazards without reading dense documentation.

Design implication: the default screen should be bright, compact, and immediately usable. Avoid a dark command-center look. The product should feel like a clean lab bench tool, not an admin dashboard.

### EHS / Lab Managers

Safety managers and lab leads care about source trust, print consistency, provenance, and whether labels are repeatable. They need confidence that the tool is bounded, auditable enough for lightweight use, and not pretending to be the authoritative SDS.

Design implication: surface source, cache, report count, and SDS links consistently. Keep warnings prominent. Use restrained visual hierarchy and stable table layout.

### Field / Factory / Bench-Side Users

Users may be on mobile, near printers, or scanning labels near containers. They need large touch targets, QR/SDS convenience, and labels that remain legible when printed small.

Design implication: QR and print flows must prioritize scan and hazard hierarchy over decorative density.

### New / Occasional Users

Students and occasional users may not know CAS numbers, signal words, H-codes, or P-codes. They need labels and hints that are helpful without turning the app into a tutorial page.

Design implication: explain through inline helper text, empty states, and detail surfaces. Do not place long instructions above the core workflow.

## Visual Principles

### Light-First Workspace

Default UI uses near-white and cool gray surfaces:

- Page background: `slate-50` / subtle blue-gray tint.
- Main panels: `white`.
- Borders: `slate-200` and `slate-300`.
- Text: `slate-950`, `slate-700`, `slate-500`.

Dark mode can exist later, but it must not be the default visual identity.

### One Primary Action Color

Use a single professional blue for primary actions:

- Primary: `blue-700`.
- Primary hover: `blue-800`.
- Focus ring: `blue-500`.

Do not use amber, purple, emerald, cyan, and blue as competing action colors. Reserve non-blue colors for safety semantics or status.

### Safety Colors Are Semantic

Use color only where it carries meaning:

- Red: danger, destructive, invalid, upstream failure that blocks trust.
- Amber: warning, partial data, cache age, caution.
- Green / emerald: verified success, source available, completed progress.
- Purple: only for custom user overrides, because it is not a safety category.

### GHS Visuals Stay High Contrast

GHS pictograms should remain visually crisp and surrounded by enough white space. Do not place pictograms on heavy dark surfaces or decorative gradients.

### Compact, Durable Geometry

Cards and panels use 6-8px radius. Avoid nested cards and oversized rounded blocks. Repeated items can be cards; page sections should feel like work surfaces.

### Mono for Identifiers

CAS numbers, H-codes, P-codes, and technical identifiers use monospace. This helps scanning and reduces transcription mistakes.

### No Decorative Gradients

Do not use gradient hero sections, bokeh/orb backgrounds, or glassmorphism. The app should look trustworthy and operational, not promotional.

### Generated Visual Assets

Generated bitmap assets can support onboarding, empty states, and workflow explanation when they make the tool feel clearer and more pleasant. They must stay secondary to the working interface:

- Use generated visuals for workflow context, not safety interpretation.
- Keep them light, lab-utility oriented, and free of fake labels, fake GHS pictograms, or readable regulatory text.
- Store project-bound generated assets under `frontend/src/assets/generated/` with local post-processing notes.
- Prefer optimized transparent WebP/PNG assets and verify the first viewport in browser QA.

## Core Screen Direction

The first screen is the product, not a landing page.

Top hierarchy:

1. Header with product identity, source/trust posture, language, saved tools.
2. Search workspace with single/batch mode.
3. Results table or focused empty state.
4. Source note and footer.

The brand can be visible in header/footer and post-value moments, but never above the user's ability to search.

## Component Direction

### Header

Use a white sticky header with a small safety mark, product title, and compact tool buttons. The mark should be a safety-tool identity, not an urgent warning badge.

Header actions should use quiet outline buttons unless active. Badges can use semantic colors but should not dominate.

### SearchSection

This is the main work surface. It should feel like a precise input module:

- White panel, stable border, 8px radius.
- Segmented tabs with blue active state.
- Search button is primary blue.
- Batch warning uses amber/red depending on severity.
- Keyboard hint is small and non-promotional.

### SearchAutocomplete

Autocomplete is a white dropdown with clear source labels:

- History and favorites are local suggestions.
- Server/alias results are separated and labeled.
- Active row uses a pale blue highlight.
- CAS remains mono.

### ResultsTable

ResultsTable should be closer to an enterprise data grid than a marketing card:

- White table shell.
- Sticky-feeling header rows via pale gray bands.
- Tool actions grouped by job: label/print, compare, export.
- GHS and signal word remain visually prominent.
- Source/cache chips are compact and low-noise.

### DetailModal

Detail view should be a hazard summary, not a raw data dump:

- Identity block with CAS, names, source, cache age.
- Pictograms and signal word near the top.
- H-statements and P-statements in readable grouped sections.
- SDS / ECHA links and authoritative-source note clearly visible.

### LabelPrintModal

Print configuration should behave like a workflow:

1. Stock preset.
2. Template / content density.
3. Label fields and lab profile.
4. Live preview.
5. Print / save / recent reload.

The print output itself must never include ads or unrelated brand promotion in compliance-critical label content.

### EmptyState

The empty state should invite action with example CAS searches, show a short search-review-output workflow, and use generated visual assets only when they clarify the product. It should not become a landing page or a long tutorial.

## Brand / Monetization Boundaries

Allowed:

- Header/footer brand presence.
- "Generated by" footer on non-compliance exports or optional web share pages.
- Post-value CTA after search, export, or print completion.
- Resource links to SDS review, batch label help, templates, or related brand pages.
- Clearly labeled sponsor/affiliate links for label stock or printers, outside safety-critical content.

Not allowed:

- Ads inside the GHS label body.
- Promotions beside signal word, pictograms, H/P statements, or SDS warnings.
- Any CTA that blocks search, print, or SDS access.
- Visual treatment that makes a promotional element look like a safety source.

## Design References

Use references as patterns, not templates:

- IBM Carbon: data table density, form clarity, operational tone.
- Linear: compact technical hierarchy and calm polish.
- Things / Amie: approachable, pleasant daily-use utility.
- USWDS alerts: clear warning/action structure.

Avoid copying brand-specific assets or making the app look like an official IBM/Linear/Notion product.

## Acceptance Criteria For UI Changes

A redesign pass is acceptable only when:

- Search remains the first usable screen.
- Primary actions are visually consistent.
- Safety semantics use red/amber/green deliberately.
- GHS pictograms stay high contrast.
- Text fits on mobile and desktop.
- Keyboard and focus behavior remain intact.
- Unit tests and build pass.
- Print label safety boundaries remain unchanged.
