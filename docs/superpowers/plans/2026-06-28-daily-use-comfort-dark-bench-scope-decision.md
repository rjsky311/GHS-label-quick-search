# Daily-Use Comfort Dark Bench Activation V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded Dark Bench app-chrome mode for long-session use while keeping printed label previews white and label meaning unchanged.

**Architecture:** Existing CSS already defines `theme-comfort-dim`, `theme-dark-bench`, and white `--notebook-print-surface` tokens. Implement only a small persistent theme-mode selector, a header toggle, and QA coverage that can inspect both Comfort Dim and Dark Bench. Do not change print rendering, hazard data, label output models, backend APIs, admin data, exports, or agent-readable contracts in this slice.

**Tech Stack:** React 19, Tailwind CSS token classes, lucide-react icons, Jest, Vite, Playwright production/workbench QA.

---

## Decision Packet

Source: owner/user decision on 2026-06-28 approving both `Daily-use Comfort / Dark Bench` and `Batch Review And Export Handoff Clarity`, with ordering delegated to Codex.

Order:

1. `Daily-use Comfort / Dark Bench Activation v0`
2. `Batch Review And Export Handoff Clarity`

Rationale: Dark Bench has a valid roadmap promotion trigger now because the owner made an explicit theme decision. Batch/export remains higher core workflow value when real handoff evidence exists, but its roadmap trigger still needs a real batch list, export example, screenshot, workbook audit, production QA failure, or user report.

User-facing goal:

- A repeated daily user can switch the app chrome between Comfort Dim and Dark Bench.
- The choice persists locally for later sessions on the same browser.
- The app still communicates that label previews represent white physical labels.

Non-goals:

- No new public print output.
- No dark printed labels.
- No changes to `printLabels.js`, `printLabelStyles.js`, `printPreviewStyles.js`, print fit logic, QR targets, GHS parsing, H/P text, exports, backend APIs, admin queues, or agent-readable schema.
- No automatic OS-theme switching in v0.
- No broad restyling of every white modal or admin-only surface in v0 unless a touched control fails contrast or QA.
- No Batch/export handoff behavior change in this slice.

Content contract:

- Header may expose a compact theme toggle.
- The toggle may use short labels such as `Bench` / `Dim` plus title and aria text.
- Printed label previews, preview canvases, and generated print-preview iframe
  documents must stay white in both themes.
- Safety, SDS, supplier-label, local-regulation, and review-boundary copy must not be softened or hidden.

Affected surfaces:

- UI: app root theme class, header toggle, toast theme.
- Persistence: localStorage only.
- QA: workbench screenshot QA should support forcing `comfort-dim` or `dark-bench`.
- Tests: theme-mode helper, header toggle, CSS token safety, i18n.
- Docs: roadmap/live queue state.

Risks:

- Dark app chrome could make users think labels print dark if previews are not pinned white.
- Header controls may overflow on 390 px mobile if another button is added carelessly.
- Hard-coded white panels can look rough in Dark Bench; v0 should tolerate some secondary white surfaces but must not make primary workflow illegible.
- Persisted localStorage must fail open to Comfort Dim on invalid values.

Acceptance criteria:

- App starts in Comfort Dim when no saved preference exists.
- App uses Dark Bench after the user toggles it and persists that preference in localStorage.
- Header toggle is keyboard/click accessible with icon, short visible label, `title`, and `aria-label`.
- Header toggle exposes `aria-pressed` so assistive technology can identify
  whether Dark Bench is currently active.
- `theme-dark-bench` never changes `--notebook-print-surface` away from white.
- `.notebook-print-preview` uses `--notebook-print-surface`.
- Generated `buildPrintPreviewDocument()` label and sheet HTML keeps preview
  cards, sheet viewports, and printed label surfaces white and does not import
  Dark Bench app tokens into print/preview HTML.
- Workbench QA can run in Dark Bench and confirms no desktop/mobile horizontal overflow or missing selectors.
- Production-facing implementation still passes build and i18n tests.

