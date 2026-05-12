# Next Product Work

This is the live queue for autonomous product work. Use it with
`AUTONOMOUS_WORKFLOW.md` when the user asks to continue.

## Product North Star

This project is a free public GHS utility that should help lab and operations
users quickly search chemicals, understand hazard classifications, and print
usable labels without becoming print-layout experts.

The product should be:

- Useful before it is promotional.
- Trustworthy before it is clever.
- Visually calm, clear, and easy to scan.
- Honest about supplemental labels versus complete primary labels.
- Friendly to future brand visibility without putting ads, sponsor copy, or
  unrelated promotion inside safety-critical label content.

## Current Operating Assumptions

- A4 and Letter are complete primary label outputs.
- Bottle, rack, strip, and compact physical stocks are usually supplemental or
  quick-ID outputs unless the renderer proves they can truthfully carry a
  complete primary label.
- GHS pictograms are never optional on a printed hazard label when pictogram
  data exists.
- Scaling, reflow, grouping, and fit retries happen before summarizing text.
- If the system cannot produce a truthful printable output, it should explain
  the next workable path instead of leaving the user in a blocked state.

## Priority 1 - Print Modal Decision Flow

Goal: make the print workflow feel like "choose my physical use case, inspect
the exact output, print" instead of a template/control catalog.

Work to continue:

- Audit the first modal screen in production Chrome for every common target:
  main container, bottle, tube/vial, QR supplement, A4 primary, Letter primary,
  small rack, 62 mm continuous, and large front label.
- Remove or collapse first-level noise that does not help the user decide the
  physical label they need.
- Keep one concise decision summary near the preview: output role, whether all
  pictograms are preserved, and what happened to H/P text.
- Ensure changing target/stock resets preview state to a whole-label view.
- Make the print action tell the truth: complete primary, supplemental bottle,
  quick-ID, QR supplement, continuation set, or blocked with a concrete recovery
  path.

Acceptance:

- A first-time user can search Hydrochloric Acid, open print, choose a physical
  label target, see a whole preview, and understand whether the output is
  complete or supplemental without opening advanced settings.
- Production QA screenshots show no clipped controls, no hidden label preview,
  and no vertical text artifacts in target cards.

## Priority 2 - Print Renderer And Stock Fit Robustness

Goal: every stock family has explicit renderer behavior, visual QA, and a
recoverable path when the physical label is too small.

Work to continue:

- Keep expanding stock-specific acceptance for compact outputs: small rack,
  62 mm continuous, medium rack, bottle, large front label, QR supplement, and
  A4/Letter primary.
- Add renderer-level checks whenever a production screenshot reveals visual
  overlap, including CAS/case chips, QR, signal word, pictograms, and product
  names.
- Use actual rendered geometry where possible; avoid planner-only confidence
  when text length or bilingual wrapping can change the result.
- Keep PDF artifact QA aligned with the browser preview so passing tests mean
  the visible label is actually usable.

Acceptance:

- Print/PDF QA fails on visual overlap or clipping in compact labels before the
  user sees the same problem in production.
- `qa:production-print` covers each production-searchable output class and
  leaves screenshots plus structured reports for review.
- The same deployed-browser gate can be run as
  `qa:production-primary`, `qa:production-compact`, and
  `qa:production-multi-chemical` so long-running print validation can continue
  in smaller autonomous rounds without dropping coverage.

## Priority 3 - Result Table And Pictogram Visual Polish

Goal: search results should look like a polished safety tool, not a raw data
dump with inconsistent icons.

Current progress:

- Result-table GHS pictogram strips now use clean official SVG tiles without
  extra status dots next to the regulatory symbols.
- The results GHS column is wide enough for the common four-icon hazard set, and
  expanded alternate classifications render as compact cards with clear
  chevrons and stable "set as primary" actions.
- Favorite/sidebar pictograms now reuse the shared tile strip, and comparison
  table pictogram cells use the same compact tile geometry instead of a
  separate oversized card style.

Work to continue:

- Review GHS pictogram presentation in the results table, expanded
  classifications, detail modal, and print preview.
- Use clean, official SVG pictograms where compliance and recognizability
  matter. Use generated bitmap assets only for non-regulatory illustration or
  brand/support surfaces.
- Make spacing, tile background, sizing, and wrapping consistent across main
  and expanded classification rows.
- Avoid decorative icon changes that make GHS symbols less recognizable.

Acceptance:

- Pictogram sets look consistent in table, expanded rows, detail, preview, and
  print.
- Expanded "other classification" rows do not create awkward columns, strange
  wrapping, or icon grids that compete with the chemical identity.

## Priority 4 - Trust, Source, And SDS Flow

Goal: users should understand where the data came from, what the tool can do,
and when to verify against official SDS/supplier/local rules.

Work to continue:

- Keep the SDS/source path visible but secondary to the immediate search and
  label tasks.
- Make reference links safe and clearly labeled.
- Add brand or business visibility only in non-safety surfaces such as footer,
  help pages, education content, or optional export/report surfaces.
- Do not let QR, brand, or promotional content replace GHS pictograms or
  required identity in labels.

Acceptance:

- The app can support awareness and eventual conversion without weakening the
  safety-critical workflow.
- Trust copy remains short, specific, and action-oriented.

## Priority 5 - Prepared Solution And Reprint Workflows

Goal: prepared-solution labels and recents should feel like a reliable lab
workflow, not a separate prototype.

Work to continue:

- Verify prepared solution labels against the same print acceptance standards.
- Keep parent chemical identity, concentration, solvent, date, and operational
  fields consistent in preview, recents, and print output.
- Ensure reprints cannot reload stale or unprintable configurations without the
  current planner checks.

Acceptance:

- Prepared solution print/reprint paths pass the same no-clipping, no-missing
  pictogram, and truthful-output rules as regular labels.
- Prepared-solution renderer/PDF cases are part of the print QA matrix; a
  browser-driven production-prepared path should also pass before treating
  prepared workflows as fully production-clickthrough covered.
- `qa:production-prepared` covers the deployed search → detail →
  prepare-solution form → print modal → handoff path for A4 primary, bottle
  supplemental, and tube quick-ID prepared labels.

## Immediate Next Recommended Slice

The next autonomous implementation slice should focus on Priority 1 and
Priority 2 together:

1. Re-test the production print modal in Chrome for Hydrochloric Acid across the
   common stock families.
2. Identify which failures are UI decision-flow problems versus renderer/fit
   problems.
3. Fix the highest-impact failure class.
4. Add code-level or PDF/production QA coverage that would have caught it.
5. Push, track CI/deploy, and run production QA before calling it done.
