# Persona Survey Review Packet

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical planning entry point.
This packet is the safe, reusable input for LINER survey simulation or another
external product-review tool. It turns outside feedback into bounded product
evidence without treating the external tool as a GHS correctness, legal, or QA
oracle.

## Purpose

Use this packet when feature-level QA is green but the team wants a role-based
challenge to workflow clarity:

- Can a lab graduate student finish a 50-100 item batch without guessing the
  next step?
- Can a lab manager understand what is ready, what needs review, and what can
  be exported?
- Can a teaching unit prepare repeatable lookup and label workflows without
  seeing too many controls?
- Can an admin/data curator quickly triage missing Chinese names, unresolved
  searches, correction requests, and manual entries?
- Can a general lookup user understand source trust and SDS/local-rule
  boundaries without feeling the tool is making legal promises?

## Safe Inputs

Allowed:

- Public product brief copied from README-level descriptions.
- Sanitized screenshots of the public app, with no real private inventory
  owner, student, customer, or supplier data.
- Synthetic CAS examples already used in automated tests.
- Public documentation excerpts from this repository.
- Mock task descriptions for the personas below.

Not allowed:

- Real private inventory rosters or unpublished SDS files.
- Admin keys, API tokens, database dumps, Zeabur/GitHub internals, deployment
  logs, or identifiable user/customer data.
- Any prompt wording that asks the external tool to verify chemical, legal,
  regulatory, or GHS correctness.
- Any prompt wording that asks the external tool to redesign the public label
  model beyond the three current outputs without first passing
  `PRODUCT_SCOPE_GATE.md`.

## Snapshot Checklist

Attach only screenshots that are needed for the role being reviewed. Prefer a
small set over a large dump.

1. Public lookup home or first results state.
2. Batch results summary showing ready, needs-review, unresolved, and
   multi-GHS review reasons.
3. Results table row with pictograms, source/trust context, and row actions.
4. Label print modal with the three outputs visible.
5. Complete A4/Letter label preview.
6. QR small label preview.
7. Identification small label preview.
8. Export preview or downloaded workbook summary screenshot.
9. Detail/source comparison or SDS/reference area.
10. Correction request entry point.
11. Admin triage dashboard or queue, only with sanitized data.
12. Narrow/mobile screenshot only when the question is about small screens.

## Survey Prompt Templates

Use one persona per run unless the tool explicitly supports cleanly separated
respondent groups.

### Lab Graduate Student

```text
You are a lab graduate student preparing labels for a 50-100 item chemical
batch. Review the attached screenshots as a workflow, not as a legal or GHS
correctness audit.

Task: identify whether you can tell which items are ready, which require
review, which label output to print, and what to do when a row has multiple GHS
classifications or missing trusted Chinese names.

Return only:
1. The step where you would hesitate.
2. Why the next action is unclear.
3. Severity: P0 blocks the task, P1 likely causes wrong action, P2 slows work,
   P3 polish.
4. The smallest product change that would reduce confusion.
```

### Lab Manager

```text
You are a lab manager reviewing whether a batch can be handed off to staff.
Review the batch summary and export surfaces. Do not judge chemical
correctness; judge whether the workflow makes ready/review/unresolved status
clear enough.

Return only:
1. What you would export or print first.
2. What rows you would not trust yet.
3. Whether the export file naming, sheets, and review columns are sufficient.
4. Any repeated confusion pattern with severity P0-P3.
```

### Teaching Unit

```text
You are preparing a teaching lab workflow for assistants who need a repeatable
lookup, review, print, and export process. Review the screenshots for clarity
and cognitive load.

Return only:
1. Which screen has too many choices for a first-time assistant.
2. Which copy or grouping best supports repeatable instruction.
3. What should be hidden, simplified, or moved behind an advanced path.
4. Any change that would make the workflow easier to teach.
```

### Admin / Data Curator

```text
You are responsible for triaging data-quality issues, not general support.
Review the correction/admin screenshots. Do not approve data and do not judge
chemical correctness.

Return only:
1. Which queue item should be handled first.
2. Whether missing Chinese names, unresolved searches, aliases, manual entries,
   and reference links are distinguishable.
3. What evidence is missing before a correction can safely affect public
   lookup.
4. Any admin workflow confusion with severity P0-P3.
```

### General Lookup User

```text
You are a casual user checking one chemical. Review the lookup/detail screens.
Do not judge chemical correctness; judge whether the app communicates source
trust and SDS/local-rule boundaries without creating too much anxiety.

Return only:
1. What information you trust immediately.
2. What you would verify against SDS or supplier labels.
3. Whether warning and source language is clear or too heavy.
4. Any wording change that would reduce confusion without hiding authority
   boundaries.
```

## Output Format To Request

Ask the external tool to return findings in this shape:

```text
persona:
workflow_step:
confusion:
severity: P0 | P1 | P2 | P3
evidence:
suggested_change:
affected_user_job:
proof_needed:
would_open_slice: yes | no
blocked_by_safety_boundary: yes | no
```

## Research-to-Backlog Decision Rule

External survey output can open a product slice only when all conditions are
met:

- The finding names a repeated confusion pattern tied to one user job.
- The proposed change fits the current product contract or explicitly goes
  through `PRODUCT_SCOPE_GATE.md`.
- The fix can define acceptance criteria and a proof path: automated test,
  production clickthrough, screenshot/PDF evidence, docs checkpoint, or future
  real-user check.
- The finding does not claim chemical, legal, regulatory, or GHS correctness.
- The finding does not weaken `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`,
  `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`, or `PRINT_LABEL_CONTRACT.md`.

If those conditions are not met, record the item as research context only. Do
not add it to `NEXT_PRODUCT_WORK.md`.

## Backlog Routing

- Label output or print-layout feedback routes through
  `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`, `PRINT_LABEL_CONTRACT.md`, and current
  print QA gates.
- Broad model, workflow, or navigation changes route through
  `PRODUCT_SCOPE_GATE.md`.
- Source trust, Chinese-name handling, correction intake, or manual dictionary
  feedback routes through `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.
- Export handoff feedback routes through `NEXT_PRODUCT_WORK.md` only when it
  has a concrete user job, acceptance criterion, and proof.
- Admin triage feedback routes through the admin/data-curation tests and should
  stay review-only until public-data approval boundaries are satisfied.

## Done Criteria

This packet is ready for use when:

- It is linked from `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  `PERSONA_INTEGRATION_AND_SURVEY_RESEARCH_PLAN.md`, `NEXT_PRODUCT_WORK.md`,
  `README.md`, and `AGENTS.md`.
- `npm run test:docs` passes.
- No external feedback is treated as a direct implementation command unless it
  passes the research-to-backlog decision rule above.
