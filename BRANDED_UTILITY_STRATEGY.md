# Branded Utility Strategy

## Goal

This project should work as a free public utility that people genuinely want to use, while creating brand visibility and soft conversion opportunities for related services or products.

The strategic stance is:

> Give users real safety workflow value first. Create trust and recall through usefulness. Offer the next step only after the tool has helped them.

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` for current priority, continuation order,
and done criteria before changing brand, support, education, or conversion
surfaces.

## Current Product Contract

As of v1.10, brand/support surfaces are allowed only when they clarify
authorship, correction paths, workflow help, or post-task resources. They must
not compete with the user's safety decision.

Current shipped surfaces:

- Footer attribution and correction/request links.
- Product trust panel on the empty/results states.
- Separate GitHub issue templates for data corrections and workflow requests.
- Structured support-link prefill for contextual data corrections and workflow
  help, while keeping generic footer links low-pressure.
- Generated/printed label trust footer copy that stays safety-focused rather
  than promotional.

Regression expectation:

- `qa:production-search-ui` must keep data-correction and workflow-request
  links separated.
- Footer/ProductTrustPanel tests must keep support links pointed to the correct
  issue templates and preserve structured context when a surface knows enough
  to prefill it.
- Print QA must keep promotional or unrelated content out of hazard labels.

## What This Means For Design

The app should not look like a lead-generation landing page. The first screen remains the working tool. The product can still be branded, but brand presence should feel like authorship and reliability, not pressure.

The design should communicate:

- Fast chemical lookup.
- Trustworthy source handling.
- Useful label output.
- Clear safety boundaries.
- Professional polish.

## Value Moments

Promotion and conversion belong after value is delivered:

- After a successful search.
- After the user opens a detail/SDS view.
- After printing or previewing a label.
- After export completion.
- In no-data or partial-data states, if framed as help finding a source.
- In footer/resource areas.

Promotion does not belong before the first search, inside hazard statements, or inside compliance-critical printed labels.

## Surface Matrix

| Surface | Allowed | Not allowed |
| --- | --- | --- |
| Search/empty state | Product authorship, source boundary, correction/workflow links | Lead-capture wall, forced sign-up, sales hero |
| Results/detail views | SDS/source verification, correction links, workflow request links | Claims of legal approval, sponsored source ranking |
| Print modal | Output-role explanation, blocked-output recovery, template guidance | Ads, affiliate prompts, service upsells in blocker copy |
| Printed labels | Required hazard communication, identity/profile fields, safety footer | Brand campaigns, sponsor copy, unrelated QR destinations |
| Exports | Source timestamp or generated-by metadata if useful | Promotional rows mixed into safety data |
| QR/detail pages | Hazard summary, SDS path, subtle footer attribution | Promotions above hazard/SDS content |

## Allowed Conversion Surfaces

### Header / Footer

Light brand presence is acceptable:

- Product name.
- Source/project link.
- Report issue link.
- Optional "by [brand]" attribution.

Keep this small and persistent.

### Results Sidebar Or Resource Strip

After results exist, a narrow resource strip can offer:

- SDS review service.
- Batch label setup help.
- Printer/label stock guide.
- Downloadable lab label checklist.

This must be visually secondary to results and never look like a safety source.

Data corrections and workflow help must remain separate:

- Data correction: wrong/missing CAS, name, GHS state, SDS/reference link, or
  source conflict evidence.
- Workflow help: batch labels, prepared-solution workflows, QR flows, internal
  deployment, lab templates, or printer/stock setup.

Do not route safety-data corrections into a commercial lead path.

When a support surface already has context, prefer prefilled issue-template
fields over free-form prose:

- Data-correction links may carry CAS, chemical name, issue type, current
  output, expected output, evidence type, and local context.
- Workflow-help links may carry workflow area, goal, current problem, desired
  behavior, and examples.

Keep generic footer links unfilled so they do not feel like another form before
the user has a concrete task.

### Print Completion

After a user prints or previews labels:

- Suggest saving a template.
- Suggest label stock calibration.
- Offer a guide for waterproof/solvent-resistant labels.
- Offer professional review for high-risk lab workflows.

Do not add ads to the printed label body.

### Exports

CSV/XLSX files may include metadata if explicitly useful, such as source timestamp or generated-by metadata in a separate sheet or header comment. Do not insert promotional rows into exported safety data.

### Share / QR Pages

If the product later has hosted QR detail pages, the page may include subtle branding and a footer CTA. The hazard summary and SDS link remain above any promotional content.

## Hard No-Go Areas

Never place ads, affiliate links, or conversion CTAs:

- Inside the GHS pictogram group.
- Next to signal words.
- Between H-statements or P-statements.
- In the printed compliance label body.
- In warning banners that describe PubChem/SDS trust state.
- In source/provenance chips.

These areas must remain clean because users interpret them as safety-critical.

## Potential Business Paths

### Professional SDS / Label Review

Offer a review service for labs that need a human to check recurring labels, local requirements, or supplier SDS alignment.

Best placement: after print preview or in a low-noise footer/resource strip.

### Team / Workspace Version

Free users can search and print. Paid/team users could later get:

- Shared label templates.
- Shared lab profile.
- Admin-managed dictionary additions.
- QR detail pages.
- Print history.
- Audit/export bundles.

### Label Stock / Printer Guidance

Affiliate or sponsored recommendations may work because the tool already helps users print. These must be clearly labeled and kept separate from safety data.

### Content Hub

Publish practical resources:

- How to label secondary containers.
- How to choose label stock.
- H-code/P-code plain-language guides.
- PubChem/ECHA/SDS source explanation.

Use content as discovery and trust-building, not as modal popups.

## Commercial Copy Review Gate

Any future commercial or brand-visibility change must answer these checks
before implementation:

1. Does it appear only after or outside the safety task?
2. Does it avoid GHS pictograms, signal words, H/P statements, SDS authority
   copy, blocked-output warnings, and printed label bodies?
3. Does it keep data-correction paths separate from business/workflow requests?
4. Can a user complete search, verify, preview, print, and export without
   interacting with the promotional surface?
5. Does production QA or a focused test prove the safety-critical surface stayed
   clean?

## Product Metrics

Track quality and productization without turning the app into an analytics-heavy surface:

- Successful searches.
- No-result searches.
- Upstream-error searches.
- Label previews.
- Print completions.
- Template saves.
- QR template use.
- Export completions.

Do not track sensitive chemical workflows beyond what is necessary, and keep admin/pilot tools gated.

## UX Copy Rules

Copy should sound operational and helpful:

- "Review source before final use."
- "Use supplier SDS as authority."
- "Save this print setup."
- "Need recurring labels for a lab?"

Avoid:

- "Buy now."
- "Limited offer."
- "Guaranteed compliant."
- "Certified label."

The product must never imply that a generated label is automatically regulatory-final.
