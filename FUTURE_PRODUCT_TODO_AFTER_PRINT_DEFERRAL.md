# Future Product To-Do After Physical Print Deferral

This is the tracking document for the next product maturity phase while
real-printer validation is intentionally deferred.

The goal is not to add more features for their own sake. The goal is to bring
the public free utility to a "ready enough for repeated daily use" level:
trustworthy data boundaries, calm task-first UX, clean public documentation,
and brand/support surfaces that do not interfere with safety-critical work.
Fixed-stock batch label printing is now tracked as a first-class product slice
in `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` because it is a non-physical-print
workflow gap that affects daily usability before real-printer validation.

## Scope And Status Model

Physical print validation is out of scope for this document except where a
future issue affects QR scan reliability, label meaning, or user guidance. Keep
real-printer work in `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.

Use these status labels when updating items:

| Status | Meaning |
| --- | --- |
| `Open` | Needs product/design/engineering work. |
| `Planned` | Direction is clear, but implementation has not started. |
| `In progress` | Active branch/work exists. |
| `Gate added` | A test, QA script, or checklist now catches regressions. |
| `Shipped` | Implemented, verified, pushed, and documented. |
| `Monitoring` | Stable for now; keep watching for real examples. |
| `Deferred` | Intentionally postponed with a reason. |

Definition of done for any item:

- The user-facing outcome is clear.
- The safety/authority boundary is unchanged or explicitly documented.
- Tests or production QA cover the expected behavior where practical.
- The relevant planning docs are updated.
- Production-facing changes pass CI and the appropriate production QA gate.

## 1. Data Trust, Source Governance, And Correction Workflow

Status: `Open`

Why this matters: users need to trust the tool without mistaking it for the
legal authority. PubChem, ECHA, supplier SDS, local dictionary aliases, manual
curation, and user corrections can disagree. The product should make those
differences understandable and safe.

### 1.1 Source-Conflict Handling

Status: `Gate added` on 2026-05-15.

Goal: when PubChem/ECHA/manual/reference sources disagree or look incomplete,
the app should expose the uncertainty without creating false certainty.

Work items:

- Completed: added a Detail modal source-conflict note for chemicals with
  multiple public classifications, and reframed classification switching as an
  SDS/supplier/local-rule verified action rather than a casual preference.
- Completed: expanded `qa:production-search-ui` so the deployed Detail modal
  must keep the source-conflict note visible for the Hydrochloric Acid
  multiple-classification path.
- Completed: tightened label-print entry points so found chemicals with no GHS
  hazard content cannot be auto-selected, selected from result rows, printed
  from Detail, or printed from Favorites. Text-only GHS records remain
  selectable because they still carry hazard content.
- Completed: expanded `qa:production-search-ui` with a deployed no-GHS data
  state using Urea (`57-13-6` by default). The gate now verifies the result row
  and Detail modal both show the no-GHS warning, keep text-only-GHS warnings
  separate, disable print entry points, and keep the row out of label
  selection.
- Audit the search result, detail modal, print modal, export rows, and QR
  target selection for source-conflict language.
- Define what the UI says when the primary source is PubChem, ECHA-derived,
  local dictionary assisted, manual-reference assisted, or upstream-degraded.
- Keep alternate GHS classifications inspectable and make their source/ranking
  logic easier to understand.
- Add regression cases for chemicals with multiple classifications, no
  pictograms but GHS text, no GHS data, and upstream transient failures.

Acceptance:

- A user can tell what came from the app, what came from PubChem/ECHA, and what
  must be verified against SDS/supplier/local rules.
- No UI state presents missing upstream data as "no hazards."
- `npm run qa:production-search-ui` or a focused test catches source-state
  regressions.

### 1.2 Correction Intake And Review Flow

Status: `Gate added` on 2026-05-15.

Goal: data-correction requests should become an auditable improvement path, not
an unstructured support inbox.

Work items:

- Completed: clarified the public correction path in `README.md` and
  `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.
- Completed: added separate GitHub issue templates for data corrections and
  workflow requests.
