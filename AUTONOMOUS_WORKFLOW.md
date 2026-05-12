# Autonomous Workflow Agreement

This document captures the working agreement for continuing product work without
asking for repeated permission. It is meant to keep future implementation,
testing, deployment, and reporting aligned with the product goal instead of
drifting into surface-level fixes.

## Authorization

When the user asks to continue, proceed under these standing approvals unless a
stop condition below applies:

- Pick the next highest-value task from `NEXT_PRODUCT_WORK.md`, the print
  acceptance docs, recent production QA failures, or code review findings.
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

1. Check `git status` and read the relevant project docs before editing.
2. Pick one coherent product slice with a clear user-facing acceptance goal.
3. Break the slice into sub-problems when the path is not obvious.
4. Research current references when the decision depends on standards, browser
   behavior, accessibility, UI patterns, print/PDF behavior, or safety workflow
   best practices.
5. Implement the smallest complete change that genuinely improves the product.
6. Add or update tests at the same layer that would have caught the failure.
7. Run targeted tests first, then broader tests based on blast radius.
8. For production-facing frontend changes, build, push, wait for CI/deploy, and
   run production QA against `https://ghs-frontend.zeabur.app`.
9. Update the relevant docs when behavior, acceptance criteria, or workflow
   assumptions changed.
10. Report what changed, what was verified, and what remains next.

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
- `npm run qa:production-print` after Zeabur deploy when the change affects
  preview, print handoff, stock presets, compact labels, renderer CSS, or when
  closing a larger print-workflow milestone. This is the full production matrix
  and can run longer than 15 minutes.

Use narrower commands only for early iteration. A print change is not complete
until the production-facing path has been checked when deployment is part of the
work.

## General Quality Bar

Choose the verification level by blast radius:

- Frontend logic/UI: `npm test -- --runInBand`, `npm run test:i18n` when copy or
  locale keys change, and `npm run build`.
- Backend/API: `python -m py_compile server.py` and
  `python -m pytest test_name_search.py -v`.
- Security or storage changes: add regression tests for malformed data,
  over-limit payloads, blocked schemes, or permission headers.
- Docs-only changes: `git diff --check` is sufficient unless generated docs or
  links are part of the change.

## Reporting

Final updates should be concise and include:

- The user-facing outcome.
- Files changed when useful.
- Verification performed.
- CI/deploy/production status when pushed.
- The next highest-value follow-up when it is not obvious.
