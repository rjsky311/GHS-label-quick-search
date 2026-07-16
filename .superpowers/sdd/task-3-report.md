# Task 3 — public resource admission and PDF postconditions

## Outcome

1. A pure ASGI admission guard now applies a default raw-byte ceiling to every
   `/api` POST/PUT/PATCH route before FastAPI JSON decoding. Print, export, and
   workspace routes have explicit larger limits consistent with their bounded
   payload models. Both trusted `Content-Length` admission and actual streamed
   bytes are checked, so missing or spoofed lengths cannot bypass the ceiling.
2. Oversized bodies return deterministic `413` JSON with stable code
   `request_body_too_large`; request content is neither logged nor persisted.
3. Valid request bytes are replayed once, then the original ASGI receive channel
   remains available. A full-suite regression caught and repaired an earlier
   replay implementation that prematurely signaled disconnect and canceled
   CSV/XLSX streaming bodies.
4. Browser-generated PDFs have a 64 MiB output ceiling and are parsed with
   pinned `pypdf==6.14.2`. The renderer rejects malformed/encrypted documents,
   wrong page counts, and a MediaBox mismatch on any page with stable code
   `pdf_render_invalid_output` and only a bounded reason enum in logs.
5. Timeout, concurrency, network blocking, JavaScript-disabled rendering, and
   renderer-unavailable behavior remain unchanged.

## Test-first evidence

Before implementation:

- `test_request_body_limits.py` failed collection because the admission module
  did not exist.
- `test_pdf_render.py` had `5` intended failures (`24` passes): two authoritative
  page-contract cases, malformed/truncated output, a mismatch on a later page,
  and the configurable byte ceiling.

## Verification

```text
cd backend && python -m pytest -q test_request_body_limits.py test_pdf_render.py
34 passed

cd backend && python -m pytest -q -m pdfrender test_pdf_render.py
1 passed against real local Chromium; 28 deselected

cd backend && python -m pytest -q test_request_body_limits.py test_name_search.py -k 'export_csv or export_xlsx'
12 passed; 219 deselected

cd backend && python -m pytest -q
392 passed; only the single intentional Task 4 queue-limit/retention RED test remains

cd backend && python -m py_compile server.py api_models.py resource_limits.py pdf_render.py
passed

git diff --check
passed
```

## Review

Spec compliance and implementation quality pass with no unresolved Critical or
Important finding. The admission guard covers all 14 current mutating API route
patterns through a fail-safe default, while Pydantic and rate-limit controls
remain in place. The canonical Zeabur Dockerfile already installs
`backend/requirements.txt`, so the new parser is included in the production
image path without changing service topology.