- Completed: routed frontend support links to the specific issue templates.
- Keep deciding whether correction requests remain GitHub issue links, move to
  a form, or are mirrored into admin review after usage evidence appears.
- Add admin-facing status fields if manual dictionary/reference curation needs
  review states such as `pending`, `accepted`, `rejected`, or `needs evidence`.
- Keep workflow/business requests separate from safety-data corrections.

Acceptance:

- Data correction and workflow requests stay visibly separate.
- Manual curation remains admin-gated and bounded.
- A correction can be traced from user report to reviewed manual entry,
  reference link, or explicit rejection.

### 1.3 SDS And Reference-Link Authority Model

Status: `Gate added` on 2026-05-15.

Goal: SDS/regulatory/occupational/reference links should remain useful without
implying that the app has resolved compliance.

Work items:

- Completed: `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` defines the role-first
  order, safe-scheme requirement, duplicate-URL strongest-role rule, and QR
  target boundary.
- Completed: frontend and backend tests cover unsafe schemes, unknown roles,
  role-first ordering, duplicate role merging, and QR target preference.
- Keep role-first ordering (`SDS`, `Regulatory`, `Occupational`, `Reference`)
  aligned across backend, frontend, QR target selection, detail views, and
  exports.
- Add visual or copy polish only if it reduces confusion; avoid making
  reference links look like final legal approval.
- Review QR target fallback behavior when no SDS/regulatory link is available.
- Add examples for unsafe/legacy links, duplicate URLs with different roles,
  and manual SDS links with higher priority.

Acceptance:

- Unsafe URL schemes never render or become QR targets.
- Generic references cannot outrank SDS/regulatory evidence by numeric priority
  alone.
- Production QA continues checking safe schemes, roles, sources, and ordering.

### 1.4 Telemetry, Admin Cost, And Privacy Boundaries

Status: `Gate added` on 2026-05-15.

Goal: pilot telemetry should help improve coverage without becoming a storage,
privacy, or abuse risk.

Work items:

- Completed: restricted public miss-query `context` to a small allow-list of
  non-freeform metadata keys and primitive values; unsupported keys such as
  email/free-text/nested payloads are dropped before persistence.
- Completed: added backend tests for miss-query context sanitization,
  long-allowed-scalar rejection, existing oversized payload rejection, opt-in
  behavior, and rate-limit registration.
- Completed: added maintainer retention and review rules to
  `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`: public production keeps capture
  disabled by default, pilot raw rows get monthly review and 90-day delete or
  aggregation, exports are not analytics storage, identity/free-form payloads
  stay out of miss context, and abuse is handled by disabling capture before
  loosening caps.
- Review dictionary miss telemetry retention, payload caps, rate limits, and
  admin export scope.
- Decide what data is worth collecting for a public free tool and what should
  never be stored.
- Keep observability exports admin-gated and avoid user-identifying payloads
  unless explicitly justified.

Acceptance:

- Public write paths are bounded.
- Admin reports are useful but not over-collected.
- Abuse and privacy assumptions are documented.

## 2. User Guidance, Low-Noise UX, And First-Time Success

Status: `Open`

Why this matters: the tool already has many capabilities. The next maturity
step is helping a first-time lab or operations user complete the main task
without reading long explanations or understanding internal print logic.

### 2.1 First-Time Search-To-Decision Path

Status: `Gate added` on 2026-05-15.

Goal: a new user should understand what to do first and what result they are
looking at within seconds.

Work items:

- Completed: reviewed empty state, search examples, autocomplete, result row
  hierarchy, source chips, SDS links, detail action, print action, and export
  actions.
- Completed: added a compact results decision guide that fixes the first result
  path as identity check, SDS/source verification, then print/export.
- Completed: extended production search UI QA to require the decision guide and
  three decision steps.
- Reduce wording that explains implementation details instead of user
  decisions.
- Make common paths obvious: search by CAS, search by name, inspect details,
  verify SDS, print selected labels, export data.
- Add production QA or screenshot review for first-screen readability when UI
  changes.

Acceptance:

- A first-time user can search Hydrochloric Acid and understand identity,
  hazard visuals, source context, SDS path, and print entry without opening
  documentation.
