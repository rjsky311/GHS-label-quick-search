# Claude Design Adoption Plan

Status: design handoff filtered; implementation not started.

Use this file after `CLAUDE_DESIGN_UI_REVIEW_PACKET.md` and before any code
change that claims to adopt Claude Design output. Claude Design is useful for
UI hierarchy, interaction patterns, visual density, and handoff language. It is
not a product authority, data authority, print-safety authority, SDS authority,
or regulatory authority.

## 1. Source Package

Downloaded package:

- `C:\Users\123\Downloads\GHS Quick Safety Workspace Design System.zip`

Temporary inspection copy:

- `C:\Users\123\AppData\Local\Temp\ghs-claude-design-system`

Committed preview screenshots:

- `docs/assets/claude-design-preview/01-search-results.png`
- `docs/assets/claude-design-preview/02-batch-review.png`
- `docs/assets/claude-design-preview/03-print-modal.png`
- `docs/assets/claude-design-preview/04-admin-triage.png`
- `docs/assets/claude-design-preview/05-mobile.png`

The package contains mock React components, CSS tokens, preview HTML, a
`HANDOFF.md`, and placeholder assets. Treat those as reference material, not as
drop-in product code. The downloaded zip and temporary extraction folder are
not committed; the screenshots and this plan are the repo-level record.

## 2. Product Decision

Do not fully apply the Claude Design package as-is.

Adopt the useful design grammar and interaction ideas, but keep the current
product contracts:

- The public print model still has exactly three outputs: Complete A4/Letter
  label, QR small label, and Identification small label.
- GHS pictograms, H/P statements, CAS values, QR targets, exports, and admin
  review states remain governed by this repo's data and print contracts.
- Missing data must remain visibly missing. Do not use mock values, placeholder
  names, or English text as fake Chinese names.
- Safety-critical label content must not gain decoration, sponsor copy, or
  promotional language.
- Production implementation must pass the existing test and QA gates before it
  is treated as adopted.

Current design preference from review: use the cleaner light workspace, plus
the subtle semantic left rails from the Operations Console direction. The rails
are helpful because they let users distinguish ready, review, blocked, and
data-quality groups without flooding the UI with colored panels.

## 3. Adopt

Adopt these ideas directly, with repo-native implementation:

- Soft pale-slate page canvas with white cards, tables, labels, and modal
  surfaces. This should reduce glare without requiring a full dark mode.
- One primary blue for primary actions, links, selected rows, focus rings, and
  explicit primary state.
- Red, amber, and green only for semantic status. Do not use semantic colors as
  decorative accents.
- Slim `3px` semantic left rails for grouped review sections, mobile result
  cards, and admin triage queue items.
- White group headers and white cards with status rail only. Avoid whole-card
  red/amber/green tinting.
- A shared state vocabulary for batch and admin work:
  `ready`, `confirm-ghs`, `source-conflict`, `missing-cn`,
  `correction-needed`, and `unresolved`.
- A central state map that pairs each state with user-facing label, severity,
  color token, blocking behavior, and next action.
- A `printGuard` style concept: UI should distinguish printable, flagged but
  printable, and blocked output before the user clicks print.
- Batch review grouped by next action, not by internal implementation detail.
- Mobile card scan order that preserves the desktop meaning: status, CAS, name,
  Chinese name, pictograms, source/trust cue, then action.

## 4. Adapt

Adapt these ideas instead of copying them:

- Typography: IBM Plex Sans and IBM Plex Mono are reasonable references, but do
  not vendor or load new fonts until a concrete typography slice is opened.
  Current system fonts may remain if they satisfy readability.
- Primary blue: use Claude's blue only after comparing it with the current
  contrast, brand tone, button states, and existing Tailwind tokens.
- Results table: keep current real columns, i18n labels, selection behavior,
  export preview, and print actions. Apply only clearer spacing, hierarchy,
  and status grouping where tests can prove no workflow regression.
- Batch review: the grouped review surface is promising, but it must map to
  real review reasons, export handoff fields, multi-GHS confirmation, missing
  Chinese-name handling, unresolved rows, and correction intake.
- Print modal: borrow the calmer hierarchy, but keep the existing print engine,
  rendered fit inspection, three-output contract, continuation behavior, and
  production print QA.
- Admin triage: the three-pane idea is useful, but adoption should be driven by
  real admin queue evidence. Do not redesign admin only because the mock looks
  cleaner.
