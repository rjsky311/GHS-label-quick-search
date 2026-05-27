# Claude Session Entry Point

This file intentionally delegates to the canonical maintainer and agent docs.
It is not a second project roadmap.

Read these files in order before choosing or continuing work:

1. `AGENTS.md` - project architecture, runtime state, repository rules, and
   coding-agent bootstrap context.
2. `PROJECT_STATUS_AND_NEXT_PLAN.md` - canonical current status, shipped
   baselines, blind spots, and definition of done.
3. `POST_95_REPRIORITIZATION.md` - shipped post-95 target ranking and
   next-slice decision packet.
4. `PILOT_OPERATIONS_READY_PLAN.md` - shipped post-95 target owner doc and
   completion audit for small pilot operations.
5. `PILOT_RUNBOOK.md` - pilot operator checklist and finding-classification
   guide.
6. `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` - shipped short-term evidence
   doc for pilot evidence, export usability, data-quality next steps,
   maintainability boundaries, and historical-doc cleanup.
7. `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` - shipped/monitoring owner doc for batch
   review flow, batch label confidence, batch export, correction/admin triage,
   and bounded maintainability evidence.
8. `LAB_READY_PILOT_95_PLAN.md` - shipped 95% lab-ready pilot evidence packet,
   workstreams, non-goals, closure gates, and final audit checklist.
9. `AUTONOMOUS_WORKFLOW.md` - standing approval, stop conditions,
   verification, push/deploy, and production QA rules.
10. `NEXT_PRODUCT_WORK.md` - short evidence-triggered live queue; open a new
   slice only when source, affected user job, expected proof, and stop
   condition are clear.
11. `PRODUCT_SCOPE_GATE.md` - project-level "grill me" scope alignment for
   broad or ambiguous product decisions.
12. `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md` - future non-physical-print
   tracker while real-printer validation is deferred.
13. `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` - fixed-stock, purpose-first batch
   label printing contract when the selected work touches batch print flows.

Maintenance rule:

- Keep detailed architecture and current-state context in `AGENTS.md`.
- Keep current priority and completion criteria in
  `PROJECT_STATUS_AND_NEXT_PLAN.md`.
- Keep the shipped post-95 target ranking in `POST_95_REPRIORITIZATION.md`.
- Keep the shipped post-95 target definition in
  `PILOT_OPERATIONS_READY_PLAN.md`.
- Keep pilot operating instructions in `PILOT_RUNBOOK.md`.
- Keep the shipped short-term evidence and maintainability pass in
  `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`.
- Keep Batch-First shipped/monitoring evidence in
  `BATCH_FIRST_LAB_PILOT_V1_PLAN.md`.
- Keep the shipped 95% product-maturity evidence in `LAB_READY_PILOT_95_PLAN.md`.
- Keep continuation workflow rules in `AUTONOMOUS_WORKFLOW.md`.
- Keep the evidence-triggered live queue in `NEXT_PRODUCT_WORK.md`.
- Keep broad-scope decision alignment rules in `PRODUCT_SCOPE_GATE.md`.
- Do not duplicate those sections here. Update this file only when the
  canonical entry-point order changes.