- Result actions stay readable on desktop and 390px narrow width.

### 2.2 Print Workflow Guidance Without More Controls

Goal: users should feel the app is choosing the right print output with them,
not forcing them to become layout experts.

Work items:

- Keep the first-level print modal focused on physical target, output role,
  preview, and print action.
- Move rare tuning into secondary or advanced areas.
- Improve blocked-output recovery copy: name the current stock, why it cannot
  carry the content, and the recommended next output.
- Keep supplemental/quick-ID/QR labels honest and visually distinct from
  complete primary labels.

Acceptance:

- Users can tell when the app will print a complete primary label versus a
  supplemental or quick-ID output.
- Blocked states provide a usable next step, not just a warning.
- `npm run qa:production-product` remains green after UI changes.

### 2.3 Narrow And Mobile Read-First Polish

Status: `Gate added` on 2026-05-15.

Goal: mobile and narrow screens may be read/search/SDS-first rather than
print-first, but the core workflow should not visually break.

Work items:

- Completed: expanded `qa:production-search-ui` so the first-time decision
  guide must remain visible, complete, and non-vertical at 390px width.
- Continue expanding `qa:production-search-ui` when new narrow/mobile
  regressions appear.
- Review result cards, detail comparison cards, trust notes, SDS/reference
  links, and modal close/focus behavior at narrow widths.
- Do not over-invest in mobile print UX until real mobile-print usage exists.

Acceptance:

- No horizontal scrolling for core search/detail reading paths at 390px.
- Detail and SDS actions remain visible and usable.
- Complex dialogs keep focus containment and Escape behavior.

### 2.4 Accessibility And Keyboard Continuity

Goal: safety workflow surfaces should stay usable by keyboard and screen-reader
users as the UI is simplified.

Work items:

- Keep shared focus-trap behavior for all modal/sidebar surfaces.
- Review aria-modal, inert, aria-hidden, labels, close buttons, and stacked
  modal ownership when dialogs are added or simplified.
- Add production or unit tests for any newly complex keyboard path.

Acceptance:

- Tab/Shift+Tab stays inside the active modal.
- Escape closes the top active layer without accidentally closing background
  layers.
- Production search UI QA continues covering Detail and Prepare Solution.

### 2.5 Fixed-Stock Batch Label Printing

Status: `Gate added` on 2026-05-16.

Goal: users should be able to print a realistic batch by choosing one physical
stock and one purpose, then reviewing which chemicals can print, which are
reduced, and which are excluded.

Owner document: `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.

Work items:

- Completed: Quick ID, Supplemental, and Complete are first-level batch
  purposes in the batch planner.
- Completed: the planner keeps one selected stock for the batch and does not
  silently mix A4/Letter, bottle, tube, rack, and QR stocks in one automatic
  print job.
- Completed: the batch fit report uses per-item categories: `ready`,
  `ready-tight`, `reduced-purpose`, `same-stock-continuation`,
  `excluded-data`, and `excluded-fit`.
- Completed: representative previews cover first included, worst fit, longest
  name, most pictograms, densest text, and excluded list.
- Completed: a true 50-item fixed-stock fixture is covered by planner tests,
  production Browser QA, product-level QA, and a print HTML/PDF artifact for a
  fixed-stock Quick ID batch.
- Keep this area in monitoring and add new examples when screenshots, QA
  failures, or real-world batch lists expose new layout or guidance issues.

Acceptance:

- One dense or missing-data chemical does not block unrelated printable labels.
- Quick ID and Supplemental batches can print truthfully without full H/P text.
- Complete batches either fit, continue on the same stock, exclude items, or
  ask the user to change purpose/stock; they never silently omit required
  content.
- Users can see included, reduced, continuation, and excluded counts before
  print handoff.

## 3. Public Documentation, README Cleanup, And Maintainer Clarity

Status: `In progress`

Why this matters: the project has strong internal planning docs, but the public
README must stay readable, user-facing, and aligned with the internal planning
entry points. A public tool needs clean docs that build trust.

### 3.1 README Encoding And Public-Facing Rewrite

Status: `Shipped` on 2026-05-15.

Goal: `README.md` should be clean, readable, and oriented toward users and
maintainers, not a corrupted historical dump.

Work items:

- Completed: replaced corrupted text with a concise, UTF-8 clean README.
- Completed: kept public-facing sections for what the tool does, safety
  boundary, local dev, production URLs, main commands, data sources,
  limitations, maintainer entry points, and correction paths.
- Completed: moved deep internal history out of the public README by pointing
  readers to the canonical planning and safety docs.
- Completed: avoided stronger legal/compliance claims than the product
  supports.

Acceptance:

- README renders cleanly on GitHub.
- A new visitor can understand the product without reading internal roadmaps.
- Maintainers can find canonical planning and QA entry points.

### 3.2 Maintainer Docs Split

Status: `Shipped` on 2026-05-15.

Goal: public docs and maintainer docs should not fight each other.

Work items:

- Completed: replaced `CLAUDE.md` with a short delegation file that points to
  `AGENTS.md`, `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  `AUTONOMOUS_WORKFLOW.md`, and this future tracker instead of duplicating
  stale project context.
