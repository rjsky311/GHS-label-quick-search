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
- When the active work is about reaching the next major product maturity target,
  read the active owner doc after `PROJECT_STATUS_AND_NEXT_PLAN.md`. For the
  current major target, read `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`. Use
  `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`,
  `PILOT_OPERATIONS_READY_PLAN.md`, and `PILOT_RUNBOOK.md` as shipped evidence
  and pilot-operation context. `LAB_READY_PILOT_95_PLAN.md` is the shipped
  evidence packet for the previous 95% target, not the current unfinished
  milestone.
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
- Treat too-small physical stocks as QR small-label or Identification
  small-label outputs, or block them with a clear recovery path, instead of
  pretending they are complete A4/Letter labels.
- Push stable changes to `main` when tests pass, then track GitHub Actions,
  Zeabur deployment, and production QA for user-facing changes.
- Search current best practices proactively when the answer may have changed,
  when a comparable domain has a stronger pattern, or when the current product
  direction feels under-specified.
- Record important findings as docs, tests, or acceptance criteria so the
  learning becomes part of the project.
- Surface proactive observations at the end of meaningful work slices: name
  any newly noticed blind spot, workstream imbalance, repeated-fix pattern, or
  QA/user-purpose mismatch before choosing the next slice.

## Default Work Loop

Use this loop when continuing autonomously:

1. Check `git status`, read `PROJECT_STATUS_AND_NEXT_PLAN.md`, and then read
   the relevant project docs before editing. For current product-maturity work,
   include `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`, then use
   `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`,
   `PILOT_OPERATIONS_READY_PLAN.md`, and `PILOT_RUNBOOK.md` as shipped
   evidence/context; use `LAB_READY_PILOT_95_PLAN.md` as prior milestone
   evidence only.
2. Run the next-step decision loop below, then pick one coherent product slice
   with a clear user-facing acceptance goal.
   The current default order is batch review flow, batch label confidence,
   batch export, correction/admin triage, then one low-risk maintainability
   slice. Trust/source/SDS safety, low-noise UX, print renderer fit, and
   result-table polish should enter only when evidence shows they block that
   batch-first path.
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
11. Report what changed, what was verified, proactive observations from the
    slice, and what remains next.

For 95% Lab-Ready Pilot work, do not call the target complete only because the
latest slice passed. Match the current evidence against every workstream and
the final completion audit in `LAB_READY_PILOT_95_PLAN.md`.

For Pilot Operations Ready work, do not call the target complete until
`PILOT_OPERATIONS_READY_PLAN.md` has local checks, CI, deployment, production
QA, remaining risks, and next re-rank evidence recorded.

For Pilot Evidence And Maintainability Pass work, do not call the target
complete until `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` has representative
pilot evidence, admin/report triage conclusions, batch export usability
conclusions, data-quality next-step selection, maintainability boundaries,
historical-doc cleanup, and passing docs/affected tests recorded.

For Batch-First Lab Pilot v1 work, do not call the target complete until
`BATCH_FIRST_LAB_PILOT_V1_PLAN.md` has shipped evidence for representative
50-100 item batch lookup, review, selected print handoff, export, and
correction/admin routing, plus a completed low-risk maintainability slice or a
recorded reason to defer that slice.

## Next-Step Decision Loop

Use this loop before choosing a new slice, especially after the user says
"continue", "what next", or delegates the next round:

1. Check blockers first: failing CI, production 502/health failure, security or
   data-loss risk, safety-critical print regression, or user-provided
   screenshot/PDF evidence. Blockers override the default priority order.
   If GitHub Actions fails inside `actions/checkout` with an account,
   repository, or 403 access message, classify it as repository/CI access
   until proven otherwise; do not keep changing product code to chase that
   failure. If Zeabur creates a deployment but it never reaches a real
   `startedAt` time or has no build logs, classify it as a deploy-platform or
   GitHub-integration blocker before running heavier production QA.
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
- Automated QA is green, but screenshots, PDFs, production use, or user
  feedback still show that the intended user job is not actually solved.
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

## Proactive Insight Habit

