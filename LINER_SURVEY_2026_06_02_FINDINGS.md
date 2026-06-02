# LINER Survey Findings - 2026-06-02

Canonical planning entry point: `PROJECT_STATUS_AND_NEXT_PLAN.md`.
Related owner doc: `PERSONA_INTEGRATION_AND_SURVEY_RESEARCH_PLAN.md`.
Reusable external-review packet: `PERSONA_SURVEY_REVIEW_PACKET.md`.

## Evidence Source

- Source file inspected locally:
  `C:\Users\123\Downloads\ai_survey_dataset_2026-06-02T18-21-33.zip`
- Included files:
  - `ai_profiles_2026-06-02T18-21-33.csv`
  - `survey_responses_2026-06-02T18-21-33.csv`
- Respondents: 16 AI simulated respondents.
- Responses: 128 total responses, 16 respondents x 8 questions.
- Intended use: workflow critique and product-direction calibration.
- Not allowed use: chemical correctness, legal compliance, SDS authority, or
  final GHS classification validation.

## Respondent Coverage

Role distribution:

- Chemist: 5
- University student: 4
- Researcher: 4
- Lab technician: 2
- Graduate student: 1

Education distribution:

- PhD: 4
- BSc: 3
- MSc Chemistry: 3
- MSc: 2
- Technical/community college: 2
- MA: 1
- BA/BSc other: 1

This is enough to open a workflow-clarity slice, but it is not a substitute for
real pilot observation or physical print validation.

## Strong Signals

The survey was consistent across all 16 respondents on the following workflow
needs:

- Batch review must clearly separate ready rows, rows needing review, and
  unresolved lookup rows.
- Multi-GHS rows should explicitly tell users to confirm the primary
  classification before print/export handoff.
- Missing trusted Chinese names should be shown as a curation issue, not as an
  English-name fallback pretending to be Chinese.
- Export handoff should make status, filename/scope, and review columns easy to
  understand before download.
- Three public label outputs are acceptable when the UI keeps them simple and
  avoids advanced stock/template noise.
- Warning copy should be neutral, specific, and action-oriented so users are not
  pushed into unnecessary anxiety or ignored alerts.

## Quantified Findings

| Question area | Signal | Count |
| --- | --- | ---: |
| First thing reviewed | Results/review state | 16 / 16 |
| First thing reviewed | Multi-GHS concern | 7 / 16 |
| First thing reviewed | Missing data concern | 3 / 16 |
| Multi-GHS decision | Choose primary classification | 16 / 16 |
| Multi-GHS decision | Needs comparison/detail | 12 / 16 |
| Multi-GHS decision | Wants recommendation/cue | 3 / 16 |
| Print/export confidence | Color/status cue | 16 / 16 |
| Print/export confidence | Clear copy | 16 / 16 |
| Print/export confidence | Block/warning distinction | 16 / 16 |
| Missing Chinese names | Explicit missing-name state | 16 / 16 |
| Missing Chinese names | No fake fallback | 16 / 16 |
| Missing Chinese names | Correction path | 16 / 16 |
| Export handoff | Visible status | 16 / 16 |
| Export handoff | Filename/scope clarity | 16 / 16 |
| Export handoff | Sheet split mentioned | 8 / 16 |
| Export handoff | Summary counts | 11 / 16 |
| Export handoff | Review columns | 12 / 16 |
| Warning tone | Specific/neutral | 14 / 16 |
| Warning tone | Too severe creates anxiety | 16 / 16 |
| Self-service next step | Status guidance | 16 / 16 |
| Self-service next step | Multi-GHS guidance | 11 / 16 |
| Self-service next step | Self-service action clarity | 16 / 16 |
| Self-service next step | Visual cues | 8 / 16 |

## Research-To-Backlog Decision

Open one bounded slice:

**Batch Review Self-Service Clarity**

Source:

- LINER survey dataset plus prior user concern that repeated implementation can
  keep moving without a shared scope.

Affected user job:

- A lab user pastes 50-100 chemicals, then needs to understand what can be
  printed, what should be exported, what requires primary-GHS confirmation, and
  what should become a correction/admin item.

Expected proof:

- `frontend/src/__tests__/personaBatchPrint.integration.test.js` asserts the
  review surface separates ready, warning/review, and unresolved scopes.
- `frontend/src/__tests__/personaExportHandoff.integration.test.js` asserts
  export preview communicates scope and review handoff before download.
- `frontend/src/__tests__/personaAdminTriage.integration.test.js` keeps
  missing-name, source-conflict, unresolved-search, and correction queue
  behavior aligned for maintainers.
- `frontend/src/__tests__/personaTeachingSetup.integration.test.js` covers a
  teaching-unit prepared-solution path and verifies the print handoff stays
  task-first.
- `frontend/src/__tests__/personaSingleLookupTrust.integration.test.js` covers
  source confidence, missing trusted Chinese-name curation, multiple-GHS
  review, safe SDS/reference links, and authority boundaries for single lookup.
- `npm run test:docs`, targeted frontend tests, and build pass.
- Production verification is needed only when UI/runtime code changes are
  pushed.

Stop condition:

- Stop when the batch results screen gives a concrete next step for:
  ready output, multi-GHS confirmation, missing Chinese-name curation,
  unresolved lookup, no-GHS/text-only GHS, source conflict, and upstream retry.
- Do not expand this slice into new label sizes, new data-source integrations,
  legal validation, physical print validation, or broad admin redesign.

## Product Decisions Preserved

- The public label model remains exactly three outputs:
  Complete A4/Letter label, QR small label, and Identification small label.
- Small labels still do not carry H/P text.
- Complete labels still carry full H/P content and QR lookup links.
- External survey output cannot override SDS, supplier labels, local law,
  PubChem/ECHA/manual source boundaries, or admin review requirements.
- Missing Chinese names remain correction/admin evidence work, not automatic
  LLM translation in the public runtime.