- Completed: added `AGENTS.md` to the README maintainer entry points.
- Keep `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical internal planning
  entry.
- Keep `AGENTS.md` current for coding-agent/session bootstrap context.
- Keep `AUTONOMOUS_WORKFLOW.md` focused on how to continue work.
- Keep `CLAUDE.md` as a pointer only, unless the canonical entry-point order
  changes.

Acceptance:

- A new coding session can read `AGENTS.md`, `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  and `AUTONOMOUS_WORKFLOW.md` and know how to proceed.
- Public README does not duplicate detailed internal backlog content.

### 3.3 Documentation Drift Checks

Status: `Gate added` on 2026-05-15.

Goal: docs should not silently contradict the product state.

Work items:

- Completed: added `npm run test:docs`, which checks runtime version alignment,
  canonical planning links, doc role statements, physical-print deferral
  wording, and future-tracker status labels.
- Completed: added the docs drift gate to CI so future pushes catch broken
  planning links or unsupported tracker status values.
- Keep docs-only closure to `git diff --check` plus targeted `rg` checks unless
  generated docs are involved.
- When a behavior changes, update the closest owner doc instead of adding a new
  parallel roadmap.

Acceptance:

- Canonical links remain discoverable.
- Completed baseline work is not described as the next active queue.
- Deferred work is explicitly marked as deferred.

## 4. Brand Trust, Support Surfaces, And Non-Intrusive Conversion

Status: `Shipped` on 2026-05-15.

Why this matters: the tool can support brand visibility and future indirect
monetization, but it must never make printed safety labels feel promotional or
make users question whether hazard communication is being traded for ads.

### 4.1 Brand Trust Surface Rules

Status: `Shipped` on 2026-05-15.

Goal: brand presence should reinforce trust after the safety task has been
served.

Work items:

- Completed: expanded `BRANDED_UTILITY_STRATEGY.md` with a current product
  contract, surface matrix, regression expectations, and commercial-copy
  review gate.
- Keep printed labels, GHS pictograms, hazard statements, and SDS verification
  paths free of ads and unrelated promotion.
- Limit brand/support surfaces to footer, support band, help/education,
  correction paths, export metadata, or optional post-task prompts.
- Review copy tone so it feels like a useful lab utility, not a marketing page.

Acceptance:

- No safety-critical printed label content contains promotional text.
- Users can report data issues or workflow requests without feeling pushed into
  a sale.

### 4.2 Support And Feedback Funnel

Status: `Shipped` on 2026-05-15.

Goal: capture useful feedback while preserving the safety boundary.

Work items:

- Completed: documented the split between data corrections and workflow help in
  `BRANDED_UTILITY_STRATEGY.md`; existing ProductTrustPanel/Footer tests and
  production search UI QA cover the separated issue-template links.
- Keep data-correction requests separate from workflow/product requests.
- Consider adding structured prompts for correction evidence: CAS, SDS URL,
  supplier label, observed mismatch, local regulation context.
