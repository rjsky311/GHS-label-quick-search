# Product Scope Gate

This project uses a lightweight "grill me" style scope gate before large or
ambiguous product work. The goal is to keep implementation aligned with the
real user job instead of drifting into surface fixes, hidden assumptions, or
repeated rework.

This is a project-level workflow, not a global Codex memory and not a
standalone installed skill. Keep project truth in committed docs and code.

## When To Use It

Use this scope gate before work that changes product direction, user workflow,
data trust, safety boundaries, print behavior, or multiple surfaces at once.

Typical triggers:

- A request is broad, such as "make this easier to use", "redesign this flow",
  "continue toward the product goal", or "what should we build next?"
- A previous fix has failed more than once, or screenshots show the issue is
  about the model of use rather than one CSS bug.
- Automated QA passes, but user screenshots, generated PDFs, or production use
  still show that the intended job is not solved.
- The last 10-20 commits are concentrated in one workstream and the user asks
  whether that direction is still the best whole-product move.
- A workstream keeps producing follow-up tasks, but the next visible product
  bottleneck may be somewhere else.
- The change touches label printing, batch printing, source ranking, Chinese
  name governance, SDS/reference links, QR targets, admin telemetry, or public
  trust copy.
- The acceptance standard depends on what users are trying to accomplish, not
  only whether a function or test passes.
- A comparable domain, standard, or best-practice pattern may materially
  improve the decision.

Do not use it for:

- Clear CI failures.
- Small code review fixes.
- Obvious regressions with a known acceptance standard.
- Docs-only cleanup that does not change product direction.
- Security, data-loss, or production blockers that must be fixed immediately.

## Pre-Question Research

Before asking the user anything, inspect the project context that can already
answer the question:

1. Read `PROJECT_STATUS_AND_NEXT_PLAN.md`.
2. Read the relevant domain document:
   - Print: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`,
     `PRINT_LABEL_CONTRACT.md`, `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
   - Data governance: `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.
   - Deferred future work:
     `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`.
   - Autonomous execution: `AUTONOMOUS_WORKFLOW.md`.
3. Inspect the affected code path or production evidence when available.
4. Browse current external references only when the decision depends on
   current standards, vendor behavior, browser/print behavior, accessibility,
   or domain best practice. Prefer primary sources. If using adjacent-domain
   patterns, state the inference.

Only ask questions that cannot be answered from the repo, code, tests, or
current evidence.

## Question Rules

Ask at most 2-3 questions in one round. Prefer bounded choices with a
recommended option, but do not force a fake choice when a short free-form answer
is better.

Good questions decide:

- The user job and target audience.
- What must never be omitted.
- What can be simplified, deferred, hidden, or removed.
- Whether the output is a complete primary artifact or a supplemental helper.
- Whether the batch rule is one shared stock/output or mixed recovery.
- The safety, trust, legal, or brand boundary.

Avoid asking:

- Questions the code or docs can answer.
- Implementation trivia that can be decided conservatively.
- Repeated confirmation after the user has already chosen a direction.
- Questions that only postpone an obvious fix.

## Decision Packet

After research and questions, produce a compact decision packet before
implementation when the scope is broad. The packet can live in the chat for a
small change, or in the relevant planning doc for durable product direction.

Include:

- **Goal**: the user-facing outcome.
- **Non-goals**: what this slice will not solve.
- **User flow**: the first-screen path and the expected action sequence.
- **Content contract**: what information must appear, may continue, may shrink,
  or may be omitted.
- **Affected surfaces**: UI, print/PDF, export, backend/API, admin, docs, QA.
- **Risks**: safety, data trust, UX confusion, privacy, cost, deployment, or
  physical-print gaps.
- **Acceptance criteria**: concrete checks that prove the goal is met.
- **Verification gates**: exact commands, Browser/production QA, screenshots,
  PDFs, or manual checklist.
- **Docs to update**: canonical and domain-specific documents that must stay in
  sync.
- **Implementation order**: a small sequence of complete, testable slices.

## Repeated-Workstream Check

Use this check when work has been moving for several rounds but the overall
product direction feels questionable.

Also use it when the same symptom has needed more than two fixes, or when a
passing QA gate repeatedly fails to match the user's lived experience.

1. Summarize the last 10-20 commits by category: user-visible UX,
   print/rendering, data governance/admin, QA/CI, docs, or infrastructure.
2. Name the user-visible value those commits created.
3. Name the risk they reduced.
4. Name the product surface that did not improve during that period.
5. Decide whether the next closeable slice should continue the same category
   or switch to a higher-value surface.
6. Name the proactive observation that triggered the check and decide where it
   should live next: tests, QA checklist, backlog, scope question, or owner doc.

Do not use this check to reopen every settled decision. Use it to prevent
local optimization: for example, repeatedly expanding admin tooling while the
daily batch/search workflow still feels rough, or repeatedly adjusting print
layout after the real issue is the output model.

## Default Project Decisions

Use these defaults unless the user or canonical docs say otherwise:

- The product is a free public GHS lookup and label-printing utility.
- Printed safety-critical label content must stay free of ads and unrelated
  promotion.
- Missing upstream data is not the same as "no hazards."
- Available GHS pictograms must not disappear, be summarized away, or be hidden
  behind QR.
- Complete labels and supplemental labels must be named honestly.
- The public label workflow stays at three outputs: complete A4/Letter label,
  QR small label, and identification small label.
- Batch label printing uses one selected output type and one physical stock for
  the batch; continuation should stay on the same output/stock.
- Chinese names must be trusted CJK names, not English placeholders.
- Memory is not a project source of truth. Keep decisions in repo docs, tests,
  and code.

## When To Proceed Without More Questions

Proceed directly when:

- The user has already chosen among the meaningful product tradeoffs.
- The remaining decisions are implementation details.
- The risk can be handled by a conservative default plus tests.
- The work is covered by existing docs and acceptance criteria.

When proceeding, update the relevant docs and tests so the next session can see
the decision without relying on chat history or memory.

## Example Applications

### Label Printing Rework

Use the scope gate if a screenshot shows repeated layout failures or the user
questions the entire print model. Confirm the output role, required content,
continuation rules, and physical stock assumptions before changing renderer
logic. Then update `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`, print tests, PDF QA, and
production print QA.

### Data Governance Work

Use the scope gate before changing source ranking, manual dictionary behavior,
QR targets, SDS links, or correction workflows. Confirm the trust boundary and
admin-review path. Then update `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` and
add regression tests for unsafe or ambiguous data states.

### Low-Noise UX Work

Use the scope gate when simplifying a workflow could hide controls or remove
choices. Confirm the primary user job, what can become advanced, and what must
stay visible on the first screen. Then update production search/UI QA if the
change affects deployed behavior.

## Completion Standard

A scope-gated slice is complete only when:

- The decision packet or updated doc records the product decision.
- The implementation matches the decision rather than only fixing a symptom.
- Acceptance criteria have corresponding tests, QA scripts, screenshots, PDFs,
  or manual checklist items.
- Canonical docs still point to the right source of truth.
- Proactive observations discovered during the slice have been either recorded
  in docs/tests/backlog or explicitly dismissed as non-actionable.
- For production-facing UI changes, deployed production QA has been run after
  the change is pushed and deployed.
