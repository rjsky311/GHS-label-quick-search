# Task 4 — durable review-ingestion lifecycle

## Outcome

1. `PilotStore` now owns explicit queue limits for pending/needs-evidence
   aliases and open/candidate-found corrections: global and per-CAS rows,
   UTF-8 payload bytes, correction report counts, and a bounded retention age.
2. Every quota check and write runs under SQLite `BEGIN IMMEDIATE`. A test with
   two independent connections racing for the last available row proves only
   one insert commits; the loser receives a deterministic quota error.
3. Deduplicated correction rows retain `duplicate_count`, but every repeated
   report consumes the global/per-CAS report allowance. Deduplication therefore
   cannot turn into an unbounded intake bypass.
4. Automated cleanup defaults to 90 days and runs at service startup. Only
   truly unreviewed `pending` aliases and `open` corrections are purgeable;
   `needs_evidence`, `candidate_found`, approved, rejected, and ignored records
   remain auditable. Admin summary/purge endpoints expose counts and limits,
   never queue content.
5. Full queues return bounded `503` responses with stable code
   `review_queue_full` and `Retry-After: 3600`. Rejections and purge counts are
   observable through existing ops counters.
6. Auxiliary PubChem synonym capture fails closed into the review counter but
   cannot break an otherwise successful public lookup. Open correction
   candidates and unapproved aliases still cannot enter public name resolution.

## Test-first evidence

The original row/retention contract and the added per-CAS, byte, duplicate,
summary, API-error, and public-boundary contracts produced `4` intended
failures with one existing boundary test passing before implementation. The
missing constructor limits, retention methods, and typed capacity exception
were the failure causes.

## Verification

```text
cd backend && python -m pytest -q test_pilot_storage.py
23 passed

cd backend && python -m pytest -q test_dictionary_growth.py
15 passed

cd backend && python -m pytest -q test_name_search.py -k 'correction or alias or retention'
38 passed; 190 deselected

cd backend && python -m pytest -q
400 passed

cd backend && python -m py_compile pilot_store.py pilot_admin_routes.py server.py api_models.py
passed

git diff --check
passed
```

## Review

Spec compliance and task quality pass with no unresolved Critical or Important
finding. The review specifically corrected an initial overly broad purge rule:
active queue limits include reviewed-in-progress rows, but age-based deletion
does not remove them. The storage boundary—not the HTTP handler—remains the
authoritative enforcement point for API, script, and import callers.