- Consider adding a low-noise "request workflow help" path for users who need
  batch labels, prepared-solution workflows, or lab template support.

Acceptance:

- Feedback channels create actionable maintenance tasks.
- Safety-data corrections cannot be confused with business/service leads.

### 4.3 Educational Or Help Content

Status: `Monitoring` on 2026-05-15.

Goal: explain the tool's limitations and output roles without cluttering the
main workflow.

Work items:

- Completed: documented that help/education must support the task and must not
  become modal popups, sales heroes, or explanatory clutter.
- Add concise help content only where it reduces user confusion.
- Explain complete primary labels, supplemental labels, quick-ID labels, QR
  supplements, and why SDS/local verification still matters.
- Avoid visible in-app text that explains obvious UI mechanics.

Acceptance:

- Users understand why small labels may be supplemental.
- Help content supports the task instead of competing with it.

### 4.4 Future Conversion Experiments

Status: `Shipped` on 2026-05-15.

Goal: leave room for ethical indirect monetization without compromising the
free utility.

Work items:

- Completed: added a commercial-copy review gate that blocks conversion copy
  from GHS icons, signal words, H/P statements, SDS authority copy,
  blocked-output warnings, and printed label bodies.
- Define allowed surfaces for future brand or service prompts.
- Define disallowed surfaces: printed labels, GHS icons, hazard statements,
  warning panels, blocked-output recovery, and SDS authority copy.
- Treat any commercial copy change as a UX/trust change requiring production
  review.

Acceptance:

- Conversion experiments can be evaluated without reopening the safety
  contract.
- The free tool remains genuinely useful without forced sign-up or promotional
  interruption.

## Recommended Execution Order

1. README cleanup and public documentation rewrite.
2. Data correction intake and source-conflict governance.
3. First-time search-to-decision UX polish.
4. Narrow/mobile read-first follow-up cases.
5. Brand/support funnel rules and copy review.
6. Fixed-stock batch label printing monitoring.
7. Optional documentation drift checks.

Use this order unless a production screenshot, code review finding, CI failure,
or user report points to a more urgent slice.

## Tracking Table

| Area | Current status | Next concrete step | Suggested gate |
| --- | --- | --- | --- |
| Data source conflicts | `Gate added` | No-GHS deployed state is covered with Urea; keep expanding text-only GHS and upstream-degraded examples | Backend/frontend focused tests + `qa:production-search-ui` |
| Correction intake | `Gate added` | Watch issue-template usage before adding admin review states | Issue templates + support-link tests |
| SDS/reference authority | `Gate added` | Keep role-first ordering aligned as links change | Existing reference-link tests + production search UI |
| Telemetry/privacy | `Gate added` | Retention/export-review policy is documented; next step is enforcing it if capture is ever enabled in production | Backend tests |
| First-time UX | `Gate added` | Keep reducing implementation wording while preserving the decision guide | Production search UI screenshots |
| Fixed-stock batch print | `Gate added` | Keep monitoring future batch examples; re-run production batch/product gates after changes | Batch planner tests + print PDF artifact + production batch QA |
| Print guidance copy | `Monitoring` | Keep no-GHS rows out of label selection; improve blocked/supplemental copy only when confusion persists | Production product QA |
| Narrow/mobile reading | `Gate added` | Add more cases when new narrow regressions appear | `qa:production-search-ui` |
| Accessibility | `Monitoring` | Extend focus tests for new complex dialogs | Unit tests + production search UI |
| README cleanup | `Shipped` | Keep README concise and aligned with canonical docs | `git diff --check`, rendered review |
| Maintainer doc split | `Shipped` | Keep `CLAUDE.md` as a pointer only | Docs-only checks |
| Documentation drift checks | `Gate added` | Keep `test:docs` aligned when canonical docs change | `npm run test:docs` |
| Brand/support rules | `Shipped` | Apply the commercial-copy review gate to any future conversion change | Docs + production UX review |
| Education/help content | `Monitoring` | Add only task-supporting help where confusion persists | i18n + production walkthrough |
