# GHS Label Quick Search — Project Context

## Project Overview
- **Purpose**: Chemical GHS hazard label quick search system
- **Stack**: React 19 + Tailwind CSS + Radix UI (frontend) / FastAPI + Python 3.11 (backend)
- **Data Source**: PubChem REST API + local chemical dictionary (1,707 CAS entries)
- **Current Version**: v1.10.0
- **GitHub**: `rjsky311/GHS-label-quick-search` (private)
- **Deployment**: Zeabur auto-deploy on push to main
- **Frontend URL**: https://ghs-frontend.zeabur.app
- **Backend URL**: https://ghs-backend.zeabur.app

## Zeabur Infrastructure IDs
- Project ID: `696262d991818d5fd97058b3`
- Environment ID: `696262d9a7aaff0c1152b3d6`
- Frontend service ID: `69626873d9479ab33ad4590e`

## Architecture

```
User Browser
   |
   v
[React 19 + Tailwind + Radix UI + Vite]  (Zeabur static hosting)
   |  axios HTTP calls to ${VITE_BACKEND_URL}/api
   v
[FastAPI (Python 3.11)]            (Zeabur Docker, port 8001)
   |  httpx async calls
   v
[PubChem REST API]                 (NIH public API)
   +
[chemical_dict.py]                 (1,707 CAS↔ZH, 1,707 CAS↔EN, 1,816 EN→ZH, reverse lookup dicts)
```

**State management**: top-level state lives in `App.jsx` via `useState`; persistence, selection, sort, and modal-workflow behaviour are factored out into custom hooks (`src/hooks/`) and workflow helpers (`src/utils/`). Prefer adding new behaviour as a hook/util rather than widening `App.jsx` further.
**Caching**: Server-side 24hr TTL in-memory (cachetools, max 5000). Client-side localStorage.

## Frontend Architecture (20+ components + 15+ hooks + shared utils)

### Components (`src/components/`)
| File | Purpose |
|------|---------|
| `Header.jsx` | App header, favorites/history toggles, language switch |
| `SearchSection.jsx` | Single/batch search tabs with autocomplete |
| `SearchAutocomplete.jsx` | Autocomplete dropdown (history + favorites) |
| `ResultsTable.jsx` | Results table with sort, filter, export, SDS, print |
| `DetailModal.jsx` | Full chemical detail (GHS classification, SDS links) |
| `LabelPrintModal.jsx` | Label printing config (4 templates, 3 sizes, saved presets); renders prepared-solution rows with blue tint + "Prepared" badge + concentration/solvent meta |
| `PrepareSolutionModal.jsx` | Prepare-solution workflow form (concentration + solvent inputs, read-only parent summary, trust-boundary note); v1.9 M3 Tier 1 |
| `PreparedSidebar.jsx` | Recent prepared-solution reprint sidebar |
| `PilotDashboardSidebar.jsx` | Admin-gated pilot dashboard for observability, dictionary growth, aliases, manual entries, and reference links |
| `AdminAccessDialog.jsx` | Admin unlock dialog for pilot dashboard |
| `AuthoritativeSourceNote.jsx` | Persistent SDS/supplier/local-regulation authority note |
| `UpstreamErrorBanner.jsx` | PubChem transient-error warning banner |
| `FavoritesSidebar.jsx` | Favorites management sidebar |
| `HistorySidebar.jsx` | Search history sidebar |
| `EmptyState.jsx` | Landing page with quick-start buttons |
| `Footer.jsx` | Version display + disclaimer |
| `ErrorBoundary.jsx` | React error boundary |
| `SkeletonTable.jsx` | Loading skeleton |
| `ClassificationComparisonTable.jsx` | Shared GHS comparison table (same-chemical & cross-chemical modes) |
| `ComparisonModal.jsx` | Cross-chemical GHS classification comparison modal |
| `GHSImage.jsx` | GHS pictogram image display |

