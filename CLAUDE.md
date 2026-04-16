# GHS Label Quick Search — Project Context

## Project Overview
- **Purpose**: Chemical GHS hazard label quick search system
- **Stack**: React 19 + Tailwind CSS + Radix UI (frontend) / FastAPI + Python 3.11 (backend)
- **Data Source**: PubChem REST API + local chemical dictionary (1,707 CAS entries)
- **Current Version**: v1.8.0
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
[React 19 + Tailwind + Radix UI]  (Zeabur static hosting)
   |  axios HTTP calls to ${REACT_APP_BACKEND_URL}/api
   v
[FastAPI (Python 3.11)]            (Zeabur Docker, port 8001)
   |  httpx async calls
   v
[PubChem REST API]                 (NIH public API)
   +
[chemical_dict.py]                 (1,707 CAS↔ZH, 1,707 CAS↔EN, 1,816 EN→ZH, reverse lookup dicts)
```

**State management**: All state in `App.js` via `useState`, 5 custom hooks extract localStorage-backed logic.
**Caching**: Server-side 24hr TTL in-memory (cachetools, max 5000). Client-side localStorage.

## Frontend Architecture (15 components + 8 hooks + 4 utils)

### Components (`src/components/`)
| File | Purpose |
|------|---------|
| `Header.jsx` | App header, favorites/history toggles, language switch |
| `SearchSection.jsx` | Single/batch search tabs with autocomplete |
| `SearchAutocomplete.jsx` | Autocomplete dropdown (history + favorites) |
| `ResultsTable.jsx` | Results table with sort, filter, export, SDS, print |
| `DetailModal.jsx` | Full chemical detail (GHS classification, SDS links) |
| `LabelPrintModal.jsx` | Label printing config (4 templates, 3 sizes, saved presets) |
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
| `useFocusTrap.js` | Modal/Sidebar focus trap + Tab wrap + focus restore on close (onClose held in ref so parent re-render doesn't rebuild the trap) |
| `use-toast.js` | shadcn toast hook |

### Utils (`src/utils/`)
| File | Purpose |
|------|---------|
| `exportData.js` | Excel/CSV export (backend-only; no client-side fallback after Phase 3) |
| `printLabels.js` | Label printing engine (4 templates, iframe with HTML escaping + afterprint cleanup + 60s fallback) |
| `sdsLinks.js` | PubChem Safety + ECHA CHEM search URL builders |
| `formatDate.js` | i18n-aware date formatting |

### i18n (`src/i18n/`)
- `index.js` — i18next init with LanguageDetector, fallback zh-TW
- `locales/zh-TW.json` — 210 keys (Traditional Chinese)
- `locales/en.json` — 210 keys (English)
- Language stored in localStorage key `ghs_language`

### Build
- CRACO 7.1.0 (wraps react-scripts 5.0.1)
- `@` alias → `src/`
- Tailwind CSS 3.4 + shadcn/ui (46 primitives)

## Backend Architecture (`backend/server.py`)

### API Endpoints (all under `/api`)
| Endpoint | Method | Rate limit (per IP) | Description |
|----------|--------|--------|-------------|
| `/api/health` | GET | — | Health check; unlimited so LB/uptime monitors don't trip |
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
- Zeabur stores its OWN Dockerfile for frontend, uses `npm install` (not yarn)
- Only copies `package.json`, NOT `.npmrc` or `yarn.lock`
- npm peer dep conflicts must be fixed at package level (downgrade packages)
- Current i18n packages: i18next 23.x, react-i18next 14.x, i18next-browser-languagedetector 7.x

### SearchAutocomplete Event Conflict
- `mousedown` document listener fires before button `click` event
- Solution: `requestAnimationFrame()` delay in outside-click handler
- Symptom: search button "doesn't work on first click"

### useFavorites Incomplete Fields
- Must save `found`, `other_classifications`, `has_multiple_classifications` to localStorage
- `DetailModal` needs null fallback for `getEffectiveClassification()` result
- Symptom: clicking "detail" from favorites sidebar crashes app

### i18n Package Versions
- react-i18next 16.x / i18next 25.x require typescript@^5 (peerOptional)
- react-scripts 5.0.1 wants typescript@^3||^4
- Downgraded to 14.x / 23.x / 7.x (identical API, no typescript peer dep)

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

## Current State (v1.8.0)

### Git History (key commits)
```
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

### Test Results (as of v1.8.0)
- **Frontend**: 448 tests across 29 suites; 0 React `act(...)` warnings
- **Backend**: 123 tests covering name resolution, reverse dicts, aliases, API endpoints,
  GHS dedup/ranking, export limits + formula injection, PubChem retry, upstream_error
  surfacing (including partial-transient), CORS config, rate limiter config
- **CI**: GitHub Actions runs both on every push to main and on PRs

### CI/CD (`.github/workflows/ci.yml`)
- **Frontend job**: `npm install` → `npx craco test --watchAll=false` → `npx craco build`
- **Backend job**: `pip install -r requirements.txt` → `py_compile server.py` → `pytest test_name_search.py -v`
- Triggers: push to main, pull requests

### Environment Variables
| Service | Variable | Local | Production |
|---------|----------|-------|------------|
| Backend | `CORS_ORIGINS` | `http://localhost:3000` | `https://ghs-frontend.zeabur.app` |
| Frontend | `REACT_APP_BACKEND_URL` | `http://localhost:8001` | `https://ghs-backend.zeabur.app` |

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

## v1.8 Roadmap

See **[V1_8_REAL_WORLD_ROADMAP.md](./V1_8_REAL_WORLD_ROADMAP.md)** for the full product-oriented roadmap based on real-world chemical community pain points. Key priorities: P-codes extraction, trust/provenance signals, prepared-solution mode, print workflow improvements. This is a shared planning document between Claude Code and Codex — editable, not frozen.

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
