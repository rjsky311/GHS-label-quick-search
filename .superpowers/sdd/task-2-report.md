# Task 2 — agent summary and print semantic integrity

## Outcome

Task 2 closes the semantic-integrity gaps without changing the three-output
print contract or the public v1.10.0 version:

1. Agent H/P statements retain parser-approved `text_en` and `text_zh` fields
   while preserving the legacy `text` payload shape for older data.
2. Complete-label readiness evaluates each selected item independently and
   requires a pictogram or H/P statement; a signal word alone cannot make an
   item printable, and one valid batch item cannot mask another.
3. Custom GHS choices persist a normalized fingerprint over source,
   pictograms, signal word, and sorted H/P codes. Reordered reports are matched
   by that identity; a stale fingerprint never falls through to a stale index.
4. Responsible-organization, phone, and address values are bounded at both
   input and storage boundaries. Printable profile elements are included in
   rendered overflow inspection and are no longer silently ellipsized.
5. Statement-code findings identify both their label and statement positions.
6. Recent print records are explicit historical snapshots with retrieval,
   source, classification, and requery-policy provenance. Reuse performs a
   fresh batch lookup and fails closed if the current classification no longer
   matches; stored hazard wording is never loaded as current data.

## Test-first evidence

Before implementation, the newly added contracts produced the expected RED
result: `7` failures with `240` passes across the focused frontend suites.
The failures covered fingerprint persistence, profile input limits, historical
snapshot provenance/rehydration, profile overflow, and label/statement finding
indexes. The original Task 1 RED contracts separately covered the agent-summary
and output-planner behavior.

## Verification

All Task 2 and full frontend gates are green:

```text
cd frontend && npm test -- --runInBand
92 suites passed; 1334 tests passed

cd frontend && npm run test:print-contract
9 suites passed; 337 tests passed

cd frontend && npm run build
Vite production build passed; 238 modules transformed

cd frontend && npm run lint
passed

cd frontend && npm run test:i18n
passed; 1144 referenced keys and 1412 keys in each locale

cd backend && python -m pytest -q test_agent_label_summary.py
8 passed

cd backend && python -m py_compile agent_label_summary.py
passed

git diff --check
passed
```

The full backend suite still has the three intentional RED failures owned by
Tasks 3 and 4: two PDF postcondition cases and the review-queue limit/retention
contract. They are not Task 2 regressions.

## Review

The implementation was re-read against every Task 2 checkbox and the safety
boundaries in `AGENTS.md`. No unresolved Critical or Important finding remains.
In particular, historical jobs keep layout/profile preferences only after the
fresh chemical lookup succeeds; stored hazard content is not used to open the
print workflow. The untracked `backend/build/` parity artifact remains outside
this task.