- Mobile: use Claude's card density and sticky action concept as a guide, but
  verify with actual narrow-viewport browser checks and current i18n text.
- Pictograms: keep official, crisp GHS pictograms. If local vendoring is
  opened later, it must be a separate safety/asset slice.
- Logo and mark: current Claude assets are placeholders. Do not ship them as a
  final brand without a separate brand decision.

## 5. Reject

Do not adopt these parts:

- Mock chemical records, mock review counts, or mock queue data.
- Any simplified GHS, SDS, H/P, QR, export, or admin workflow logic from the
  prototype.
- External runtime GHS pictogram loading from the Claude package as a
  replacement for existing production pictogram handling.
- Dark command-center chrome as the default direction.
- Full colored panels, full colored borders, or heavy semantic washes as the
  main status language.
- New product states, new print outputs, or new admin queues unless a separate
  scope gate accepts them.
- Any UI copy that makes the tool sound like SDS/legal/regulatory authority.
- Any promotional or brand content inside printed labels, hazard blocks,
  pictograms, signal words, H/P text, QR label content, or SDS/reference areas.

## 6. Needs Discussion Before Code

These decisions are not yet locked:

- Whether the first implementation slice should target global tokens only or
  the batch review surface first.
- Whether to keep current fonts or open a typography slice with IBM Plex or
  another readable lab-utility font stack.
- Whether the grouped Batch Review view becomes a primary route, a secondary
  review panel, or only a clearer section inside current results.
- Whether admin triage should receive visual polish now or wait for fresh admin
  queue evidence.
- Whether local GHS pictogram vendoring is worth doing before further UI
  polish. It improves robustness, but it is a safety/asset slice, not a design
  polish shortcut.

## 7. Recommended Implementation Order

Use this order only when a concrete evidence-backed UI slice is opened. Do not
continue by Claude Design inertia.

1. Token and primitive audit
   - Compare current CSS/Tailwind tokens with the adopted color and rail rules.
   - Create or update shared primitives only when they reduce duplication.
   - Proof: focused unit tests if behavior changes, `npm run build`, and visual
     screenshots for the touched surface.

2. Semantic state map and rail primitive
   - Centralize state labels, colors, severity, blocking behavior, and next
     action text.
   - Add a rail primitive for review groups, mobile cards, and triage items.
   - Proof: tests for state mapping and i18n labels; screenshots showing rails
     without whole-card tint.

3. Batch review clarity slice
   - Improve ready/review/blocked/data-quality grouping.
   - Make multi-GHS confirmation, source conflict, missing Chinese name,
     unresolved rows, and correction-ready rows easier to act on.
   - Proof: production-like batch fixture, browser clickthrough, export
     preview check, and no regression in print eligibility.

4. Results table polish slice
   - Preserve scan order and current actions while reducing visual competition.
   - Proof: table tests, i18n tests, build, and screenshot comparison.

5. Print modal hierarchy slice
   - Apply calmer layout and clearer blocked/flagged/printable states.
   - Do not change print output rules unless a separate print evidence slice is
     opened.
   - Proof: `npm run test:print-contract`, `npm run qa:print-pdf`, browser
     preview checks, and production print QA if pushed.

6. Mobile polish slice
   - Bring the same scan order to narrow layouts with sticky actions.
   - Proof: mobile screenshots, clickthrough for select/print/export/review.

7. Admin triage polish slice
   - Apply rail/state grammar only after real admin queue evidence or a focused
     maintainer workflow request.
   - Proof: admin route tests or backend payload tests plus browser screenshot.

## 8. QA Gates

Docs-only adoption planning:

```powershell
git diff --check
npm run test:docs
```

Frontend UI implementation:

```powershell
npm test -- --runInBand
npm run test:i18n
npm run build
```

Print modal or print output implementation:

```powershell
npm run test:print-contract
npm run qa:print-pdf
```

Production-facing UI implementation after push:

```powershell
$env:PRODUCTION_HEALTH_EXPECTED_GIT_SHA=(git rev-parse HEAD)
npm run qa:production-health
npm run qa:production-product
```

## 9. Stop Conditions

Stop the design adoption slice when:

- This file exists and is referenced from the project planning entry points.
- Adopt / Adapt / Reject / Needs Discussion are clear enough for a future code
  slice.
- No product code has been changed only because a Claude prototype exists.

Open a new code slice only when the next change has:

- Source evidence.
- Affected user job.
- Expected proof.
- Stop condition.
