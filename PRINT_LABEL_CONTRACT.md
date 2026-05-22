# Print Label Contract

This document defines the target behavior for printed labels. It is a product and test contract, not legal advice. Final use still requires SDS, supplier label, and local regulation review.

The simplified user-facing output model lives in
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` and is the current product baseline. The
v1.10 implementation history lives in `PRINT_OUTPUT_REFACTOR_PLAN.md`; the
batch-print contract lives in `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`. Keep this
contract authoritative for safety boundaries, and use those plans for planner,
stock, typography, preview, batch, and UI sequencing decisions.

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` for current priority, continuation order,
and done criteria before changing this contract.

## North Star

The best path is a label workflow that a lab user can print without guessing:

1. Search a chemical.
2. Select label printing.
3. Choose one of three outputs: Complete A4/Letter label, QR small label, or
   Identification small label.
4. Preview the actual label fragment and any same-output continuation labels.
5. Print only after the app has confirmed the selected output can carry the
   required content without clipping or silently omitting safety-critical
   elements.

## Non-Negotiable Rules

- GHS pictograms are never summarized, hidden behind `+N`, replaced by QR, or omitted from any printed hazard label when pictogram data exists.
- The public print modal exposes exactly three first-level outputs: Complete
  A4/Letter label, QR small label, and Identification small label.
- A complete primary label includes product identifier, CAS, signal word, all
  GHS pictograms, H-statements, P-statements, complete responsible lab/supplier
  information (name, phone, and address), trust footer, and a QR code back to
  this product's lookup page.
- QR small labels are supplemental. They include CAS, English name, Chinese
  name, QR, and every available GHS pictogram across same-output continuation
  labels. They must not include H/P text, signal word, H-code chips, teaser
  summaries, case/custom fields, or verbose purpose copy inside the physical
  label.
- Identification small labels are supplemental. They include CAS, English name,
  Chinese name, and every available GHS pictogram across same-output
  continuation labels. They must not include QR, H/P text, signal word, H-code
  chips, teaser summaries, case/custom fields, or verbose purpose copy inside
  the physical label.
- Dense complete-label content must route users to A4 Primary or Letter Primary
  first. The renderer should use the available full-page area efficiently before
  splitting. If the selected A4/Letter complete label still cannot fit all H/P
  text on one page, it must produce same-stock continuation pages rather than
  blocking solely because the first page is full. Complete primary labels still
  block print until required content can be rendered and the responsible
  lab/supplier profile is complete.
- A4 Primary is a distinct full-page rendering path, not just a larger paper option. It must scale the live preview to show the whole label, enlarge GHS pictograms, and use statement layout rules that can actually carry dense H/P content.
- Letter Primary must be supported alongside A4 Primary for North American users. Both are complete primary-label outputs, not supplemental templates.
- The print workflow should use an output planner: scale typography, reflow layout, and combine/deduplicate safe statement text before routing to a larger stock or supplemental output.
- Fit decisions must be tied to rendered content, not only stock names or
  statement counts. The system should derive a tighter fit level from chemical
  name length, CAS/case identity chips, hazard text load, and pictogram count,
  then retry fixable overflow with smaller typography before blocking print.
- A4 and Letter are the user-facing complete-label stocks. Smaller public
  outputs stay small and use same-output continuation labels; they do not
  bounce to A4/Letter merely because one item has many pictograms.
- QR codes must not consume repeated continuation space by default. Complete
  A4/Letter continuation sets and QR small-label continuation sets print the QR
  code on the first page/label, then use later continuation space for required
  text or pictograms.
- Batch printing must keep the user-selected physical stock fixed for the
  batch. The app may recommend A4/Letter or another stock as a recovery path,
  but it must not silently split one batch across mixed stocks.
- Batch printing must be purpose-first. Quick-ID and supplemental batches do
  not fail merely because full H/P text cannot fit; complete-primary batches
  must never silently omit required content.
- CAS is mandatory identity content on all three outputs. Case/batch/custom
  fields are future advanced content and must not crowd the initial simplified
  small-label model.
- Print preview and print output must use the same renderer for the label fragment.
- Color / black-and-white, bilingual name mode, orientation, and stock preset choices must be reflected in preview and print output.
- Safety-critical printed label content must not contain ads, sponsor copy, or unrelated brand promotion.
- Future case/batch numbers and other identity fields must enter through a
  separate advanced policy and fit gate before they become printable on small
  labels.
- Every selectable stock/purpose combination must have explicit renderer and QA
  coverage, or it must be unavailable in the first-level workflow. The user
  should not discover unsupported stock behavior by clicking print.