Verification gates:

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/themeMode.test.js src/components/__tests__/Header.test.js src/__tests__/App.themeMode.test.js src/__tests__/themeTokens.test.js
npm test -- --runInBand src/utils/__tests__/printLabels.test.js --testNamePattern="keeps generated preview and printed label surfaces white"
npm run test:i18n
npm run test:qa-scripts
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
WORKBENCH_QA_THEME=dark-bench WORKBENCH_QA_URL=http://127.0.0.1:5173/ npm run qa:workbench
```

After deploy:

```bash
cd frontend
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run qa:production-health
WORKBENCH_QA_URL=https://ghs-frontend.zeabur.app/ WORKBENCH_QA_THEME=dark-bench npm run qa:workbench
```

Stop condition:

- Stop when a persisted app-chrome toggle works, the preview-white safety contract is tested, and Dark Bench workbench QA screenshots are generated.
- Do not continue into Batch/export, admin, print-renderer, or broad modal restyling in this slice.

## File Structure

- Create `frontend/src/utils/themeMode.js`: constants and helpers for supported theme modes, localStorage read/write, root class names, and next-mode selection.
- Create `frontend/src/utils/__tests__/themeMode.test.js`: helper tests for defaults, invalid storage fallback, persistence, and next-mode selection.
- Create `frontend/src/__tests__/themeTokens.test.js`: filesystem-backed CSS token test proving Dark Bench keeps `--notebook-print-surface: 0 0% 100%` and `.notebook-print-preview` uses that token.
- Create `frontend/src/__tests__/App.themeMode.test.js`: App-shell integration test proving root class, toggle persistence, invalid storage fallback, and Sonner theme wiring.
- Modify `frontend/src/utils/__tests__/printLabels.test.js`: add a print-preview white contract test against generated label/sheet preview HTML.
- Modify `frontend/src/App.jsx`: load theme mode with a lazy initializer, apply the root class dynamically, pass theme props to `Header`, and set `Toaster` to `dark` only in Dark Bench.
- Modify `frontend/src/components/Header.jsx`: add a compact theme toggle button using lucide `Moon` and `Sun` icons.
- Modify `frontend/src/components/__tests__/Header.test.js`: cover the new toggle without making mobile header labels disappear.
- Modify `frontend/src/i18n/locales/en.json` and `frontend/src/i18n/locales/zh-TW.json`: add concise theme labels and accessible titles.
- Modify `frontend/scripts/check-experiment-notebook-workbench.mjs`: support `WORKBENCH_QA_THEME=dark-bench` by seeding localStorage before page load and reporting the app root theme class.
- Create `frontend/scripts/__tests__/workbench-theme-gate.test.mjs`: fail fast
  when `WORKBENCH_QA_THEME` is misspelled or unsupported so Dark Bench QA cannot
  silently run Comfort Dim.
- Modify `frontend/package.json`: include the Workbench theme gate test in
  `npm run test:qa-scripts`.
- Modify `NEXT_PRODUCT_WORK.md`, `PROJECT_STATUS_AND_NEXT_PLAN.md`, and `LAB_WORKFLOW_READINESS_ROADMAP.md`: keep roadmap state and ordering in sync after implementation.

## Task 1: Theme Mode Helper

**Files:**
- Create: `frontend/src/utils/themeMode.js`
- Create: `frontend/src/utils/__tests__/themeMode.test.js`

- [ ] **Step 1: Create failing helper tests**

Add `frontend/src/utils/__tests__/themeMode.test.js`:

```js
import {
  THEME_MODE_STORAGE_KEY,
  THEME_MODES,
  getNextThemeMode,
  getThemeModeClassName,
  loadThemeMode,
  persistThemeMode,
} from "../themeMode";

