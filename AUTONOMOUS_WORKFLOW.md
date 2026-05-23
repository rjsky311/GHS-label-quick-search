# Autonomous Workflow Agreement

This document captures the working agreement for continuing product work without
asking for repeated permission. It is meant to keep future implementation,
testing, deployment, and reporting aligned with the product goal instead of
drifting into surface-level fixes.

## Authorization

When the user asks to continue, proceed under these standing approvals unless a
stop condition below applies:

- Pick the next highest-value task from `PROJECT_STATUS_AND_NEXT_PLAN.md` first.
  Use `NEXT_PRODUCT_WORK.md` as the short live queue, then
  `NEXT_REMAINING_PRODUCT_WORK.md`, the print acceptance docs,
  `NEXT_PRINT_WORKSTREAMS.md`, recent production QA failures, or code review
  findings for the detailed work context. Prefer the canonical plan when there
  is no fresh regression because the original print workstreams are now the
  baseline.
- Treat the documented priority order as a default, not a permanent autopilot.
  After several completed slices or when recent commits cluster around one
  workstream, re-rank from the whole product view before continuing the same
  type of work.
- Use `PRODUCT_SCOPE_GATE.md` before broad or ambiguous product slices where
  the user goal, non-goals, required content, or acceptance criteria are not
  already clear. Do not use it to delay clear bug fixes, CI failures, or
  security/data-loss blockers.
- Simplify the UI when doing so reduces user hesitation, avoids unsafe choices,
  or makes the print workflow more task-first.
- Move rare controls into secondary or advanced areas when the default workflow
  can make a reliable decision.
- Treat too-small physical stocks as supplemental, quick-ID, or QR supplement
  outputs instead of pretending they are complete primary labels.
- Push stable changes to `main` when tests pass, then track GitHub Actions,
  Zeabur deployment, and production QA for user-facing changes.
- Search current best practices proactively when the answer may have changed,
  when a comparable domain has a stronger pattern, or when the current product
  direction feels under-specified.
- Record important findings as docs, tests, or acceptance criteria so the
  learning becomes part of the project.

## Default Work Loop

Use this loop when continuing autonomously:

1. Check `git status`, read `PROJECT_STATUS_AND_NEXT_PLAN.md`, and then read
   the relevant project docs before editing.
2. Run the next-step decision loop below, then pick one coherent product slice
   with a clear user-facing acceptance goal.
   The current default order is trust/source/SDS safety boundaries, low-noise
   whole-product UX, print renderer/stock fit only when a fresh screenshot or
   regression points there, result-table/GHS visual unity, prepared reprint
   maturity, then fixed-stock batch monitoring.
3. If the slice is broad, ambiguous, repeated-rework-prone, or changes product
   direction, run the project scope gate in `PRODUCT_SCOPE_GATE.md` before
   editing.
4. Break the slice into sub-problems when the path is not obvious.
5. Research current references when the decision depends on standards, browser
   behavior, accessibility, UI patterns, print/PDF behavior, or safety workflow
   best practices.
6. Implement the smallest complete change that genuinely improves the product.
7. Add or update tests at the same layer that would have caught the failure.
8. Run targeted tests first, then broader tests based on blast radius.
9. For production-facing frontend changes, build, push, wait for CI/deploy, and
   run production QA against `https://ghs-frontend.zeabur.app`.
10. Update the relevant docs when behavior, acceptance criteria, or workflow
   assumptions changed.
11. Report what changed, what was verified, and what remains next.

## Next-Step Decision Loop

Use this loop before choosing a new slice, especially after the user says
"continue", "what next", or delegates the next round:

1. Check blockers first: failing CI, production 502/health failure, security or
   data-loss risk, safety-critical print regression, or user-provided
   screenshot/PDF evidence. Blockers override the default priority order.
2. Review the last 10-20 commits when the recent direction is unclear or the
   last several slices have been in the same category. Classify the work as
   user-visible UX, print/rendering, data governance/admin, QA/CI, docs, or
   infrastructure.
3. If recent work is over-concentrated in one category, ask whether continuing
   that category still improves the main user job. If not, switch to the next
   highest-value category even if the previous category still has nice-to-have
   follow-ups.
4. Prefer slices that either close an already-started loop or improve a daily
   user path. Avoid opening a new admin/tooling branch when the next visible
   product bottleneck is search, batch, results-table clarity, or label
   confidence.
5. Choose the next slice by weighing: user-visible value, safety/data-risk
   reduction, whether it closes a loop, testability, and blast radius.
6. Update `NEXT_PRODUCT_WORK.md` when the active slice, exit condition, or
   likely switch point changes.

Re-rank explicitly when any of these triggers appear:

- 3-5 completed slices have landed since the last re-rank.
- 10-20 recent commits mostly touch one workstream.
- A repeated fix pattern suggests symptom-chasing rather than a model-level
  solution.
- A user asks whether the current order still makes sense.
- A production screenshot, PDF, CI failure, or support report changes the risk
  picture.

## Stop Conditions

Pause and ask the user only when one of these applies:

- A product direction tradeoff cannot be inferred from existing docs or recent
  user decisions.
- The change would remove user data, delete large areas of work, or require a
  destructive operation.
