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
- A complete primary label includes product identifier, CAS, signal word, all GHS pictograms, H-statements, P-statements, complete responsible lab/supplier information (name, phone, and address), trust footer, and optional QR support.
- QR supplement and quick-ID labels are visibly supplemental. They must not imply that they replace the complete primary label.
- Dense content must route users to a larger complete-label stock first, especially A4 Primary or Letter Primary. Complete primary labels must block print until required content can be rendered and the responsible lab/supplier profile is complete.
- A4 Primary is a distinct full-page rendering path, not just a larger paper option. It must scale the live preview to show the whole label, enlarge GHS pictograms, and use statement layout rules that can actually carry dense H/P content.
- Letter Primary must be supported alongside A4 Primary for North American users. Both are complete primary-label outputs, not supplemental templates.
- The print workflow should use an output planner: scale typography, reflow layout, and combine/deduplicate safe statement text before routing to a larger stock or supplemental output.
- Print preview and print output must use the same renderer for the label fragment.
- Color / black-and-white, bilingual name mode, orientation, and stock preset choices must be reflected in preview and print output.
- Safety-critical printed label content must not contain ads, sponsor copy, or unrelated brand promotion.

## Test Standards

Automated tests should pin these behaviors:

- Every template (`icon`, `standard`, `full`, `qrcode`) renders every available GHS pictogram code and does not emit `.more-pics`.
- Full primary labels render all H/P statements, or preflight blocks before opening print if the chosen stock cannot fit them.
- Dense shipped-container labels on regular large stock auto-route to a viable A4 or Letter primary output when the planner can produce one, instead of leaving the user at a disabled print dead end.
- A4 Primary allows dense complete labels within the documented statement threshold and does not open the overflow/blocking alert for the HCl-style dense path.
- Complete primary labels block print when responsible lab/supplier name, phone, or address is missing; the required-output checklist reports the missing profile fields.
- Supplemental templates keep purpose notices visible.
- Layout preflight rejects overflow, footer clipping, and statement-code overflow before printing.

## Browser QA Scenarios

Run these in Browser Use after meaningful print-workflow changes:

- Hydrochloric acid, shipped-container / full / Large Primary: the modal auto-applies A4 or Letter Primary, the print action is available when required profile data is complete, and all pictograms remain visible.
- Hydrochloric acid on A4 or Letter Primary with an incomplete lab/supplier profile: print action remains disabled and the required-output checklist shows the missing profile fields.
- Hydrochloric acid after completing lab/supplier name, phone, and address: print action becomes available; all pictograms remain visible in the live label preview.
- A4 Primary preview shows the full label scaled inside the preview pane rather than cropping the top of the full-page label.
- Ethanol, standard label: all pictograms visible; no `+N` pictogram summary appears.
- QR supplement: QR remains dominant, purpose notice is visible, and all pictograms still render.
- Black-and-white mode: pictograms and QR are grayscale in preview.
- English / Chinese / bilingual name modes: preview text changes while icon positions remain stable.