describe("themeMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to comfort dim without a saved preference", () => {
    expect(loadThemeMode()).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("falls back to comfort dim for invalid saved values", () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "warm-light");
    expect(loadThemeMode()).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("persists only supported theme modes", () => {
    persistThemeMode(THEME_MODES.DARK_BENCH);
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.DARK_BENCH,
    );

    persistThemeMode("warm-light");
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.COMFORT_DIM,
    );
  });

  it("falls back to comfort dim when storage reads fail", () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };

    expect(loadThemeMode(blockedStorage)).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("does not throw when storage writes fail", () => {
    const blockedStorage = {
      setItem: () => {
        throw new Error("storage blocked");
      },
    };

    expect(
      persistThemeMode(THEME_MODES.DARK_BENCH, blockedStorage),
    ).toBe(THEME_MODES.DARK_BENCH);
  });

  it("maps modes to app root class names", () => {
    expect(getThemeModeClassName(THEME_MODES.COMFORT_DIM)).toBe(
      "theme-comfort-dim",
    );
    expect(getThemeModeClassName(THEME_MODES.DARK_BENCH)).toBe(
      "theme-dark-bench",
    );
    expect(getThemeModeClassName("warm-light")).toBe("theme-comfort-dim");
  });

  it("toggles between the two selected product themes", () => {
    expect(getNextThemeMode(THEME_MODES.COMFORT_DIM)).toBe(
      THEME_MODES.DARK_BENCH,
    );
    expect(getNextThemeMode(THEME_MODES.DARK_BENCH)).toBe(
      THEME_MODES.COMFORT_DIM,
    );
    expect(getNextThemeMode("warm-light")).toBe(THEME_MODES.DARK_BENCH);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/themeMode.test.js
```

Expected: fail because `frontend/src/utils/themeMode.js` does not exist.

- [ ] **Step 3: Add the helper**

Create `frontend/src/utils/themeMode.js`:

```js
export const THEME_MODES = Object.freeze({
  COMFORT_DIM: "comfort-dim",
  DARK_BENCH: "dark-bench",
});

export const THEME_MODE_STORAGE_KEY = "ghs-theme-mode";

const SUPPORTED_THEME_MODES = new Set(Object.values(THEME_MODES));

export function normalizeThemeMode(value) {
  return SUPPORTED_THEME_MODES.has(value) ? value : THEME_MODES.COMFORT_DIM;
}

function resolveThemeStorage(storage) {
  return storage === undefined ? globalThis.localStorage : storage;
}

export function loadThemeMode(storage) {
  try {
    return normalizeThemeMode(
      resolveThemeStorage(storage)?.getItem(THEME_MODE_STORAGE_KEY),
    );
  } catch {
    return THEME_MODES.COMFORT_DIM;
  }
}

export function persistThemeMode(mode, storage) {
  const normalized = normalizeThemeMode(mode);
  try {
    resolveThemeStorage(storage)?.setItem(THEME_MODE_STORAGE_KEY, normalized);
  } catch {
    // Storage failures should not block label lookup or printing.
  }
  return normalized;
}

export function getThemeModeClassName(mode) {
  return normalizeThemeMode(mode) === THEME_MODES.DARK_BENCH
    ? "theme-dark-bench"
    : "theme-comfort-dim";
}

export function getNextThemeMode(mode) {
  return normalizeThemeMode(mode) === THEME_MODES.DARK_BENCH
    ? THEME_MODES.COMFORT_DIM
    : THEME_MODES.DARK_BENCH;
}
```

- [ ] **Step 4: Run helper test**

Run:

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/themeMode.test.js
```

Expected: pass.

## Task 2: App Shell And Header Toggle

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Header.jsx`
- Modify: `frontend/src/components/__tests__/Header.test.js`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/zh-TW.json`

- [ ] **Step 1: Update Header tests first**

Add the theme props to `defaultProps` in `frontend/src/components/__tests__/Header.test.js`:

```js
themeMode: "comfort-dim",
onToggleThemeMode: jest.fn(),
```

Add `defaultProps.onToggleThemeMode.mockClear();` in `beforeEach`.

Extend the mobile stability test button list with:

```js
["theme-toggle-btn", "header.themeComfortShort"],
```

Add focused tests:

```js
it("renders an accessible theme toggle", () => {
  render(<Header {...defaultProps} />);

  const button = screen.getByTestId("theme-toggle-btn");
  expect(button).toHaveClass("notebook-control", "notebook-control-utility");
  expect(button).toHaveTextContent("header.themeComfortShort");
  expect(button).toHaveAttribute(
    "aria-label",
    "header.themeComfortShort. header.switchToDarkBench",
  );
  expect(button).toHaveAttribute(
    "title",
    "header.themeComfortShort. header.switchToDarkBench",
  );
  expect(button).toHaveAttribute("aria-pressed", "false");
  expect(button.querySelector("svg")).toHaveClass("shrink-0");

  fireEvent.click(button);
  expect(defaultProps.onToggleThemeMode).toHaveBeenCalledTimes(1);
});

it("names the return path from Dark Bench to Comfort Dim", () => {
  render(<Header {...defaultProps} themeMode="dark-bench" />);

  const button = screen.getByTestId("theme-toggle-btn");
  expect(button).toHaveTextContent("header.themeDarkShort");
  expect(button).toHaveAttribute(
    "aria-label",
    "header.themeDarkShort. header.switchToComfortDim",
  );
  expect(button).toHaveAttribute(
    "title",
    "header.themeDarkShort. header.switchToComfortDim",
  );
  expect(button).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 2: Run Header test to verify it fails**

Run:

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/Header.test.js
```

Expected: fail because `Header` does not render `theme-toggle-btn`.

- [ ] **Step 3: Add Header implementation**

In `frontend/src/components/Header.jsx`, update the icon import:

```js
import {
  Activity,
  AlertTriangle,
  Star,
  ClipboardList,
  Globe,
  FlaskConical,
  LockKeyhole,
  Moon,
  Sun,
} from "lucide-react";
```

Add props:

```js
themeMode = "comfort-dim",
onToggleThemeMode,
```

Add derived values after `preparedButtonTitle`:

```js
const isDarkBench = themeMode === "dark-bench";
const themeToggleVisibleLabel = isDarkBench
  ? t("header.themeDarkShort")
  : t("header.themeComfortShort");
const themeToggleActionLabel = isDarkBench
  ? t("header.switchToComfortDim")
  : t("header.switchToDarkBench");
const themeToggleTitle = `${themeToggleVisibleLabel}. ${themeToggleActionLabel}`;
const ThemeIcon = isDarkBench ? Sun : Moon;
```

Add the button after the language toggle:

```jsx
<Button
  onClick={onToggleThemeMode}
  variant="notebookUtility"
  size="notebookIcon"
  className={headerButtonBase}
  title={themeToggleTitle}
  aria-label={themeToggleTitle}
  aria-pressed={isDarkBench}
  data-testid="theme-toggle-btn"
>
  <ThemeIcon className="h-4 w-4 shrink-0" />
  <span className={headerButtonLabelClass}>
    {themeToggleVisibleLabel}
  </span>
</Button>
```

- [ ] **Step 4: Add i18n keys**

Add to `frontend/src/i18n/locales/en.json` near the other `header.*` keys:

```json
"header.themeComfortShort": "Dim",
"header.themeDarkShort": "Bench",
"header.switchToDarkBench": "Switch to Dark Bench",
"header.switchToComfortDim": "Switch to Comfort Dim",
```

Add to `frontend/src/i18n/locales/zh-TW.json`:

```json
"header.themeComfortShort": "柔光",
"header.themeDarkShort": "暗台",
"header.switchToDarkBench": "切換為暗台模式",
"header.switchToComfortDim": "切換為柔光模式",
```

- [ ] **Step 5: Wire App shell**

In `frontend/src/App.jsx`, import the helper:

```js
import {
  THEME_MODES,
  getNextThemeMode,
  getThemeModeClassName,
  loadThemeMode,
  persistThemeMode,
} from "@/utils/themeMode";
```

Add state near other top-level UI state:

```js
const [themeMode, setThemeMode] = useState(() => loadThemeMode());
```

Add a pure handler near other callbacks:

```js
const handleToggleThemeMode = useCallback(() => {
  setThemeMode((currentMode) => getNextThemeMode(currentMode));
}, []);
```

Persist the normalized mode in an effect after the state update:

```js
useEffect(() => {
  persistThemeMode(themeMode);
}, [themeMode]);
```

Before render return, derive:

```js
const appThemeClassName = getThemeModeClassName(themeMode);
const toastTheme = themeMode === THEME_MODES.DARK_BENCH ? "dark" : "light";
```

Change root and toaster:

```jsx
<div className={`${appThemeClassName} notebook-app min-h-screen`} data-testid="app-shell">
```

```jsx
<Toaster position="top-right" theme={toastTheme} richColors />
```

Pass props to `Header`:

```jsx
themeMode={themeMode}
onToggleThemeMode={handleToggleThemeMode}
```

- [ ] **Step 6: Add App shell integration tests**

Create `frontend/src/__tests__/App.themeMode.test.js`:

```js
import { fireEvent, render, screen } from "@testing-library/react";
import axios from "axios";
import App from "@/App";
import {
  THEME_MODE_STORAGE_KEY,
  THEME_MODES,
} from "@/utils/themeMode";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: ({ theme }) => (
    <div data-testid="sonner-toaster" data-theme={theme} />
  ),
}));

jest.mock("@/components/SearchSection", () => {
  return function MockSearchSection() {
    return <div data-testid="mock-search-section" />;
  };
});

describe("App theme mode shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: [] });
  });

  it("starts in Comfort Dim without a saved preference", () => {
    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-comfort-dim");
    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  it("falls back to Comfort Dim for an invalid saved preference", () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "warm-light");

    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-comfort-dim");
  });

  it("starts in Dark Bench from a saved preference", () => {
    window.localStorage.setItem(
      THEME_MODE_STORAGE_KEY,
      THEME_MODES.DARK_BENCH,
    );

    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-dark-bench");
    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute(
      "data-theme",
      "dark",
    );
  });

  it("toggles and persists Dark Bench from the header", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("theme-toggle-btn"));

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-dark-bench");
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.DARK_BENCH,
    );
  });
});
```

- [ ] **Step 7: Run focused Header, App, and theme helper tests**

Run:

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/themeMode.test.js src/components/__tests__/Header.test.js src/__tests__/App.themeMode.test.js
```

Expected: pass.

## Task 3: Print Preview White Safety Tests

**Files:**
- Create: `frontend/src/__tests__/themeTokens.test.js`
- Modify: `frontend/src/utils/__tests__/printLabels.test.js`

- [ ] **Step 1: Add CSS token safety test**

Create `frontend/src/__tests__/themeTokens.test.js`:

```js
import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve(__dirname, "../index.css");
const css = fs.readFileSync(cssPath, "utf8");

const extractRules = (selector) =>
  Array.from(css.matchAll(new RegExp(`${selector}\\s*{(?<body>[^}]+)}`, "gs")))
    .map((match) => match.groups?.body || "");

const parseDeclarations = (ruleBody) =>
  Object.fromEntries(
    ruleBody
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [property, ...valueParts] = line.split(":");
        return [property.trim(), valueParts.join(":").trim()];
      }),
  );