### Hooks (`src/hooks/`)
| File | Purpose |
|------|---------|
| `useSearchHistory.js` | Search history in localStorage (max 50) |
| `useFavorites.js` | Favorites in localStorage |
| `useCustomGHS.js` | Custom GHS classification overrides |
| `useLabelSelection.js` | Tracks selected chemicals for printing |
| `useResultSort.js` | Table sort state (4 columns) |
| `usePrintTemplates.js` | Save/load/delete print setting presets (max 10) |
| `usePrintWorkspace.js` | Local-first print templates, custom label fields, lab profile, and recent print wiring; optional workspace sync when explicitly enabled |
| `usePrintRecents.js` | Recent print storage and reload helpers |
| `useLabProfile.js` | Lab profile persistence |
| `useObservability.js` | Pilot observability event logging/report export |
| `usePilotDashboard.js` | Admin-gated pilot dashboard data loading and saves |
| `usePreparedRecents.js` | Prepared-solution recent workflow inputs (localStorage, schemaVersion:1, max 10, dedup+prepend); v1.9 M3 Tier 2 |
| `usePreparedPresets.js` | Prepared-solution saved recipe presets (localStorage, schemaVersion:1, max 10, recipe-only: parent+concentration+solvent); v1.9 M3 Tier 2 |
| `useFocusTrap.js` | Modal/Sidebar focus trap + Tab wrap + focus restore on close (onClose held in ref so parent re-render doesn't rebuild the trap) |
| `use-toast.js` | shadcn toast hook |

### Utils (`src/utils/`)
| File | Purpose |
|------|---------|
| `exportData.js` | Excel/CSV export (backend-only; no client-side fallback after Phase 3) |
| `printLabels.js` | Label printing engine (4 templates, iframe with HTML escaping + afterprint cleanup + 60s fallback); prepared-solution rendering branch keyed on `isPreparedSolution` |
| `preparedSolution.js` | Prepared-solution helpers: `buildPreparedSolutionItem` (Tier 1, optional operational fields from Tier 2 PR-1), `buildRecentRecord` + `preparedRecentKey` (Tier 2 PR-2A), `buildPresetRecord` + `preparedPresetKey` (Tier 2 PR-2B, recipe-only — drops operational fields), `formatPreparedDisplayName` (Tier 2 PR-3, app-only display) |
| `sdsLinks.js` | PubChem Safety + ECHA CHEM search URL builders |
| `formatDate.js` | i18n-aware date formatting |
| `printStorage.js` | Versioned print template/job/lab-profile normalization and recent print merge helpers |
| `workspaceDocuments.js` | Optional admin-gated workspace document helpers; public builds default to local-only no-op sync |
| `ghsAvailability.js` | Distinguishes unavailable GHS data from renderable GHS visuals |
| `ghsText.js` | Localized GHS name/signal/statement text helpers |

### i18n (`src/i18n/`)
- `index.js` — i18next init with LanguageDetector, fallback zh-TW
- `locales/zh-TW.json` — Traditional Chinese (grew across v1.8 M0–M2 and v1.9 M3 Tier 1; keep additions tagged to their milestone in PRs)
- `locales/en.json` — English (same growth pattern as zh-TW)
- Language stored in localStorage key `ghs_language`

### Build
- Vite 6 + `@vitejs/plugin-react`
- `@` alias → `src/` via `frontend/vite.config.js`
- Tailwind CSS 3.4 + shadcn/ui (46 primitives)
- Test runner: Jest 30 + jsdom. Run frontend tests with `npm test -- --runInBand`; run locale parity with `npm run test:i18n`.

## Backend Architecture (`backend/server.py`)

### API Endpoints (all under `/api`)
| Endpoint | Method | Rate limit (per IP) | Description |
|----------|--------|--------|-------------|
| `/api/health` | GET | — | Health check; unlimited so LB/uptime monitors don't trip |
| `/api/ops/report` | GET | admin-gated | Pilot observability/admin report |
| `/api/dictionary/report` | GET | admin-gated | Pilot dictionary growth report |
| `/api/dictionary/manual-entries` | GET/POST | admin-gated | Manual dictionary entries |
| `/api/dictionary/aliases` | GET/POST | admin-gated | Alias curation |
| `/api/dictionary/reference-links` | GET/POST | admin-gated | Reference/SDS link curation |
| `/api/dictionary/miss-query` | POST | — | Optional search miss telemetry; no-op unless `CAPTURE_DICTIONARY_MISSES=true` |
| `/api/workspace/{doc_type}` | GET/PUT | admin-gated | Optional shared workspace persistence for prepared/print/lab-profile docs; public frontend defaults to local-only |
| `/api/search-by-name/{query}` | GET | 60/min | Name search (EN/ZH substring + aliases, max 20) |
| `/api/search/{query}` | GET | 30/min | Single CAS or name search (auto-detect) |
| `/api/search` | POST | 10/min | Batch CAS search (Pydantic `max_length=100` → 422 on overflow) |
| `/api/export/xlsx` | POST | 10/min | Export to Excel (Pydantic `max_length=500`, formula-injection safe) |
| `/api/export/csv` | POST | 10/min | Export to CSV (same limits) |
| `/api/ghs-pictograms` | GET | — | GHS pictogram metadata (static) |

### Key Functions
- `normalize_cas()` — CAS format normalization (strips non-digits except hyphens)
- `resolve_name_to_cas()` — 4-tier name→CAS resolution (exact ZH → exact EN → word-boundary regex → prefix)
- `pubchem_get_json()` — Retry helper: exponential backoff with jitter, honours `Retry-After`, raises `PubChemError` on exhausted transient failures; gated by `_pubchem_semaphore` (outbound concurrency cap, default 8)
- `get_cid_from_cas()` — 4-method CID lookup (3 concurrent + 1 alt-CAS fallback); raises `PubChemError` when any attempt is transient AND no CID was found
- `get_compound_name()` — 3-method name lookup with local dictionary fallbacks (lenient: per-endpoint catches `PubChemError`)
- `get_ghs_classification()` — Strict: lets `PubChemError` propagate so `search_chemical` can surface `upstream_error=True` instead of an empty-hazards response
- `_classification_signature()` / `_report_rank_key()` — Richer GHS dedup (`pictograms + signal + H-codes + source`) and deterministic primary-selection ranking (`report_count → ECHA → hazard count → source order`)
- `extract_all_ghs_classifications()` — Parses ALL GHS reports from PubChem
- `search_chemical()` — Main orchestrator; catches `PubChemError` at both the CID and GHS phases
- `spreadsheet_safe()` — Prefixes cells starting with `=+-@\t\r` with `'` to neutralize CSV/XLSX formula injection
- `_client_ip()` — Reads leftmost `X-Forwarded-For` for rate-limit bucketing behind Zeabur's proxy (disable via `TRUST_FORWARDED_HEADERS=0`)

### Chemical Dictionaries (`backend/chemical_dict.py`)
- `CAS_TO_EN` — 1,707 CAS→English name entries
- `CAS_TO_ZH` — 1,707 CAS→Chinese name entries
- `CHEMICAL_NAMES_ZH_EXPANDED` — 1,816 English→Chinese expanded dictionary
- `EN_TO_CAS` — 1,702 English name (lowercase)→CAS reverse lookup (5 fewer due to duplicate names)
- `ZH_TO_CAS` — Chinese name→CAS reverse lookup

### Backend Tests (`backend/test_name_search.py`)
- 99 tests covering: name resolution, reverse dictionaries, aliases, API endpoints,
  GHS classification dedup/ranking, export formula injection + size limits,
  PubChem retry helper (429/5xx/timeout/Retry-After), `search_chemical` upstream_error
  scenarios (including partial-transient mixed with 404), CORS config, rate limiter config
- Run with: `python -m pytest test_name_search.py -v`
- Config: `pytest.ini` with `asyncio_mode = auto`

## Critical Lessons (from previous sessions)

### Zeabur Dockerfile Mismatch
- Older Zeabur setup used its own frontend Dockerfile and missed repo-local npm config.
- Current frontend deploy is Vite/npm based. `frontend/Dockerfile` uses Node 22; `zeabur.yaml` runs `npm ci && npm run build` and passes `VITE_BACKEND_URL`.
- Do not reintroduce yarn, CRA, CRACO, or `REACT_APP_*` config unless explicitly asked.
- Current i18n packages remain intentionally conservative: i18next 23.x, react-i18next 14.x, i18next-browser-languagedetector 7.x.

### SearchAutocomplete Event Conflict
- `mousedown` document listener fires before button `click` event
- Solution: `requestAnimationFrame()` delay in outside-click handler
- Symptom: search button "doesn't work on first click"

### useFavorites Incomplete Fields
- Must save `found`, `other_classifications`, `has_multiple_classifications` to localStorage
- `DetailModal` needs null fallback for `getEffectiveClassification()` result
- Symptom: clicking "detail" from favorites sidebar crashes app

### i18n Package Versions
- react-i18next 16.x / i18next 25.x previously created peer-dependency pressure during CRA/CRACO builds.
- Even after the Vite migration, keep i18next 23.x / react-i18next 14.x / language detector 7.x unless there is an explicit dependency-refresh task.

### PubChem Silent Degradation (Phase 1 fix)
- Prior `get_ghs_classification` returned `{}` on any exception → `search_chemical` emitted `found=True` with empty hazards. For a safety tool, that is indistinguishable from "no hazards" — the worst failure mode this app can have
- Fix: classify transient (429/5xx/timeout) vs definitive (404) in `pubchem_get_json`; surface via `upstream_error: true`; UI shows "PubChem 暫時無法回應" rather than "no data"
- Partial-transient note: if ANY CID-lookup method raised `PubChemError` and no method found a CID, `get_cid_from_cas` raises — we must not trust a not-found conclusion based on a partial outage

### GHS Dedup by Pictogram Only (Phase 1 fix)
- Old dedup key `frozenset(p['code'])` dropped reports with same icons but different H-codes / signal word
- New signature `(pic_set, signal_word, sorted(h_codes), source)`; primary selected by deterministic rank (report_count → ECHA → hazard count → source order)

### printLabels Was an XSS Vector (Phase 1 fix)
- `iframeDoc.write(...)` with template-string interpolation bypassed React's auto-escaping
- Custom fields from localStorage, CAS input, PubChem text all flowed in raw
- Fix: `escapeHtml()` applied to every interpolated text and attribute value

### CSV/XLSX Formula Injection (Phase 1 fix)
- Values starting with `=`, `+`, `-`, `@`, `\t`, `\r` execute as formulas in Excel/Sheets/Calc when the export is opened
- `spreadsheet_safe()` prefixes with `'`; applied to every cell in both export endpoints

### useFocusTrap onClose Identity (Phase 2 post-review fix)
- Initial implementation had `useEffect(…, [onClose])`
- App.js passes inline `onClose={() => setShowX(false)}`, so every parent re-render produced a new identity → effect tore down and rebuilt → focus bounced from user's current position back to the opener and then to the panel's first focusable
- Fix: hold latest `onClose` in `onCloseRef`; main effect has empty deps and only runs once per mount

## Current State (runtime v1.10.0)

Runtime/code version is `1.10.0`. `frontend/package.json`,
`frontend/src/constants/version.js`, `backend/server.py` `APP_VERSION`,
and the Footer test pin are aligned. Do not version-bump further without
an explicit ask.

v1.10 moved the frontend from `react-scripts + CRACO` to Vite/npm and
added print-workflow productization: label stock presets, QR labels, live
sheet/label preview, recent print reload, lab profile, template save/load,
and calibration controls. It also added admin-gated pilot persistence and
optional workspace documents. Public builds keep prepared/print/lab-profile
state local-only unless `VITE_ENABLE_WORKSPACE_SYNC=true` and an admin key are
provided. Dictionary miss capture is also opt-in via
`CAPTURE_DICTIONARY_MISSES=true`.

PR #23 (`6b67061`) landed the productized free-utility redesign and is
deployed on Zeabur. Production smoke after merge covered frontend asset
refresh, backend health/search, the trust panel, detail workflow, and label
print modal entry.

### Git History (key commits)
```
6b67061 Merge pull request #23 - Productize utility workflow
a9bdebd feat: productize utility workflow
51cdb11 Polish label print copy and hierarchy
31c8a18 Refine label preview hierarchy
55dbcd4 Harden admin tools and simplify label output
395273e Refine pilot search and prepared workflows
7807b84 Persist print recents in workspace backend
0b68579 Add pilot dashboard admin sidebar
1e11586 Add pilot dictionary growth and shared workspace persistence
7d10d07 Downgrade Vite to support Zeabur Node 18 builds
d67f6c5 Use Zeabur frontend Dockerfile with Node 22
065b00c Pin frontend Node runtime for CI and Zeabur
5f6f056 Migrate frontend to Vite and add observability report
1888964 Finish print preset workflow and preview wiring
7657a1a Refactor print layout model and template hierarchy
42f77b8 Add prepared reprint sidebar and lab profile printing
348dceb Merge pull request #22 — v1.9 version sync
6c846c5 Merge pull request #21 — UX cleanup from pilot dogfood (toast + today default + recent no-stale-date)
e1f0a3b Merge pull request #20 — Tier 2 debt cleanup (dead helper + stacked aria-modal)
456e376 Merge pull request #19 — M3 Tier 2 PR-3 derived preview name + trust copy refresh (Option A app-only)
aa2f29b Merge pull request #17 — M3 Tier 2 PR-2B parent-scoped saved presets
f2a9a0f Merge pull request #16 — M3 Tier 2 PR-2A parent-scoped recent prepared workflow
a3b420e Merge pull request #15 — M3 Tier 2 PR-1 operational metadata on prepared items
70b35f6 Merge pull request #14 — M3 Tier 1 PR-A prepared-solution UI flow + lifecycle fixes
fe5e124 Merge pull request #13 — M3 Tier 1 PR-B prepared-solution print path
fdada04 Merge pull request #12 — v1.8 version sync (runtime/docs → 1.8.0)
6591a63 Merge pull request #11 — M2 PR-B Print all with GHS data
f24c650 Merge pull request #10 — M2 PR-A no-GHS warning + aged cache tooltip
b734520 Merge pull request #9  — M1 PR-C upstream banner + authoritative note
acef423 Merge pull request #8  — M1 PR-B provenance UI in DetailModal / ResultsTable
e2c90bd Merge pull request #7  — M1 PR-A provenance fields in backend
d2903c4 Merge pull request #6  — M0 PR-C P-codes in print + export
7323974 Merge pull request #5  — M0 PR-B P-codes UI rendering
0b7a754 Merge pull request #4  — M0 PR-A backend P-code extraction
84c948a Merge pull request #3  — Phase 3 cleanup (dead files, headers, audit)
8fd6185 Merge pull request #2  — Phase 2 (autocomplete race, afterprint, focus trap)
f7ed4c8 Merge pull request #1  — Phase 1 hardening (CORS, rate limits, retry)
94179e4 feat: add B&W / Color print mode toggle for GHS pictograms
daa462a feat: add classification comparison table (same-chemical + cross-chemical)
581c7c8 feat: add save print templates (localStorage, max 10 presets)
dc6f91c feat: add live name search autocomplete from backend API
df396b4 feat: add English/Chinese name search + update ECHA SDS URL
5414eb2 v1.6.0: i18n dual-language + table sort & filter + SDS links
25c719f v1.4.0: Architecture refactoring — split monolithic App.js into 15 modules
```

### Test Results (latest known v1.10 baseline)
- **Frontend**: 664 tests across 42 suites; 0 known React `act(...)` warnings
- **Frontend i18n parity**: `npm run test:i18n` checks referenced locale keys, zh-TW/en key symmetry, and accidental CJK text in English strings
- **Backend**: 126 tests covering name resolution, reverse dicts, aliases, API endpoints,
  GHS dedup/ranking, export limits + formula injection, PubChem retry, upstream_error
  surfacing (including partial-transient), CORS config, rate limiter config
- **Build**: `npm run build` → OK; Vite vendor chunks split via `manualChunks`
- **CI**: GitHub Actions runs both on every push to main and on PRs; workflow
  actions use v6 / Node 24-compatible runtimes

### CI/CD (`.github/workflows/ci.yml`)
- **Frontend job**: `npm ci` → `npm run test:i18n` → `npm test -- --runInBand` → `npm run build`
- **Backend job**: `pip install -r requirements.txt` → `py_compile server.py` → `pytest -v`
- Triggers: push to main, pull requests

### Environment Variables
| Service | Variable | Local | Production |
|---------|----------|-------|------------|
| Backend | `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | `https://ghs-frontend.zeabur.app` |
| Frontend | `VITE_BACKEND_URL` | `http://localhost:8001` | `https://ghs-backend.zeabur.app` |

## Completed Milestones

- [x] Frontend unit tests Phase 1 (88 tests, 12 suites)
- [x] Frontend unit tests Phase 2 (92 tests, 4 complex components) — Total: 180+
- [x] GitHub Actions CI/CD (frontend tests + build + backend tests)
- [x] English/Chinese name search (backend resolve + /search-by-name/ endpoint + 29 tests)
- [x] ECHA SDS link URL update → `chem.echa.europa.eu/substance-search`
- [x] Search shortcut: "/" key (Ctrl+K fallback) — same as GitHub/YouTube
- [x] Live name search autocomplete (debounced API + dedup + 8 tests)
- [x] Fix autocomplete dropdown overflow-hidden clipping
- [x] Chemical aliases / common names (~90 ZH + ~60 EN aliases, 30 new backend tests, alias badge UI)
- [x] Print popup blocker fix (hidden iframe replaces window.open, 20 new tests)
- [x] Custom label fields (lab name, date, batch number — localStorage, 4 templates, 6 new tests)
- [x] Bilingual labels (name display mode: both/en/zh with fallback, 5 new tests)
- [x] Print quantity per chemical (1-20 copies per label, +/- controls, expand before paging, 4 new tests)
- [x] Full-template font auto-sizing (4-tier system based on hazard count × label size, 11 new tests)
- [x] Save print templates (localStorage max 10 presets, usePrintTemplates hook, 12 new tests)
- [x] Classification comparison table — same-chemical (Part A) + cross-chemical (Part B), 30 new tests
- [x] B&W / Color print option — colorMode toggle in labelConfig, CSS grayscale filter, 3 new tests
- [x] **Phase 1 hardening** — printLabels HTML escaping; GHS dedup/ranking; export row-limit + formula neutralization; PubChem retry + upstream_error; CORS default + `allow_credentials=False`; slowapi rate limits + outbound PubChem semaphore
- [x] **Phase 2 hardening** — autocomplete abort + stale-response guard; iframe cleanup via `afterprint`; frontend batch>100 alert + double-guard; `useFocusTrap` hook + sidebar adoption; test coverage for LabelPrintModal / ErrorBoundary / sidebars
- [x] **Phase 3 cleanup** — version sync 1.7.0; removed dead files (`backend_test.py`, `tests/`, `字典.csv`, `test_result.md`); README + CLAUDE.md sync
- [x] **v1.8 M0** — P-codes (precautionary statements): backend extraction, UI rendering, print + export (PRs #4/#5/#6)
- [x] **v1.8 M1** — Data provenance + trust signals: backend provenance fields, DetailModal/ResultsTable surfaces, upstream banner + authoritative-source note (PRs #7/#8/#9)
- [x] **v1.8 M2** — No-GHS warning + aged-cache tooltip + "Print all with GHS data" shortcut (PRs #10/#11)
- [x] **v1.8 version sync** — runtime/docs aligned to `1.8.0` (PR #12)
- [x] **v1.9 M3 Tier 1** — Prepared-solution workflow (single-parent, concentration + solvent inputs, trust boundary preserved): PR-B print path (#13) + PR-A UI flow with Escape-parity + stale-quantity lifecycle fixes (#14; merge SHA `70b35f6`)
- [x] **v1.9 M3 Tier 2** — Operational Prepared Workflow (all frontend-only, localStorage-only, trust boundary preserved):
  - PR-1 (#15) — optional operational metadata on prepared items: `preparedBy` / `preparedDate` / `expiryDate`
  - PR-2A (#16) — parent-scoped recent prepared store (`usePreparedRecents`, schemaVersion:1, max 10, dedup+prepend) with form prefill
  - PR-2B (#17) — parent-scoped saved presets (`usePreparedPresets`, recipe-only: parent+concentration+solvent; preset click clears operational fields to prevent stale-date leak)
  - PR-3 (#19, merge SHA `456e376`) — `formatPreparedDisplayName` app-only display helper (Option A: not rendered on printed label) + `prepared.formNote` copy refresh
- [x] **v1.9 Tier 2 debt cleanup** (#20, merge SHA `e1f0a3b`) — removed dead `selectionHasPreparedItem` helper; closed stacked `aria-modal` a11y debt via `suppressed` prop on DetailModal (`inert` + `aria-hidden` + `aria-modal` drop + Escape / backdrop gates)
- [x] **v1.9 prepared-solution UX cleanup** (#21, merge SHA `6c846c5`) — pilot-dogfood-driven: Save-as-preset toast, `preparedDate` defaults to today (local TZ via `todayDateString`), Recent prefill no longer silently carries yesterday's date, Preset prefill same rule
- [x] **v1.9 version sync** — runtime/docs aligned to `1.9.0`
- [x] **v1.10 frontend/build migration** — Vite/npm migration, CI/Zeabur npm build alignment, frontend runtime `1.10.0`
- [x] **v1.10 print workflow productization** — label stock presets, QR template, live sheet/label preview, lab profile, recent print reload, template save/load, calibration controls
- [x] **v1.10 pilot/workspace persistence** — admin dashboard, admin-gated workspace documents, manual entries, aliases, reference links; public print/prepared/lab-profile state remains local-only by default
- [x] **Productized redesign planning** — see `DESIGN.md`, `BRANDED_UTILITY_STRATEGY.md`, and `REDESIGN_ROADMAP.md`

## v1.8 Roadmap

See **[V1_8_REAL_WORLD_ROADMAP.md](./V1_8_REAL_WORLD_ROADMAP.md)** for the historical product roadmap. M0–M3 and the v1.10 M4-style print-workflow expansion have now landed. The current next product decision is no longer "should we add real print workflow?" but "how do we make the full free tool feel productized, trustworthy, and pleasant enough for daily use?" The current design contract lives in **[DESIGN.md](./DESIGN.md)**, **[BRANDED_UTILITY_STRATEGY.md](./BRANDED_UTILITY_STRATEGY.md)**, and **[REDESIGN_ROADMAP.md](./REDESIGN_ROADMAP.md)**.

## Roadmap / Pending Work (Legacy — see v1.8 roadmap above)

### 🟢 Low Priority — Nice to Have
| # | Feature | Description | Difficulty |
|---|---------|-------------|------------|
| 1 | **Export preview** | Preview Excel/CSV data before downloading | Medium |
| 2 | **First-time user tutorial** | Interactive onboarding walkthrough for new users | Medium |
| 3 | **Zeabur Dockerfile sync** | Make Zeabur use repo's Dockerfile instead of stored one | Low |
| 4 | **PWA support** | Offline usage with service worker | High |
| 5 | **Dark/light theme toggle** | Theme switcher | Medium |
| 6 | **Performance monitoring** | Sentry / LogRocket integration | Medium |
| 7 | **Mobile-optimized label printing** | Responsive print layout for mobile | Medium |
| 8 | **Solvent-resistant label templates** | Special templates for waterproof/chemical-resistant labels | Low |
