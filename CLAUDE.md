# GHS Label Quick Search — Project Context

## Project Overview
- **Purpose**: Chemical GHS hazard label quick search system
- **Stack**: React 19 + Tailwind CSS + Radix UI (frontend) / FastAPI + Python 3.11 (backend)
- **Data Source**: PubChem REST API + local chemical dictionary (1,707 CAS entries)
- **Current Version**: v1.6.0
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
[chemical_dict.py]                 (1,707 CAS→ZH, 1,707 CAS→EN, 1,816 EN→ZH)
```

**State management**: All state in `App.js` via `useState`, 5 custom hooks extract localStorage-backed logic.
**Caching**: Server-side 24hr TTL in-memory (cachetools, max 5000). Client-side localStorage.

## Frontend Architecture (13 components + 6 hooks + 4 utils)

### Components (`src/components/`)
| File | Purpose |
|------|---------|
| `Header.jsx` | App header, favorites/history toggles, language switch |
| `SearchSection.jsx` | Single/batch search tabs with autocomplete |
| `SearchAutocomplete.jsx` | Autocomplete dropdown (history + favorites) |
| `ResultsTable.jsx` | Results table with sort, filter, export, SDS, print |
| `DetailModal.jsx` | Full chemical detail (GHS classification, SDS links) |
| `LabelPrintModal.jsx` | Label printing config (4 templates, 3 sizes) |
| `FavoritesSidebar.jsx` | Favorites management sidebar |
| `HistorySidebar.jsx` | Search history sidebar |
| `EmptyState.jsx` | Landing page with quick-start buttons |
| `Footer.jsx` | Version display + disclaimer |
| `ErrorBoundary.jsx` | React error boundary |
| `SkeletonTable.jsx` | Loading skeleton |
| `GHSImage.jsx` | GHS pictogram image display |

### Hooks (`src/hooks/`)
| File | Purpose |
|------|---------|
| `useSearchHistory.js` | Search history in localStorage (max 50) |
| `useFavorites.js` | Favorites in localStorage |
| `useCustomGHS.js` | Custom GHS classification overrides |
| `useLabelSelection.js` | Tracks selected chemicals for printing |
| `useResultSort.js` | Table sort state (4 columns) |
| `use-toast.js` | shadcn toast hook |

### Utils (`src/utils/`)
| File | Purpose |
|------|---------|
| `exportData.js` | Excel/CSV export (server-side primary, client-side fallback) |
| `printLabels.js` | Label printing engine (4 templates, HTML popup) |
| `sdsLinks.js` | PubChem Safety + ECHA search URL builders |
| `formatDate.js` | i18n-aware date formatting |

### i18n (`src/i18n/`)
- `index.js` — i18next init with LanguageDetector, fallback zh-TW
- `locales/zh-TW.json` — 187 keys (Traditional Chinese)
- `locales/en.json` — 187 keys (English)
- Language stored in localStorage key `ghs_language`

### Build
- CRACO 7.1.0 (wraps react-scripts 5.0.1)
- `@` alias → `src/`
- Tailwind CSS 3.4 + shadcn/ui (46 primitives)

## Backend Architecture (`backend/server.py`, 834 lines)

### API Endpoints (all under `/api`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/search/{cas_number}` | GET | Single CAS search |
| `/api/search` | POST | Batch CAS search (max 100) |
| `/api/export/xlsx` | POST | Export to Excel |
| `/api/export/csv` | POST | Export to CSV |
| `/api/ghs-pictograms` | GET | GHS pictogram metadata |

### Key Functions
- `normalize_cas()` — CAS format normalization (strips non-digits except hyphens)
- `get_cid_from_cas()` — 4-method CID lookup (3 concurrent + 1 fallback)
- `get_compound_name()` — 3-method name lookup with dictionary fallbacks
- `extract_all_ghs_classifications()` — Parses ALL GHS reports from PubChem
- `search_chemical()` — Main orchestrator

**Note**: Backend only supports CAS number search. English/Chinese name search is NOT implemented (dictionaries exist but no reverse lookup endpoint).

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

## Current State (v1.6.0)

### Git History (key commits)
```
5ce04d5 fix: search button first-click and favorites detail crash
5e86481 fix: downgrade i18n packages to resolve npm peer dep conflict
c930572 fix: add .npmrc with legacy-peer-deps for Zeabur npm build
5414eb2 v1.6.0: i18n dual-language + table sort & filter + SDS links
a5653e5 v1.5.0: Performance + UX optimization
25c719f v1.4.0: Architecture refactoring — split monolithic App.js into 15 modules
394a1f4 v1.3.0: Remove Emergent branding, fix print layout, modernize UI
b5d4e42 v1.2.0: Security, performance, and architecture improvements
```

### Regression Test Results (v1.6.0)
- 49 passed / 6 failed / 5 skipped
- 3 real bugs fixed (first-click, empty-input, favorites crash)
- 2 by-design (English/Chinese name search = CAS-only backend)

### Environment Variables
| Service | Variable | Local | Production |
|---------|----------|-------|------------|
| Backend | `CORS_ORIGINS` | `http://localhost:3000` | `https://ghs-frontend.zeabur.app` |
| Frontend | `REACT_APP_BACKEND_URL` | `http://localhost:8001` | `https://ghs-backend.zeabur.app` |

## Roadmap / Pending Work

### High Priority
- [ ] Frontend unit tests (currently zero tests)
- [ ] GitHub Actions CI/CD (no .github/ folder)
- [ ] English/Chinese name search (backend has dictionaries, needs reverse lookup endpoint)

### Medium Priority
- [ ] ECHA SDS link URL update (current URLs may return 404)
- [ ] Zeabur Dockerfile sync (make Zeabur use repo's Dockerfile instead of stored one)
- [ ] Backend version evolution (match frontend feature growth)

### Low Priority / Nice to Have
- [ ] PWA support (offline usage)
- [ ] Performance monitoring (Sentry / LogRocket)
- [ ] Dark/light theme toggle
- [ ] Mobile-optimized label printing
