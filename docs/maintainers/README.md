# Maintainer Documents

Planning, status, QA, and design notes for people and coding agents who work on
this repository. Nothing here is needed to use the app. The user-facing entry
point is the [root README](../../README.md), and the two safety contracts stay at
the repository root:

- [PRINT_LABEL_CONTRACT.md](../../PRINT_LABEL_CONTRACT.md) - what a printed label
  must and must not contain.
- [DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md](../../DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md) -
  how chemical identity, GHS data, SDS links, and manual curation are treated.

Documents in this folder cite each other by bare file name. File names are
unique across this folder and `history/`, so a name always identifies one file.
`README.md`, `AGENTS.md`, `SECURITY.md`, and the two contracts above live at the
repository root.

## Start Here

- [PROJECT_STATUS_AND_NEXT_PLAN.md](./PROJECT_STATUS_AND_NEXT_PLAN.md) - the
  canonical planning entry point: current status, shipped baselines, release
  checkpoints, and definition of done.
- [NEXT_PRODUCT_WORK.md](./NEXT_PRODUCT_WORK.md) - the short live queue. A new
  slice opens only from concrete evidence.
- [AUTONOMOUS_WORKFLOW.md](./AUTONOMOUS_WORKFLOW.md) - how agent-driven work
  continues: standing approvals, stop conditions, verification, and release
  rules.
- [PRODUCT_SCOPE_GATE.md](./PRODUCT_SCOPE_GATE.md) - the scope-alignment step
  used before broad or ambiguous product changes.
- [PRODUCT_REQUIREMENTS_DECISIONS.md](./PRODUCT_REQUIREMENTS_DECISIONS.md) -
  pinned product decisions and completion standards.

## Product Contracts And Design

- [SIMPLIFIED_LABEL_OUTPUT_MODEL.md](./SIMPLIFIED_LABEL_OUTPUT_MODEL.md) - the
  three public label outputs and their rules.
- [PRINT_ACCEPTANCE_STANDARD.md](./PRINT_ACCEPTANCE_STANDARD.md) - the ship bar
  for printed output.
- [DESIGN.md](./DESIGN.md) and
  [EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md](./EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md) -
  visual direction and the adopted design language.

## Shipped Targets And Evidence

- [LAB_READY_PILOT_95_PLAN.md](./LAB_READY_PILOT_95_PLAN.md) - the 95% lab-ready
  pilot target and its closure audit.
- [POST_95_REPRIORITIZATION.md](./POST_95_REPRIORITIZATION.md) - how the next
  target was chosen after that milestone.
- [PILOT_OPERATIONS_READY_PLAN.md](./PILOT_OPERATIONS_READY_PLAN.md) and
  [PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md](./PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md) -
  the pilot-operations target and the evidence pass that followed it.
- [BATCH_FIRST_LAB_PILOT_V1_PLAN.md](./BATCH_FIRST_LAB_PILOT_V1_PLAN.md) - the
  batch-first workflow round (shipped, monitoring).

## Operations And QA Checklists

- [PILOT_RUNBOOK.md](./PILOT_RUNBOOK.md) - pilot operator checklist and
  finding-classification guide.
- [PRINT_BROWSER_QA_CHECKLIST.md](./PRINT_BROWSER_QA_CHECKLIST.md) - browser QA
  for print changes.
- [PHYSICAL_PRINT_VALIDATION_CHECKLIST.md](./PHYSICAL_PRINT_VALIDATION_CHECKLIST.md) -
  real-printer validation, deferred until paper, stock, and printer evidence
  exists.

## Plans, Backlog, And Reference

- [NEXT_REMAINING_PRODUCT_WORK.md](./NEXT_REMAINING_PRODUCT_WORK.md) - detailed
  execution backlog; not a priority selector.
- [FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md](./FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md) -
  tracker for non-physical-print work while real-printer validation is deferred.
- [LAB_WORKFLOW_READINESS_ROADMAP.md](./LAB_WORKFLOW_READINESS_ROADMAP.md) -
  next-phase direction for lab workflows.
- [BATCH_LABEL_PRINT_REFACTOR_PLAN.md](./BATCH_LABEL_PRINT_REFACTOR_PLAN.md) and
  [PRINT_OUTPUT_REFACTOR_PLAN.md](./PRINT_OUTPUT_REFACTOR_PLAN.md) - batch print
  and renderer implementation history and constraints.
- [CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md](./CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md) -
  review-only candidate discovery, kept separate from public data.
- [SCIENTIFIC_AGENT_SKILLS_EVALUATION.md](./SCIENTIFIC_AGENT_SKILLS_EVALUATION.md) -
  evaluation of an external agent-skill collection; reference only, not an
  installation decision.

## History

Superseded roadmaps and dated checkpoints, kept for context. They are not a work
queue.

- [history/PRODUCTION_UI_CHECKPOINT_2026_06_18.md](./history/PRODUCTION_UI_CHECKPOINT_2026_06_18.md)
- [history/POST_DEPLOY_QA_CHECKPOINT_2026_06_21.md](./history/POST_DEPLOY_QA_CHECKPOINT_2026_06_21.md)
- [history/V1_8_REAL_WORLD_ROADMAP.md](./history/V1_8_REAL_WORLD_ROADMAP.md)
- [history/REDESIGN_ROADMAP.md](./history/REDESIGN_ROADMAP.md)
- [history/NEXT_PRINT_WORKSTREAMS.md](./history/NEXT_PRINT_WORKSTREAMS.md)
- [history/PRINT_NINE_SEGMENT_COMPLETION.md](./history/PRINT_NINE_SEGMENT_COMPLETION.md)

## Related Folders

- `docs/superpowers/` - design specs and implementation plans for individual
  slices, written before the work was built.
- `docs/evidence/` - dated hardening and migration evidence.
- `qa/evidence/` - recorded QA reports, screenshots, and generated PDFs.
