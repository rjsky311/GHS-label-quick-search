# Mobile PDF Export Via Server-Side Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for code changes. Use checkbox (`- [ ]`) syntax for task tracking. Work on branch `codex/mobile-pdf-export`; do not push to `main` directly.

**Goal:** Mobile users currently get clipped, mis-paginated label output because
mobile Safari's print engine ignores the print contract our fixed-mm A4 layout
depends on. Fix the root cause by adding a backend PDF-render endpoint that
renders the exact same print HTML with headless Chromium, and a frontend
"下載 PDF / Download PDF" handoff that uses it. Desktop `window.print()`
behavior stays byte-identical.

**Architecture:** Frontend keeps building the print document through the
existing `buildPrintDocument` path (`frontend/src/utils/printLabels.js:1454`).
For PDF export it inlines the nine same-origin GHS pictogram SVGs as data URLs,
POSTs the self-contained HTML to a new `POST /api/print/pdf` endpoint, and
downloads the returned PDF. The backend renders the HTML in a locked-down
headless Chromium (Playwright for Python) with JavaScript disabled and all
network requests blocked, honoring the document's own `@page` rules.

**Tech Stack:** FastAPI, Pydantic v2, slowapi, Playwright (Python) + Chromium,
pytest; frontend Vite + existing print pipeline + Jest.

---

## Evidence Source

Real mobile output from production (2026-07-07, iPhone Safari, single chemical
鹽酸 / Hydrochloric acid / CAS 7647-01-0, all three outputs saved as PDF):

1. Complete A4 label: content clipped on BOTH left and right edges
   ("Hydrochloric" → "-lydrochloric", CAS chip cut on the right).
2. QR small label: the single label sits mostly OFF the left page edge; only
   the QR code and part of the border are visible.
3. Identification small label: label body renders tiny but intact, and the
   footer disclaimer spills onto a nearly empty page 2. The complete label
   also pushes its org-profile + QR footer block onto its own page 2.
4. All three PDFs carry Safari's own URL/date/"網頁1/2" headers and footers,
   which iOS provides no way to disable.

Root cause (verified in code, not a layout bug):

- Print handoff builds a hidden iframe and calls
  `iframe.contentWindow.print()` (`frontend/src/utils/printLabels.js:1662`,
  `:1847`). The layout assumes the engine honors
  `@page { size; margin }` (`frontend/src/utils/printLabelStyles.js:44`).
  Desktop Chrome does; iOS Safari does not — it applies its own margins,
  injects headers/footers, and does not shrink-to-fit.
- `.page-grid` centers a fixed-mm track list
  (`repeat(cols, labelWidthMm)` + `justify-content: center`,
  `frontend/src/utils/printLabelStyles.js:67-76`). When the printable width
  shrinks below the track width, content overflows both edges (symptom 1),
  and a single label in the leftmost column of a 2–3 column stock grid falls
  off the left edge (symptom 2).
- `.page` uses `min-height` = 277mm portrait
  (`frontend/src/constants/labelStocks.js:27`) plus an absolutely positioned
  bottom footer. iOS's extra header/footer space makes one logical page
  taller than one printable page, pushing the footer to a stray page 2
  (symptom 3).

CSS-only mitigation cannot remove Safari's injected headers or the
device-dependent printable area, so the accepted fix is server-side rendering
where `@page` is fully honored.

## Current Contract To Preserve

- Exactly three public print outputs (complete A4/Letter, QR small,
  identification small); no new output kinds.
- Preview truth: the PDF must be rendered from the exact `documentBundle.html`
  the browser print path would use. The ONLY allowed transformation is
  replacing `<img src="/ghs/GHS0X.svg">` values with data URLs whose decoded
  bytes are identical to the checked-in `frontend/public/ghs/*.svg` assets.
  No layout, CSS, wording, or content-policy changes.
- Desktop print flow (`printLabels` → hidden iframe → `window.print()`)
  stays behaviorally unchanged.
- Existing preflight gates (required-image load, layout inspection,
  `collectPrintPreflightIssues`) must gate the PDF export exactly as they
  gate browser print: a blocked print must be an equally blocked export.
- Printed safety-critical content stays free of ads/promotional copy.
- Public API stays read-only with bounded rate limits; no persistence of
  submitted label HTML (privacy: label HTML can contain lab profile data).

## Scope

This slice may add:

- `POST /api/print/pdf` render endpoint + hardened Chromium runner module in
  `backend/`.
- Playwright + Chromium + CJK fonts in `backend/requirements.txt` and
  `backend/Dockerfile`.
- Frontend `exportLabelsPdf` path (reusing `buildPrintDocument`), pictogram
  data-URL inlining helper, blob download/share handoff, and a
  "下載 PDF / Download PDF" action that is the primary handoff on mobile and
  available as a secondary action on desktop.