- A legal/compliance claim would be strengthened beyond the project's
  "reference tool, verify with SDS/local rules" boundary.
- External credentials, billing, Zeabur configuration, DNS, or non-repo secrets
  are required.
- A tool, quota, browser, CI, deploy, or network blocker prevents reliable
  verification.
- Two valid approaches conflict and the choice would materially affect the
  product's positioning, monetization, or safety posture.

Use `PRODUCT_SCOPE_GATE.md` instead of an open-ended discussion when the only
problem is unclear scope. The gate should produce a compact decision packet and
then resume implementation once the critical choice is settled.

## Research Rules

- Browse when information is current, standards-based, vendor-specific, or
  likely to have changed.
- Prefer primary sources such as official standards, browser documentation,
  framework docs, or product documentation.
- If using adjacent-domain inspiration, state the inference clearly in the doc
  or implementation note.
- Do not let research delay obvious bug fixes. Fix the known problem first when
  it has a clear acceptance standard.

## Print Workflow Quality Bar

For print workflow changes, the default validation stack is:

- `npm run test:print-contract`
- `PRINT_QA_PRINT_HTML_DIR=build/print-qa-html npm run qa:print-report`
- `npm run qa:print-pdf`
- `npm run qa:production-health` after Zeabur deploy, before heavier
  production QA, to confirm frontend HTML, current Vite asset, and backend
  health are reachable and to capture Zeabur request IDs for 502 triage.
- `npm run qa:production-bundle` after Zeabur deploy
- `npm run qa:production-search-ui` after Zeabur deploy when search results,
  result actions, GHS result strips, or first-screen polish changed.
- `npm run qa:production-smoke` after Zeabur deploy for routine frontend or
  print-flow iterations; it covers complete primary, continuation,
  case-number quick ID, 62 mm, QR supplement handoff, and the search-results
  UI readability check in production Chrome.
- `npm run qa:production-primary`, `npm run qa:production-compact`, and
  `npm run qa:production-multi-chemical` when the full production matrix is too
  slow for one pass. These run the same deployed Chrome handoff gate, but split
  it into complete-primary, compact-stock, and cross-chemical layers.
- `npm run qa:production-prepared` after prepared-solution workflow changes.
  This is a deployed Chrome clickthrough from search result to detail to
  prepare-solution form to label print modal to print handoff, plus prepared
  sidebar reprint to label print modal to print handoff, for A4 primary, bottle
  supplemental, and tube quick-ID prepared outputs. It also covers prepared
  preset creation/reuse and verifies that stale operational fields are cleared
  before a new prepared print job is submitted.
- `npm run qa:production-product` when closing or revalidating all product
  work blocks together. It runs the deployed print smoke gate, deployed prepared
  workflow gate, deployed fixed-stock batch gate, and product-level summary with
  required block mapping for:
  print renderer/stock fit, result pictograms, trust/SDS boundaries, prepared
  reprints, fixed-stock batch printing, and whole-product UX/support
  positioning. Allow a generous local command timeout of at least 12 minutes; a
  healthy run can take several minutes because it opens production Chrome flows
  and generates print reports.
- `npm run qa:production-print` after Zeabur deploy when the change affects
  preview, print handoff, stock presets, compact labels, renderer CSS, or when
  closing a larger print-workflow milestone. This is the full production matrix
  and can run longer than 15 minutes.
- The same production QA can be run from GitHub Actions via the
  `Production Print QA` workflow. Use `product` as the default closure mode for
  user-facing product work; use `smoke`, `primary`, `compact`,
  `multi-chemical`, `prepared`, `batch`, `full`, or `all` for focused reruns or
  deeper print-matrix checks. The workflow uploads JSON reports, screenshots, print
  HTML artifacts, generated PDFs, and `production-print-qa-summary.json` for
  review, and its job summary lists product-block status when available.
- Use `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` when a change affects real
  paper/stock behavior, label-printer scaling, QR scan reliability, or physical
  readability. Automated Browser/PDF gates are preconditions for that pass, not
  substitutes for it. After generating `build/print-qa-report.json`, run
  `npm run qa:physical-print-plan` to produce
  `build/physical-print-validation-plan.md` and `.json` as the real-printer
  work order.

Use narrower commands only for early iteration. A print change is not complete
until the production-facing path has been checked when deployment is part of the
work.

## General Quality Bar

Choose the verification level by blast radius:

- Frontend logic/UI: run from `frontend/`: `npm test -- --runInBand`,
  `npm run test:i18n` when copy or locale keys change, and `npm run build`.
- Backend/API: `python -m py_compile server.py` and
  `python -m pytest test_name_search.py -v`.
- Security or storage changes: add regression tests for malformed data,
  over-limit payloads, blocked schemes, or permission headers.
- Source, SDS/reference, QR-target, admin/manual dictionary, telemetry, or
  upstream-error changes: check `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` and
  add regression tests for unsafe URLs, role precedence, no-GHS/upstream-error
  separation, or bounded writes as appropriate.
- Docs-only changes: `git diff --check` is sufficient unless generated docs or
  links are part of the change.

## Reporting

Final updates should be concise and include:

- The user-facing outcome.
- Files changed when useful.
- Verification performed.
- CI/deploy/production status when pushed.
- The next highest-value follow-up when it is not obvious.