- Compact outputs must pass visual geometry checks, not only DOM-content checks:
  pictograms must not overlap CAS, case/batch identity, signal word, product
  name, QR, or the label border.
- The user-facing stock QA families currently include A4 Primary, Letter
  Primary, 62 mm continuous QR small labels, and 70 x 24 mm identification
  small labels. Legacy/internal stock tests may remain as guardrails, but they
  are not first-level product choices.

## Test Standards

Automated tests should pin these behaviors:

- Every template (`icon`, `standard`, `full`, `qrcode`) renders every available GHS pictogram code and does not emit `.more-pics`.
- Full primary labels render all H/P statements on the selected A4/Letter stock,
  using continuation pages when needed. Preflight blocks only if the continuation
  set still cannot keep required identity, pictograms, QR, profile, and H/P text
  visible.
- Moderate A4/Letter primary labels should remain one efficient full-page
  output. QA should treat unnecessary continuation pages and large unused H/P
  areas as product regressions, not harmless formatting differences.
- Dense shipped-container labels on regular large stock auto-route to a viable A4 or Letter primary output when the planner can produce one, instead of leaving the user at a disabled print dead end.
- A4/Letter Primary allows dense complete labels as continuation sets and does
  not open the overflow/blocking alert merely because H/P text continues onto a
  later page. The print action and preview summary must show the resulting label
  and page count.
- Complete primary labels block print when responsible lab/supplier name, phone, or address is missing; the required-output checklist reports the missing profile fields.
- Supplemental template warnings stay visible in the modal/preview workflow, not as verbose text inside the physical label.
- Layout preflight rejects overflow, footer clipping, and statement-code overflow before printing complete primary labels. Supplemental labels should adapt typography/reflow and remain printable unless safety-critical pictograms or identity are missing.
- Compact-label preflight must prove that the resolved auto-fit level was used
  by both preview and print handoff. A blocked print is acceptable only after
  the renderer has already tried the allowed tighter fit levels and still finds
  critical clipping or missing identity/pictograms.
- Production print QA must inspect the actual preview iframe for visible
  overflow/clipping of critical identity, signal, QR, pictogram, and hazard
  summary containers. A passing handoff status is not enough if the preview is
  visibly cut off.
- Print/PDF artifact QA must render generated print documents through Chrome
  print media and fail when the PDF is invalid, required GHS images fail to
  load, pictogram sets drift, QR state is wrong, `more-pics` appears, or
  identity/hazard/QR/compliance containers visibly overflow.
- Print/PDF artifact QA must also fail on visual overlap classes such as
  pictogram-overlaps-CAS, pictogram-overlaps-signal, pictogram-overlaps-name,
  QR-overlaps-pictogram, or compact content outside the label boundary.
- Production bundle freshness checks must include stock-specific markers when
  print CSS or renderer behavior depends on stock families. A deployed bundle
  that lacks current small-rack or medium-rack markers is stale even if the app
  loads successfully.
- Batch-print QA must include a true fixed-stock mixed batch, not only separate
  representative `multi-chemical` cases. The gate must verify per-item fit
  categories, excluded reasons, representative previews, and fixed-stock print
  output.

## Browser QA Scenarios

Run these in Browser Use after meaningful print-workflow changes:

- Hydrochloric acid, shipped-container / full / Large Primary: the modal auto-applies A4 or Letter Primary, the print action is available when required profile data is complete, and all pictograms remain visible.
- Hydrochloric acid on A4 or Letter Primary with an incomplete lab/supplier profile: print action remains disabled and the required-output checklist shows the missing profile fields.
- Hydrochloric acid after completing lab/supplier name, phone, and address: print action becomes available; all pictograms remain visible in the live label preview.
- A4 Primary preview shows the full label scaled inside the preview pane rather than cropping the top of the full-page label.
- Ethanol, standard label: all pictograms visible; no `+N` pictogram summary appears.
- QR small label: CAS, English name, Chinese name, QR, and every pictogram
  remain visible across the continuation set; no H/P text or signal word is
  printed. The QR image appears on the first label; later continuation labels
  use the recovered space for remaining pictograms.
- Identification small label: CAS, English name, Chinese name, and every
  pictogram remain visible across the continuation set; no QR, H/P text, or
  signal word is printed.
- Small-label continuation: the print action and summary report the actual
  physical output label count, not just the source chemical count.
- Black-and-white mode: pictograms and QR are grayscale in preview.
- English / Chinese / bilingual name modes: preview text changes while icon positions remain stable.
- Fixed-stock batch: a mixed batch keeps one selected stock, shows included /
  reduced / continuation / excluded counts, previews worst-fit representatives,
  and does not force truthful Quick-ID or Supplemental output into A4-only
  recovery.
