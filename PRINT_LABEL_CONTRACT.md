# Print Label Contract

This document defines the target behavior for printed labels. It is a product and test contract, not legal advice. Final use still requires SDS, supplier label, and local regulation review.

The detailed implementation plan for the next workflow refactor lives in `PRINT_OUTPUT_REFACTOR_PLAN.md`. Keep this contract authoritative for safety boundaries, and use the refactor plan for planner, stock, typography, preview, and UI sequencing decisions.

## North Star

The best path is a complete primary label that a lab user can print without guessing:

1. Search a chemical.
2. Select label printing.
3. Use the shipped-container / primary-label path by default.
4. Preview a label that keeps the hazard hierarchy clear.
5. Print only after the app has confirmed the selected stock can carry the required content without clipping or silently omitting safety-critical elements.

## Non-Negotiable Rules

- GHS pictograms are never summarized, hidden behind `+N`, replaced by QR, or omitted from any printed hazard label when pictogram data exists.
- A complete primary label includes product identifier, CAS, signal word, all GHS pictograms, H-statements, P-statements, complete responsible lab/supplier information (name, phone, and address), and trust footer. QR support belongs in a separate supplemental output unless a future fit check proves it does not compromise the primary layout.
- QR supplement and quick-ID labels are visibly supplemental in the print workflow. The physical label must not waste scarce label area on verbose purpose copy, and must not imply that it replaces the complete primary label.
- Dense content must route users to a larger complete-label stock first, especially A4 Primary or Letter Primary. Complete primary labels must block print until required content can be rendered and the responsible lab/supplier profile is complete.
- A4 Primary is a distinct full-page rendering path, not just a larger paper option. It must scale the live preview to show the whole label, enlarge GHS pictograms, and use statement layout rules that can actually carry dense H/P content.
- Letter Primary must be supported alongside A4 Primary for North American users. Both are complete primary-label outputs, not supplemental templates.
- The print workflow should use an output planner: scale typography, reflow layout, and combine/deduplicate safe statement text before routing to a larger stock or supplemental output.
- Fit decisions must be tied to rendered content, not only stock names or
  statement counts. The system should derive a tighter fit level from chemical
  name length, CAS/case identity chips, hazard text load, and pictogram count,
  then retry fixable overflow with smaller typography before blocking print.
- A4 and Letter are complete primary outputs, not the only valid physical label sizes. Container label stocks may be selected first; the app must scale text and pictograms for that stock, then recommend A4/Letter only when the selected stock cannot truthfully carry the complete primary label.
- When a user manually selects a bottle/container stock that cannot carry the complete primary label, the app must keep that selected physical size and produce a clearly marked supplemental label rather than silently changing the user's stock choice.
- 140 x 88 mm and similar large container-front labels are not mini A4 labels.
  They must keep identity, CAS, case/batch number, signal word, and every
  available GHS pictogram visible, then print a prioritized H-statement summary
  only. P-statements and full H/P text belong on A4/Letter primary output,
  continuation pages, SDS/QR, or a back/fold-out label.
- CAS and case/batch identifiers must use one consistent identity treatment
  across physical label templates; they should not move between unrelated
  custom-field footers and differently styled chips.
- Print preview and print output must use the same renderer for the label fragment.
- Color / black-and-white, bilingual name mode, orientation, and stock preset choices must be reflected in preview and print output.
- Safety-critical printed label content must not contain ads, sponsor copy, or unrelated brand promotion.
- Case/batch numbers and other identity fields must be part of fit planning for
  supplemental labels. A normal case identifier should remain printable on
  quick-ID and QR outputs; an oversized identifier should be rejected before
  print handoff rather than visually clipped.
- Every selectable stock/purpose combination must have explicit renderer and QA
  coverage, or it must be unavailable in the first-level workflow. The user
  should not discover unsupported stock behavior by clicking print.
- Compact outputs must pass visual geometry checks, not only DOM-content checks:
  pictograms must not overlap CAS, case/batch identity, signal word, product
  name, QR, or the label border.
- The stock QA families currently include A4 Primary, Letter Primary, standard
  bottle, large front label, small rack, medium rack, 62 mm continuous, strip,
  QR supplement, and custom stock routing.

## Test Standards

Automated tests should pin these behaviors:

- Every template (`icon`, `standard`, `full`, `qrcode`) renders every available GHS pictogram code and does not emit `.more-pics`.
- Full primary labels render all H/P statements, or preflight blocks before opening print if the chosen stock cannot fit them.
- Dense shipped-container labels on regular large stock auto-route to a viable A4 or Letter primary output when the planner can produce one, instead of leaving the user at a disabled print dead end.
- A4 Primary allows dense complete labels within the documented statement threshold and does not open the overflow/blocking alert for the HCl-style dense path.
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

## Browser QA Scenarios

Run these in Browser Use after meaningful print-workflow changes:

- Hydrochloric acid, shipped-container / full / Large Primary: the modal auto-applies A4 or Letter Primary, the print action is available when required profile data is complete, and all pictograms remain visible.
- Hydrochloric acid on A4 or Letter Primary with an incomplete lab/supplier profile: print action remains disabled and the required-output checklist shows the missing profile fields.
- Hydrochloric acid after completing lab/supplier name, phone, and address: print action becomes available; all pictograms remain visible in the live label preview.
- A4 Primary preview shows the full label scaled inside the preview pane rather than cropping the top of the full-page label.
- Ethanol, standard label: all pictograms visible; no `+N` pictogram summary appears.
- QR supplement: QR remains dominant, the workflow clearly marks it as supplemental, and all pictograms still render.
- Small rack quick-ID: CAS, product identity, signal word, and all pictograms
  remain visible without overlap; the output is marked supplemental/quick-ID.
- Small rack QR supplement: QR and every pictogram remain visible without
  collision; the output is marked supplemental and not a primary substitute.
- Medium rack quick-ID and QR: stock-specific compact rules apply, and the
  preview remains whole-label visible in Fit mode.
- Large front label: identity, CAS, case/batch when present, signal word, all
  pictograms, and prioritized H-statements fit without claiming full H/P
  completeness.
- Black-and-white mode: pictograms and QR are grayscale in preview.
- English / Chinese / bilingual name modes: preview text changes while icon positions remain stable.