describe("theme tokens", () => {
  it("keeps Dark Bench print preview surfaces white", () => {
    const [darkBenchRule] = extractRules("\\.theme-dark-bench");
    const declarations = parseDeclarations(darkBenchRule);

    expect(declarations["--notebook-print-surface"]).toBe("0 0% 100%");
    expect(declarations["--notebook-print-ink"]).toBe("220 24% 12%");
  });

  it("uses the print-surface token for preview canvases", () => {
    const [printPreviewRule] = extractRules("\\.notebook-print-preview");
    const declarations = parseDeclarations(printPreviewRule);

    expect(declarations["background-color"]).toBe(
      "hsl(var(--notebook-print-surface))",
    );
    expect(declarations.color).toBe("hsl(var(--notebook-print-ink))");
  });

  it("does not add Dark Bench-specific preview background overrides", () => {
    expect(css).not.toMatch(/\.theme-dark-bench\s+\.notebook-print-preview/);
  });
});
```

- [ ] **Step 2: Run token test**

Run:

```bash
cd frontend
npm test -- --runInBand src/__tests__/themeTokens.test.js
```

Expected: pass because the current CSS already pins print preview tokens.

- [ ] **Step 3: Add generated preview document white contract test**

Add this test near the existing `buildPrintPreviewDocument reuses the shared renderer` test in
`frontend/src/utils/__tests__/printLabels.test.js`:

```js
it("keeps generated preview and printed label surfaces white", () => {
  const labelPreview = buildPrintPreviewDocument(
    [mockChemical],
    { size: "medium", template: "qrcode", orientation: "portrait" },
    {},
    {},
    { "64-17-5": 1 },
    {},
    { mode: "label" },
  );
  const sheetPreview = buildPrintPreviewDocument(
    [mockChemical, mockChemicalNoGHS],
    { size: "medium", template: "standard", orientation: "portrait" },
    {},
    {},
    { "64-17-5": 1, "7732-18-5": 1 },
    {},
    { mode: "sheet" },
  );

  [labelPreview.html, sheetPreview.html].forEach((html) => {
    expect(html).toContain("body.preview-body");
    expect(html).toContain("background: #ffffff;");
    expect(html).toContain("background: #fff;");
    expect(html).not.toContain("theme-dark-bench");
    expect(html).not.toContain("--notebook-app");
    expect(html).not.toContain("--notebook-surface");
  });
  expect(sheetPreview.html).toContain(".preview-sheet-viewport");
  expect(sheetPreview.html).toContain("background: #ffffff;");
});
```

- [ ] **Step 4: Run generated preview white contract test**

Run:

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/printLabels.test.js --testNamePattern="keeps generated preview and printed label surfaces white"
```