- i18n strings (zh-TW + en) for the new action and its error states.
- Observability events `pdf_export_start` / `pdf_export_complete` /
  `pdf_export_blocked` mirroring the existing `print_*` events.
- Tests (backend pytest, frontend Jest) and QA-doc updates listed below.

This slice must not add:

- Any change to label layout CSS, print content policy, statement
  selection, pagination logic, or the desktop print path's output.
- Chromium fetching ANY network resource (no external URLs, no same-origin
  fetches; everything arrives inline in the POSTed HTML).
- Server-side storage, logging, or echoing of submitted HTML bodies (log
  sizes/timings/outcomes only).
- New public write/read endpoints beyond `POST /api/print/pdf`.
- Screenshot/raster fallbacks (html2canvas/jsPDF) — vector text and crisp QR
  are required.
- UI redesign work (a separate visual-language effort is queued).

## Endpoint Contract

`POST /api/print/pdf`

Request JSON:

```json
{
  "html": "<!DOCTYPE html>...self-contained print document...",
  "page": {
    "width_mm": 210,
    "height_mm": 297,
    "orientation": "portrait",
    "margin_mm": 10
  },
  "meta": {
    "label_purpose": "complete|qr|identification",
    "page_count_expected": 1
  }
}
```

- `page` values come from `documentBundle.model.layout.page` (already exposed;
  see `resolvePrintFrameViewport`, `frontend/src/utils/printLabels.js:1623`).
  They are used for validation and as the Chromium PDF fallback geometry;
  `prefer_css_page_size=True` keeps the document's `@page` authoritative.
- Response: `200` with `application/pdf` body and
  `Content-Disposition: attachment; filename="ghs-labels-<date>.pdf"`.
- Validation errors: `422` (Pydantic). Render failure/timeouts: `503` with a
  stable error code the frontend can map to a retry message.

Hardening requirements (all mandatory, each needs a test):

1. Max `html` size 3 MB; reject larger with 422.
2. Reject HTML containing `<script`, `javascript:`, or `on*=` event
   attributes (defense in depth; the print builder never emits them).
3. Chromium context: `java_script_enabled=False`, offline route interception
   aborting every request whose URL is not `data:` (the initial
   `set_content` document itself is exempt).
4. Per-request timeout (10 s render budget) and a process-wide concurrency
   semaphore (2 concurrent renders); excess requests get 503, not a queue.
5. `@limiter.limit("10/minute")` per client IP, matching existing slowapi
   conventions in `backend/server.py`.
6. Browser launched once in the FastAPI `lifespan` (see
   `backend/server.py:737`), one fresh context per request, always closed in
   `finally`. If Playwright/Chromium is unavailable at startup, the endpoint
   returns 503 with a clear code and the rest of the API is unaffected.

## Rendering Requirements

- `page.set_content(html, wait_until="load")` then `page.pdf(...)` with
  `print_background=True`, `prefer_css_page_size=True`, and fallback
  width/height/margins from the validated `page` block.
- Docker image must install Chromium via `playwright install --with-deps
  chromium` (or the `mcr.microsoft.com/playwright/python` base if the size
  trade-off is documented) AND `fonts-noto-cjk` so Traditional Chinese
  renders. A PDF whose Chinese glyphs render as tofu (□) is a failed slice.
- Keep the non-root `appuser` model working (Chromium needs its browser path
  readable by `appuser`; install browsers before the `USER appuser` switch or
  set `PLAYWRIGHT_BROWSERS_PATH` accordingly).

## Frontend Flow

1. New `exportLabelsPdf(...)` beside `printLabels(...)` in
   `frontend/src/utils/printLabels.js`, sharing `buildPrintDocument` and the
   same preflight gating (build the same hidden iframe to run
   `collectPrintPreflightIssues`; on preflight failure emit
   `pdf_export_blocked` and reuse the existing blocked-UX callbacks, then
   remove the iframe without printing).
2. Pictogram inlining helper: fetch each referenced `/ghs/GHS0X.svg` once
   (module-level cache), convert to `data:image/svg+xml;base64,` URLs, and
   substitute into the HTML string. QR images are already data URLs.
3. POST to `${BACKEND_URL}/api/print/pdf` (follow the existing backend-URL
   resolution used by search calls). On success, trigger a download via
   object URL + anchor click; if `navigator.share` with files is available
   (iOS), offer the share sheet path. On failure, surface the mapped i18n
   error and emit `pdf_export_blocked` with the error code.
4. Surface the action where `printLabels` is currently wired
   (`frontend/src/App.jsx:959` and the label-print modal components): mobile
   user agents get "下載 PDF" as the primary handoff button (browser print
   remains reachable), desktop keeps 列印 primary with 下載 PDF secondary.
   Mobile detection: coarse pointer / UA — pick one, document it, test it.

