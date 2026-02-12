# GHS Label Quick Search — Project Context

## Project Overview
- **Purpose**: Chemical GHS hazard label quick search system
- **Stack**: React 19 + Tailwind CSS + Radix UI (frontend) / FastAPI + Python 3.11 (backend)
- **Data Source**: PubChem REST API + local chemical dictionary (1,707 CAS entries)
- **Current Version**: v1.7.0
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

## Frontend Architecture (15 components + 7 hooks + 4 utils)

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
| `use-toast.js` | shadcn toast hook |

### Utils (`src/utils/`)
| File | Purpose |
|------|---------|
| `exportData.js` | Excel/CSV export (server-side primary, client-side fallback) |
| `printLabels.js` | Label printing engine (4 templates, HTML popup) |
| `sdsLinks.js` | PubChem Safety + ECHA CHEM search URL builders |
| `formatDate.js` | i18n-aware date formatting |

### i18n (`src/i18n/`)
- `index.js` — i18next init with LanguageDetector, fallback zh-TW
- `locales/zh-TW.json` — 207 keys (Traditional Chinese)
- `locales/en.json` — 207 keys (English)
- Language stored in localStorage key `ghs_language`

### Build
- CRACO 7.1.0 (wraps react-scripts 5.0.1)
- `@` alias → `src/`
- Tailwind CSS 3.4 + shadcn/ui (46 primitives)

## Backend Architecture (`backend/server.py`, ~870 lines)

### API Endpoints (all under `/api`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/search-by-name/{query}` | GET | Name search (EN/ZH substring match, max 20) |
| `/api/search/{cas_number}` | GET | Single CAS or name search (auto-detect) |
| `/api/search` | POST | Batch CAS search (max 100) |
| `/api/export/xlsx` | POST | Export to Excel |
| `/api/export/csv` | POST | Export to CSV |
| `/api/ghs-pictograms` | GET | GHS pictogram metadata |

### Key Functions
- `normalize_cas()` — CAS format normalization (strips non-digits except hyphens)
- `resolve_name_to_cas()` — 4-tier name→CAS resolution (exact ZH → exact EN → word-boundary regex → prefix)
- `get_cid_from_cas()` — 4-method CID lookup (3 concurrent + 1 fallback)
- `get_compound_name()` — 3-method name lookup with dictionary fallbacks
- `extract_all_ghs_classifications()` — Parses ALL GHS reports from PubChem
- `search_chemical()` — Main orchestrator

### Chemical Dictionaries (`backend/chemical_dict.py`)
- `CAS_TO_EN` — 1,707 CAS→English name entries
- `CAS_TO_ZH` — 1,707 CAS→Chinese name entries
- `CHEMICAL_NAMES_ZH_EXPANDED` — 1,816 English→Chinese expanded dictionary
- `EN_TO_CAS` — 1,702 English name (lowercase)→CAS reverse lookup (5 fewer due to duplicate names)
- `ZH_TO_CAS` — Chinese name→CAS reverse lookup

### Backend Tests (`backend/test_name_search.py`)
- 29 tests: `TestResolveNameToCas` (13) + `TestReverseDictionaries` (7) + async API endpoint tests (9)
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

## Current State (v1.7.0)

### Git History (key commits)
```
daa462a feat: add classification comparison table (same-chemical + cross-chemical)
b4ea2f7 docs: update CLAUDE.md for save print templates feature
581c7c8 feat: add save print templates (localStorage, max 10 presets)
f23258f fix: autocomplete dropdown clipped by overflow-hidden parent
dc6f91c feat: add live name search autocomplete from backend API
ebcf812 fix: change search focus shortcut from Ctrl+K to "/" key
ebdfa0e docs: update CLAUDE.md for v1.7.0 + add .claude/ to .gitignore
df396b4 feat: add English/Chinese name search + update ECHA SDS URL
0cf9826 test: add frontend unit tests Phase 2 (92 tests, 4 complex components)
e45ec01 ci: add GitHub Actions CI workflow
ef64801 test: add frontend unit tests Phase 1 (88 tests, 12 suites)
b4d2a82 docs: update README + add CLAUDE.md + sync versions to v1.6.0
5ce04d5 fix: search button first-click and favorites detail crash
5414eb2 v1.6.0: i18n dual-language + table sort & filter + SDS links
a5653e5 v1.5.0: Performance + UX optimization
25c719f v1.4.0: Architecture refactoring — split monolithic App.js into 15 modules
```

### Test Results
- **Frontend**: 279+ tests, 20 test suites (Phase 1: 88 + Phase 2: 92 + autocomplete: 8 + printLabels: 46 + usePrintTemplates: 12 + comparison: 30)
- **Backend**: 59 tests (name search + reverse dictionaries + aliases + API endpoints)
- **CI**: GitHub Actions runs both on every push to main

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

## Roadmap / Pending Work

### 🟡 Medium Priority — Enhanced Features
| # | Feature | Description | Difficulty |
|---|---------|-------------|------------|
| 1 | **B&W / Color print option** | Toggle color vs B&W GHS pictograms (saves ink) | Low |

### 🟢 Low Priority — Nice to Have
| # | Feature | Description | Difficulty |
|---|---------|-------------|------------|
| 2 | **Export preview** | Preview Excel/CSV data before downloading | Medium |
| 3 | **First-time user tutorial** | Interactive onboarding walkthrough for new users | Medium |
| 4 | **Zeabur Dockerfile sync** | Make Zeabur use repo's Dockerfile instead of stored one | Low |
| 5 | **PWA support** | Offline usage with service worker | High |
| 6 | **Dark/light theme toggle** | Theme switcher | Medium |
| 7 | **Performance monitoring** | Sentry / LogRocket integration | Medium |
| 8 | **Mobile-optimized label printing** | Responsive print layout for mobile | Medium |
| 9 | **Solvent-resistant label templates** | Special templates for waterproof/chemical-resistant labels | Low |