Expected: pass because current generated print/preview styles already keep preview cards, sheet viewports, and label bodies white.

## Task 4: Workbench QA Theme Forcing

**Files:**
- Modify: `frontend/scripts/check-experiment-notebook-workbench.mjs`

- [ ] **Step 1: Add theme env support**

After `const headless = env.WORKBENCH_QA_HEADLESS !== "0";`, add:

```js
const requestedTheme = env.WORKBENCH_QA_THEME?.trim() || "comfort-dim";
const allowedThemes = new Set(["comfort-dim", "dark-bench"]);
if (!allowedThemes.has(requestedTheme)) {
  console.error(
    `Unsupported WORKBENCH_QA_THEME "${requestedTheme}". Expected one of: comfort-dim, dark-bench.`,
  );
  process.exit(1);
}
const qaTheme = requestedTheme;
const themeStorageKey = "ghs-theme-mode";
```

In `inspectViewport`, after creating the context and before `const page = await context.newPage();`, add:

```js
await context.addInitScript(
  ({ key, value }) => {
    window.localStorage.setItem(key, value);
  },
  { key: themeStorageKey, value: qaTheme },
);
```

Inside `inspectWorkbench`, include app shell class data:

```js
const appShell = document.querySelector('[data-testid="app-shell"]');
```

