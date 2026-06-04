# Claude Design UI Review Packet

Status: ready for external design exploration.

Use this file as the sanitized upload/prompt packet for Claude Design. It is
not a source of GHS, SDS, legal, or regulatory truth. It is a design brief for
UI hierarchy, workflow clarity, visual polish, and implementation handoff.

Current official entry point: https://claude.ai/design

Related project docs:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` - canonical project status and next-step
  selection.
- `DESIGN.md` - current product design language.
- `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` - current three-output print contract.
- `PRODUCT_REQUIREMENTS_DECISIONS.md` - pinned product decisions.
- `PRODUCT_SCOPE_GATE.md` - scope gate for broad product/design changes.
- `PERSONA_INTEGRATION_AND_SURVEY_RESEARCH_PLAN.md` - persona workflow gates
  and external research boundaries.
- `CLAUDE_DESIGN_ADOPTION_PLAN.md` - filter for downloaded Claude Design
  handoffs before any implementation.

After Claude Design produces a package, do not apply it directly. First classify
the output through `CLAUDE_DESIGN_ADOPTION_PLAN.md` as Adopt, Adapt, Reject, or
Needs Discussion, then open a scoped implementation slice only from concrete
evidence.

## 1. What Claude Design Should Help With

Claude Design should help explore better UI and interaction design for GHS
Label Quick Search, especially:

- Whole-product visual hierarchy and consistency.
- Batch lookup and review clarity for 50-100 chemicals.
- Results table readability and action grouping.
- Label print modal hierarchy for the three public outputs.
- Admin/data-quality triage layout as a maintainer work queue.
- Empty states, trust copy, and low-noise guidance.
- Design tokens and component rules that can be implemented in React,
  Tailwind, and Radix UI.

The expected outcome is a design direction plus handoff notes that Codex can
turn into code. Claude Design output is advisory; the implementation must still
respect project product contracts, safety constraints, tests, and QA gates.

## 2. What Claude Design Must Not Do

Do not ask Claude Design to verify, invent, or rewrite:

- GHS classification correctness.
- SDS correctness.
- H/P statement wording.
- Legal or regulatory compliance.
- PubChem, ECHA, or supplier-label authority.
- Chemical Chinese names as approved public dictionary data.
- GHS pictogram artwork or alternative hazard symbols.
- Safety-critical printed label content.

Do not ask it to add ads, sponsor copy, or promotional branding inside labels,
hazard summaries, pictograms, signal words, H/P statements, SDS links, or QR
label content.

## 3. Product Context To Paste Into Claude Design

GHS Label Quick Search is a free public chemical safety utility for lab,
teaching, operations, and safety-adjacent users. Its core workflow is:

1. Search one chemical or paste a batch list.
2. Review result trust, data-quality status, GHS options, and unresolved rows.
3. Print one of three label outputs.
4. Export batch results for lab-manager follow-up.
5. Send data-quality corrections into an admin review flow.

The highest-value user job is batch-first:

- Users often handle 50-100 chemicals.
- They do not want to understand the internal data model.
- They need to know what is ready, what needs review, and what action comes
  next.
- They need print/export/correction actions to feel clear and low-friction.

The product should feel like a clean daily lab utility: precise, bright,
trustworthy, compact, and calm. It should not feel like a marketing landing
page, a dark command center, or a decorative dashboard.

## 4. Current Design Language

Use this direction:

- Light-first workspace.
- White panels on pale slate/blue-gray background.
- Professional blue for primary actions.
- Red, amber, and green only for safety/status semantics.
- Compact 6-8px radius surfaces.
- Clear table/grid hierarchy.
- Monospace for CAS numbers, H-codes, P-codes, and technical identifiers.
- No decorative gradients, bokeh blobs, glassmorphism, or oversized hero
  marketing sections.
- GHS pictograms must remain crisp, high-contrast, and visually dominant when
  printed or previewed.

Design references as patterns, not templates:

- IBM Carbon: dense data-table clarity and form structure.
- Linear: calm technical hierarchy and polish.
- USWDS alerts: clear warning and action language.
- Things/Amie: approachable daily-use utility tone.

Avoid copying any brand-specific visual identity.

## 5. Current Public Print Model

The label-printing product model has exactly three user-facing outputs:

1. Complete A4/Letter label.
2. QR small label.
3. Identification small label.

Complete A4/Letter label:

- Full H/P content.
- All available GHS pictograms.
- CAS, English name, Chinese name.
- QR back to this product's lookup page.
- Responsible lab/supplier profile when configured.
- Same-output continuation pages when needed.

QR small label:

- CAS on first line.
- English name on second line.
- Chinese name on third line.
- QR on the first label only.
- All available GHS pictograms across same-output continuation labels.
- No H/P statements.
- No signal word.

Identification small label:

- CAS on first line.
- English name on second line.
- Chinese name on third line.
- All available GHS pictograms across same-output continuation labels.
- No QR.
- No H/P statements.
- No signal word.

Safety constraints:

- Available GHS pictograms must never silently disappear.
- QR labels cannot replace required visual hazard communication.
- Printed safety-critical labels must not include ads or promotional copy.
- The product must stay honest: users still need SDS, supplier labels, and
  local regulation review.

## 6. Current UI Problems To Explore

Ask Claude Design to critique and redesign these surfaces:

### Batch Results And Review

Problems:

- Batch review has many state buckets: ready, needs primary GHS confirmation,
  missing trusted Chinese name, unresolved search, upstream retry, source
  conflict, no GHS data, correction-ready.
- Users need to understand the next action without reading internal terms.
- Print/export/actions need a clearer hierarchy.

Design goal:

- A lab user should quickly know what can be printed now, what must be
  reviewed, and what can be exported or sent to correction.

### Results Table

Problems:

- Dense data is necessary, but action buttons and badges can compete.
- GHS pictograms, signal words, source trust, and row actions need predictable
  scan order.

Design goal:

- Results should feel like a trustworthy data grid, not a stack of cards.

### Label Print Modal

Problems:

- The workflow is now simpler, but preview, output choice, page count,
  continuation, and warning copy still need a calmer visual hierarchy.
- Users should not need to understand stock/template internals.

Design goal:

- Choose one output, see representative preview and page/label count, print or
  understand why a row needs review.

### Admin/Data-Quality Triage

Problems:

- Missing Chinese names, correction requests, inventory handoff, candidate
  evidence, manual entries, and unresolved searches are related but can feel
  scattered.

Design goal:

- Maintainers should see the next data-quality stage and process items without
  guessing which queue is closest to approval.

### General Visual Polish

Problems:

- Some surfaces feel like they were patched over time.
- The product should look more intentional without hiding safety information.

Design goal:

- Keep it calm, compact, professional, and pleasant for daily lab use.

## 7. Requested Claude Design Outputs

Ask Claude Design to produce:

1. A redesigned desktop flow for batch lookup -> review -> print/export.
2. A redesigned mobile/narrow flow for the same core job.
3. A label-print modal concept with the three-output model.
4. A data-quality/admin triage concept.
5. A compact component/token guide:
   - color tokens
   - typography scale
   - spacing scale
   - card/panel/table rules
   - badge/status rules
   - button/action hierarchy
6. Implementation handoff notes for React + Tailwind + Radix UI.
7. Explicit "do not change" notes for safety, label, and data-trust
   boundaries.

Claude Design should not produce a marketing landing page as the main output.
The first screen must remain the working product.

## 8. Prompt To Use In Claude Design

Paste this prompt after uploading this packet and any screenshots:

```text
You are helping redesign GHS Label Quick Search, a free public chemical safety
lookup and label-printing utility for lab and teaching workflows.

