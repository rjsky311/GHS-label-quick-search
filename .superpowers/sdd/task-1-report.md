# Task 1 — baseline and RED contract evidence

## Baseline

- Worktree: `/Users/yuchelin/Documents/Projects/GHS-label-quick-search-production-ready`
- Branch: `codex/production-ready-hardening`
- Base and `HEAD`: `39bf350d48b6a19086123a06a9d7b109690adf42`
  (`origin/main`)
- Existing untracked files were preserved (`backend/build/` and the plan
  document supplied by the parent task).
- No production source files were changed. This task adds contract tests only.

## RED contracts added

1. `printOutputPlanner.test.js` now requires a complete label to contain
   pictograms or H/P statements; a signal word alone is not hazard content.
   A complete-label batch also fails closed when any selected item lacks
   hazard data; one valid item may not mask another item.
2. `selectedGhsClassification.test.js` requires a stable
   `classificationFingerprint` (computed by the planned
   `getGhsClassificationFingerprint` helper) to win over a stale index when
   classification reports reorder.
3. `useLabProfile.test.js` requires exported `LAB_PROFILE_LIMITS` and
   truncation at the hook/storage boundary. The test intentionally uses the
   production-exported limits rather than unexplained literals.
4. `test_agent_label_summary.py` requires parser-native `text_en` and
   `text_zh` fields to survive in the agent H/P statement contract while
   retaining the existing `text` compatibility field.
5. `test_pdf_render.py` requires the renderer to reject output whose page
   count or MediaBox differs from the bounded request, with stable error code
   `pdf_render_invalid_output`.
6. `test_pilot_storage.py` requires constructor-configurable pending alias and
   open correction row limits, deterministic quota errors, and a
   `purge_stale_review_rows()` retention hook that reports deleted row counts.

## Targeted RED run

### Frontend

Command:

```text
cd frontend && npm test -- --runInBand src/utils/__tests__/printOutputPlanner.test.js src/utils/__tests__/selectedGhsClassification.test.js src/hooks/__tests__/useLabProfile.test.js
```

Result: expected RED, `3` suites failed, `4` tests failed, `19` tests
passed. Failures are the two hazard/batch tests, the missing fingerprint
helper, and the missing `LAB_PROFILE_LIMITS` export. Existing behavior and
all pre-existing assertions in those suites passed.

### Backend

Command:

```text
cd backend && python -m pytest -q test_agent_label_summary.py test_pdf_render.py test_pilot_storage.py
```

Result: expected RED, `4` failed, `50` passed. The failures are the new
bilingual statement mapping, two authoritative PDF mismatch cases, and the
new queue-limit constructor/retention contract. Existing tests passed.

### Diff hygiene

Command:

```text
git diff --check
```

Result: passed with no whitespace errors.

## Follow-up implementation notes

The later implementation tasks may choose equivalent internal names, but
must preserve the observable contracts above or update this report and the
tests together. In particular, queue quotas must be enforced at the durable
persistence boundary and retention must not delete reviewed/approved rows by
default. The PDF fixtures are deliberately minimal byte-level fixtures so
the validator cannot rely on browser internals or submitted HTML.