## Task Plan

### Task 1: Open the slice

**Files:** Modify `NEXT_PRODUCT_WORK.md`

- [ ] Add the slice entry: source (2026-07-07 mobile print evidence, this
      plan), affected user job (field/mobile user prints usable labels),
      expected proof (three 鹽酸 outputs re-exported clean via PDF endpoint),
      stop condition (endpoint + mobile handoff shipped and QA'd; no layout
      changes).

### Task 2: Backend render module (TDD)

**Files:** Create `backend/pdf_render.py`, `backend/test_pdf_render.py`;
modify `backend/requirements.txt`

- [ ] Request-model validation tests first: size cap, script/event-handler
      rejection, page-geometry bounds (50–500 mm), then implementation.
- [ ] Renderer wrapper with lifespan-managed browser, per-request context,
      JS disabled, route interception blocking non-`data:` requests, 10 s
      timeout, semaphore(2). Unit-test the policy pieces without Chromium;
      mark real-render tests `@pytest.mark.pdfrender` and skip cleanly when
      Chromium is absent.
- [ ] Real-render test (marked): valid A4 HTML in → bytes start `%PDF-`,
      page count 1, media box ≈ 210×297 mm.

### Task 3: Endpoint wiring (TDD)

**Files:** Modify `backend/server.py`; extend `backend/test_pdf_render.py`

- [ ] `POST /api/print/pdf` on the existing `api_router`, slowapi
      `10/minute`, 422/503 semantics, `application/pdf` response with
      attachment filename, no request-body logging.
- [ ] 503-when-unavailable test (monkeypatch renderer away) proving the rest
      of the API still serves.

### Task 4: Dockerfile + deploy config

**Files:** Modify `backend/Dockerfile`; verify `zeabur.yaml` needs no change

- [ ] Install Playwright Chromium + system deps + `fonts-noto-cjk`; keep
      non-root `appuser` working; document image-size delta in the commit
      message.
- [ ] Local proof: `docker build` succeeds and a container answers
      `/api/health` and renders a sample PDF with Chinese glyphs intact.

### Task 5: Frontend export path (TDD)

**Files:** Modify `frontend/src/utils/printLabels.js`,
`frontend/src/utils/printDocumentLayoutHelpers.js` (or a new
`printPdfExport.js`), i18n resource files; extend
`frontend/src/utils/__tests__/printLabels.test.js`

- [ ] Jest tests first: pictogram inlining (all nine codes, caching, byte
      fidelity), preflight-blocked export emits `pdf_export_blocked` and
      never POSTs, successful flow POSTs the inlined HTML with correct
      `page` payload and triggers download.
- [ ] Implement `exportLabelsPdf` sharing `buildPrintDocument` + preflight;
      observability events mirror `print_*` naming and payload shape.

### Task 6: UI handoff surface

**Files:** Modify `frontend/src/App.jsx`, label-print modal components under
`frontend/src/components/label-print/`

- [ ] Add the 下載 PDF action (mobile-primary / desktop-secondary), wire
      loading + error states, zh-TW and en strings.
- [ ] `npm run lint` and full Jest suite green; `npm run build` clean.

### Task 7: QA evidence + doc closure

**Files:** Modify `PRINT_BROWSER_QA_CHECKLIST.md`, this plan file,
`NEXT_PRODUCT_WORK.md`

- [ ] Add a mobile-browser row (iOS Safari + Android Chrome, PDF-export path)
      to `PRINT_BROWSER_QA_CHECKLIST.md`.
- [ ] Local end-to-end proof: export the same 鹽酸 (CAS 7647-01-0) three
      outputs through the new endpoint; verify no edge clipping, no stray
      near-empty trailing page, no browser headers/footers, crisp QR, CJK
      glyphs correct. Record results as checked boxes + notes in this file.
- [ ] Update the slice entry in `NEXT_PRODUCT_WORK.md` to shipped/monitoring
      with pointers to evidence.

## Definition Of Done

- All Task Plan checkboxes checked with tests green
  (backend `pytest`, frontend `npx jest`, lint, build).
- The three 鹽酸 outputs re-exported via the endpoint are visually correct
  per Task 7 and archived in the working notes.
- Desktop print path verified unchanged (existing print QA harness passes;
  no diffs in print HTML for the browser path).
- No submitted HTML persisted or logged server-side.

## Stop Conditions

Stop and report back (do not improvise) if:

- Honoring preview truth would require changing label layout CSS or print
  content policy — that contradicts this slice's contract.
- Playwright/Chromium cannot run in the Zeabur deployment constraints
  (image size or sandbox limits) — report the measured blocker instead of
  swapping in a raster fallback.
- The preflight-gating reuse would require restructuring `printLabels`
  beyond extraction of shared helpers.
- Any test in the existing print suites fails for reasons unrelated to your
  change.