Return:

```js
appShellClassName: appShell?.className || "",
appShellClassList: appShell ? Array.from(appShell.classList) : [],
```

Include `theme: qaTheme` in `writeReport` output.

Add failure checks after missing selector checks:

```js
if (!desktop.appShellClassList.includes(`theme-${qaTheme}`)) {
  failures.push("desktop-theme-class-mismatch");
}
if (!mobile.appShellClassList.includes(`theme-${qaTheme}`)) {
  failures.push("mobile-theme-class-mismatch");
}
```

Create `frontend/scripts/__tests__/workbench-theme-gate.test.mjs`:

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const workbenchScript = path.join(
  frontendRoot,
  "scripts/check-experiment-notebook-workbench.mjs",
);

test("workbench QA fails fast for unsupported theme values", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ghs-workbench-theme-"));
  const result = spawnSync(process.execPath, [workbenchScript], {
    cwd,
    env: {
      ...process.env,
      WORKBENCH_QA_THEME: "darkbench",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported WORKBENCH_QA_THEME "darkbench"/);
  assert.doesNotMatch(
    result.stderr,
    /Could not find Chrome|ECONNREFUSED|net::ERR_CONNECTION_REFUSED/,
  );
});
```

Add the new test file to `npm run test:qa-scripts` in `frontend/package.json`.

- [ ] **Step 2: Start a local workbench QA server**

Run in `frontend/` and keep the process open until QA finishes:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 3: Run dark-bench workbench QA locally**

Run:

```bash
cd frontend
WORKBENCH_QA_THEME=dark-bench WORKBENCH_QA_URL=http://127.0.0.1:5173/ npm run qa:workbench
```

Expected: pass and write:

- `frontend/build/experiment-notebook-workbench/workbench-report.json`
- `frontend/build/experiment-notebook-workbench/empty-desktop-1440.png`
- `frontend/build/experiment-notebook-workbench/empty-mobile-390.png`

The report must include `"theme": "dark-bench"` and app shell classes containing `theme-dark-bench`.

## Task 5: Full Local Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

```bash
cd frontend
npm test -- --runInBand src/utils/__tests__/themeMode.test.js src/components/__tests__/Header.test.js src/__tests__/App.themeMode.test.js src/__tests__/themeTokens.test.js
npm test -- --runInBand src/utils/__tests__/printLabels.test.js --testNamePattern="keeps generated preview and printed label surfaces white"
npm run test:qa-scripts
```

Expected: all tests pass.

- [ ] **Step 2: Run i18n tests**

```bash
cd frontend
npm run test:i18n
```

Expected: pass with no missing `header.*` keys.

- [ ] **Step 3: Build frontend**

```bash
cd frontend
npm run build
```

Expected: Vite build exits 0 and includes `build/llms.txt`.

- [ ] **Step 4: Run Dark Bench workbench QA**

Start Vite in `frontend/` first:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Then run:

```bash
cd frontend
WORKBENCH_QA_THEME=dark-bench WORKBENCH_QA_URL=http://127.0.0.1:5173/ npm run qa:workbench
```

Expected: `ok: true`, no desktop/mobile horizontal overflow, no missing selectors, and screenshot paths in `build/experiment-notebook-workbench/`.

- [ ] **Step 5: Run docs whitespace check**

```bash
git diff --check
```

Expected: exit 0.

## Task 6: Roadmap State And Commit

**Files:**
- Modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`
- Modify: `NEXT_PRODUCT_WORK.md`
- Modify: `LAB_WORKFLOW_READINESS_ROADMAP.md`

- [x] **Step 1: Record implementation closure**

After implementation and verification, update the docs to record
`Daily-use Comfort / Dark Bench Activation v0` as locally implemented and
locally verified. Record production readiness only after the deployment
follow-up passes.

- [x] **Step 2: Keep Batch/export second and evidence-gated**

Record that `Batch Review And Export Handoff Clarity` remains second, but still needs one of its evidence triggers before implementation: real batch list, export workbook, screenshot, workbook audit, production QA failure, or user report.

- [ ] **Step 3: Stage exact files**

```bash
git add frontend/src/utils/themeMode.js frontend/src/utils/__tests__/themeMode.test.js frontend/src/__tests__/App.themeMode.test.js frontend/src/__tests__/themeTokens.test.js frontend/src/utils/__tests__/printLabels.test.js frontend/src/App.jsx frontend/src/components/Header.jsx frontend/src/components/__tests__/Header.test.js frontend/src/i18n/locales/en.json frontend/src/i18n/locales/zh-TW.json frontend/scripts/check-experiment-notebook-workbench.mjs frontend/scripts/__tests__/workbench-theme-gate.test.mjs frontend/package.json PROJECT_STATUS_AND_NEXT_PLAN.md NEXT_PRODUCT_WORK.md LAB_WORKFLOW_READINESS_ROADMAP.md
```

- [ ] **Step 4: Commit**

```bash
git commit -m "Add Dark Bench app chrome toggle"
```

Expected: one logical implementation commit.

## Production Follow-Up

After pushing to `main`, wait for CI and production deployment before claiming production readiness.

```bash
cd frontend
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run qa:production-health
WORKBENCH_QA_URL=https://ghs-frontend.zeabur.app/ WORKBENCH_QA_THEME=dark-bench npm run qa:workbench
```

If production QA passes, update roadmap state with the deployment proof in a separate state-closure commit only if it changes slice status or evidence gates. Do not create a recursive no-op commit only to mention the state-closure commit itself.

Production follow-up result on 2026-06-28: passed. Commit `2d1de99` was pushed
to `main` and deployed as production SHA
`2d1de9915bb8c10cfb8fc2fd1138269e91b58f31`. GitHub CI run `28322688691`
completed successfully, Production Print QA run `28322728851` completed
successfully, expected-SHA production health returned `ok: true` for frontend
`build-info.json` and backend `/api/health`, and live Dark Bench workbench QA
returned `ok: true` with desktop/mobile `theme-dark-bench`, no missing
selectors, and no horizontal overflow. The slice can be recorded as shipped /
monitoring; future comfort work still needs fresh evidence.