Use this habit to avoid quiet drift during long autonomous work:

- After each meaningful implementation or planning slice, identify 1-3
  concrete observations that the user did not explicitly ask for but should
  know. Prefer evidence-based items such as a repeated failure class, a stale
  doc assumption, a QA gap, a workstream imbalance, or a mismatch between
  passing tests and actual user usefulness.
- Convert actionable observations into one of: a test, a QA checklist item, a
  scope-gate question, a backlog entry, or a short note in the relevant owner
  doc. Do not leave important observations only in chat.
- If the same symptom needs more than two fixes, stop treating it as a local
  bug until the underlying product model, renderer model, or acceptance
  standard has been reviewed.
- If no new observation is worth raising, say so briefly in the final report
  instead of inventing speculative risks.

## Print Workflow Quality Bar

For print workflow changes, the default validation stack is:

- `gh workflow run CI --ref main` followed by `gh run watch <run-id>
  --exit-status` when a pushed commit does not receive an automatic `CI` run.
  The workflow keeps normal `push`/`pull_request` triggers, but manual dispatch
  is the fallback when GitHub creates deployment checks without an Actions run.
- `npm run test:print-contract`
- `PRINT_QA_PRINT_HTML_DIR=build/print-qa-html npm run qa:print-report`
- `npm run qa:print-pdf`
- `npm run qa:production-health` after Zeabur deploy, before heavier
  production QA, to confirm frontend HTML, current Vite asset, and backend
  health are reachable and to capture Zeabur request IDs for 502 triage.
  Current Vite builds also emit `/build-info.json`; set
  `PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD)` locally, or rely
  on `PRINT_QA_EXPECTED_GIT_SHA=${{ github.sha }}` in GitHub Actions, when the
  gate must prove the deployed frontend matches the current commit.
  For frontend UI changes, set `PRINT_QA_EXPECTED_ASSET_TEXT` or
  `PRODUCTION_HEALTH_EXPECTED_ASSET_TEXT` to a short marker string from the new
  bundle when you need to prove production has refreshed instead of validating
  an older deployed asset.
- If the expected asset marker stays on the previous Vite bundle after CI
  passes, verify Zeabur's own deployment state instead of waiting blindly:
  `npm run qa:zeabur-deployment`. This writes
  `build/zeabur-deployment-report.json` and fails when the expected commit is
  missing, not `RUNNING`, stuck before build start (`startedAt` unset), or when
  production still runs an older commit. If the latest `main` commit is
  missing, trigger the existing frontend service with
  `npx zeabur service redeploy --id 69626873d9479ab33ad4590e --env-id
  696262d9a7aaff0c1152b3d6 --yes --json --interactive=false`, then wait for
  `npm run qa:zeabur-deployment` to report `ok: true` before rerunning
  production QA.
- `npm run qa:production-bundle` after Zeabur deploy
- `npm run qa:production-search-ui` after Zeabur deploy when search results,
  result actions, GHS result strips, or first-screen polish changed.
- `npm run qa:production-smoke` after Zeabur deploy for routine frontend or
  print-flow iterations; it covers complete primary, continuation,
  identification small-label, 62 mm QR small-label handoff, and the search-results
  UI readability check in production Chrome.
- `npm run qa:production-primary`, `npm run qa:production-compact`, and
  `npm run qa:production-multi-chemical` when the full production matrix is too
  slow for one pass. These run the same deployed Chrome handoff gate, but split
  it into complete-primary, compact-stock, and cross-chemical layers.
- `npm run qa:production-prepared` after prepared-solution workflow changes.
  This is a deployed Chrome clickthrough from search result to detail to
  prepare-solution form to label print modal to print handoff, plus prepared
  sidebar reprint to label print modal to print handoff, for A4 primary and
  compact prepared outputs. It also covers prepared
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
- Proactive observations: 1-3 risks, stale assumptions, or next-step insights
  noticed during the slice, or a brief note that no new untracked risk appeared.
- CI/deploy/production status when pushed.
- The next highest-value follow-up when it is not obvious.
- Whether a user decision is needed before that follow-up.