Use the uploaded packet as the design contract. Do not verify chemical,
regulatory, SDS, GHS, or legal correctness. Focus only on UI hierarchy,
workflow clarity, visual polish, and handoff quality.

Please create a productized UI direction for:
1. Batch lookup and review for 50-100 chemicals.
2. Results table and row action hierarchy.
3. Label print modal with exactly three public outputs: Complete A4/Letter
   label, QR small label, and Identification small label.
4. Admin/data-quality triage workflow.
5. Design tokens and implementation handoff notes for React + Tailwind + Radix
   UI.

Constraints:
- The first screen is the product, not a landing page.
- Keep the UI light, precise, compact, and trustworthy.
- Use one primary blue action color; use red/amber/green only for semantic
  safety/status states.
- Do not add promotional copy inside safety-critical label content.
- Do not invent GHS pictograms or modify hazard symbols.
- Do not hide or weaken available GHS pictograms.
- Do not ask ordinary users to reason about internal template/stock planning.
- Keep SDS, supplier-label, and local-regulation authority boundaries visible.

For each design concept, include:
- What user problem it solves.
- What information hierarchy changed.
- What components are needed.
- What should be implemented first.
- What risks Codex should check before coding.
```

## 9. Screenshots To Attach

Attach screenshots only if they do not expose private secrets, personal data,
admin keys, or confidential inventory details. Good screenshots:

- Production home/search first viewport.
- Batch results with mixed ready/review states.
- Label print modal showing the three outputs.
- A representative complete A4/Letter preview.
- A QR small label preview.
- An identification small label preview.
- Admin/data-quality triage surface, with sensitive values hidden if needed.
- Mobile/narrow results layout.

Do not attach:

- API keys, admin keys, private backend settings, secrets, raw environment
  variables, or private user contact data.
- Full unpublished chemical inventory files.
- Correction queue entries containing confidential lab details.

## 10. How Codex Should Consume The Result

After Claude Design produces output, bring back one or more of:

- Screenshot(s).
- Exported design file.
- Handoff markdown.
- HTML/prototype export.
- Token/component notes.
- Claude Design conversation summary.

Codex should then:

1. Compare the proposal against `DESIGN.md`,
   `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`, and
   `PRODUCT_REQUIREMENTS_DECISIONS.md`.
2. Reject or modify any part that weakens safety, print, or data-trust
   boundaries.
3. Convert accepted pieces into scoped implementation slices.
4. Prefer components/hooks/utils over widening `frontend/src/App.jsx`.
5. Update relevant tests and docs.
6. Run affected frontend tests, i18n/docs checks, build, and production QA if
   production UI changes are pushed.

## 11. Suggested Implementation Slices After Review

Do not implement all design output at once. Convert it into slices:

1. Batch review information hierarchy and action grouping.
2. Results table visual polish and status/badge consistency.
3. Label print modal hierarchy and preview explanation.
4. Admin/data-quality triage surface polish.
5. Empty-state/trust copy and brand utility polish.

Each slice needs:

- Source evidence from Claude Design output or user screenshot.
- Affected user job.
- Non-goals.
- Acceptance criteria.
- Tests/QA gate.
- Stop condition.

## 12. Current Browser Automation Note

Codex can usually operate Claude Design through the Codex Browser or Chrome
plugin when the browser connection is available. Login, account permissions,
CAPTCHA, payment, and upload confirmation remain user-controlled.

Uploading this packet or screenshots to Claude/Anthropic is transmission to a
third-party service. Confirm the specific files before upload.

If browser automation is unavailable, the user can manually upload this packet
to Claude Design, run the prompt in section 8, and return the exported result
or screenshots for Codex implementation.
