# Experiment Notebook Workbench Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Slice A from `docs/superpowers/specs/2026-06-13-experiment-notebook-workbench-v1-design.md`: make the empty first screen read as one aligned Experiment Notebook workbench.

**Architecture:** Keep the change limited to the empty-state first screen. Add embedded layout support to `ProductTrustPanel`, let `EmptyState` own a single workbench grid and trust slot, then wire the empty-state trust panel into that slot from `App.jsx`. Add a focused Playwright QA script that measures desktop alignment and mobile overflow; do not touch print modal, print renderer CSS, result-table data behavior, backend APIs, or version.

**Tech Stack:** React 19, Tailwind CSS 3.4, Jest, Testing Library, Playwright Core, Vite.

---

## Files

- Modify: `frontend/src/components/ProductTrustPanel.jsx`
  - Add an `embedded` prop for the empty-state workbench slot.
  - Preserve the existing `results` compact layout.
- Modify: `frontend/src/components/__tests__/ProductTrustPanel.test.js`
  - Add embedded empty-panel contract tests.
- Modify: `frontend/src/components/EmptyState.jsx`
  - Add `trustPanel` prop.
  - Replace separate hero/workflow/features grids with one workbench grid.
  - Keep existing translation keys and quick-search behavior.
- Modify: `frontend/src/components/__tests__/EmptyState.test.js`
  - Add workbench layout and trust-slot tests.
  - Update visual contract tests from independent cards to notebook ledger/status rows.
- Modify: `frontend/src/App.jsx`
  - Pass the empty-state `ProductTrustPanel` into `EmptyState` as `trustPanel`.
  - Remove the separate empty-state trust panel render below `EmptyState`.
- Modify: `frontend/src/index.css`
  - Add small workbench/ledger helper classes using existing notebook tokens.
- Create: `frontend/scripts/check-experiment-notebook-workbench.mjs`
  - Capture required Slice A desktop/mobile screenshots and write a JSON report.
- Modify: `frontend/package.json`
  - Add `qa:workbench` script.

---

## Task 1: ProductTrustPanel Embedded Mode

**Files:**
- Modify: `frontend/src/components/__tests__/ProductTrustPanel.test.js`
- Modify: `frontend/src/components/ProductTrustPanel.jsx`

- [ ] **Step 1: Add failing embedded-mode test**

Add this test to `frontend/src/components/__tests__/ProductTrustPanel.test.js` after the existing empty-state test:

```js
it('renders the empty trust surface in embedded workbench mode without its own page width', () => {
  render(<ProductTrustPanel variant="empty" embedded />);

  const panel = screen.getByTestId('product-trust-panel-empty');
  expect(panel).toHaveAttribute('data-layout', 'embedded');
  expect(panel).toHaveClass('notebook-panel', 'rounded-md');
  expect(panel.className).not.toContain('mx-auto');
  expect(panel.className).not.toContain('max-w-5xl');
  expect(panel.className).not.toContain('mt-8');

  expect(screen.getByTestId('product-trust-proof-list-empty')).toHaveClass(
    'grid',
    'gap-3',
    'md:grid-cols-3'
  );
  expect(screen.getByTestId('product-trust-report-link-empty')).toHaveClass(
    'notebook-control',
    'notebook-control-primary'
  );
  expect(screen.getByTestId('product-trust-workflow-link-empty')).toHaveClass(
    'notebook-control',
    'notebook-control-secondary'
  );
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/ProductTrustPanel.test.js
```

Expected: FAIL because `embedded` and `data-layout="embedded"` do not exist yet.

- [ ] **Step 3: Implement embedded mode**

In `frontend/src/components/ProductTrustPanel.jsx`, update the component signature:

```jsx
export default function ProductTrustPanel({
  variant = "empty",
  embedded = false,
  onOpenDataCorrection,
}) {
```

Add these class helpers before `return`:

```jsx
  const panelClassName = isCompact
    ? "notebook-panel mx-auto mt-4 rounded-md border-t px-4 py-4 text-left"
    : embedded
      ? "notebook-panel rounded-md px-5 py-5 text-left"
      : "notebook-panel mx-auto mt-8 max-w-5xl rounded-md px-5 py-5 text-left";
  const innerClassName = isCompact
    ? "grid gap-4 lg:grid-cols-[1fr_1.7fr]"
    : "space-y-4";
```

Replace the opening section and inner div classes with:

```jsx
    <section
      className={panelClassName}
      aria-label={t("productTrust.ariaLabel")}
      data-testid={`product-trust-panel-${variant}`}
      data-layout={embedded ? "embedded" : isCompact ? "compact" : "standalone"}
    >
      <div className={innerClassName}>
```

Do not change link URLs, translation keys, `onOpenDataCorrection`, or the `results` compact branch.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/ProductTrustPanel.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add frontend/src/components/ProductTrustPanel.jsx frontend/src/components/__tests__/ProductTrustPanel.test.js
git commit -m "feat: support embedded notebook trust panel"
```

---

## Task 2: EmptyState Workbench Composition

**Files:**
- Modify: `frontend/src/components/__tests__/EmptyState.test.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/EmptyState.jsx`

- [ ] **Step 1: Add failing workbench contract tests**

Add these tests to `frontend/src/components/__tests__/EmptyState.test.js`:

```js
it('renders one aligned notebook workbench with primary, support, tool, and trust zones', () => {
  render(
    <EmptyState
      onQuickSearch={onQuickSearch}
      trustPanel={<div data-testid="empty-trust-child">trust panel</div>}
    />
  );

  expect(screen.getByTestId('empty-workbench')).toHaveClass(
    'notebook-surface',
    'empty-workbench'
  );
  expect(screen.getByTestId('empty-workbench-grid')).toHaveClass(
    'grid',
    'lg:grid-cols-12'
  );
  expect(screen.getByTestId('empty-workbench-primary')).toBeInTheDocument();
  expect(screen.getByTestId('empty-workbench-support')).toBeInTheDocument();
  expect(screen.getByTestId('empty-workbench-tools')).toBeInTheDocument();
  expect(screen.getByTestId('empty-workbench-trust-slot')).toContainElement(
    screen.getByTestId('empty-trust-child')
  );
});

it('uses notebook ledger rows instead of detached workflow and feature-card grids', () => {
  render(<EmptyState onQuickSearch={onQuickSearch} />);

  expect(screen.getByTestId('empty-workflow-card-search')).toHaveClass(
    'notebook-ledger-row'
  );
  expect(screen.getByTestId('empty-workflow-card-review')).toHaveClass(
    'notebook-ledger-row'
  );
  expect(screen.getByTestId('empty-workflow-card-use')).toHaveClass(
    'notebook-ledger-row'
  );
  expect(screen.getByTestId('empty-feature-card-batch')).toHaveClass(
    'notebook-status-card'
  );
  expect(screen.getByTestId('empty-feature-card-print')).toHaveClass(
    'notebook-status-card'
  );
  expect(screen.getByTestId('empty-feature-card-excel')).toHaveClass(
    'notebook-status-card'
  );
  expect(screen.getByTestId('empty-feature-card-favorite')).toHaveClass(
    'notebook-status-card'
  );
});
```

Update the existing `uses notebook cards for workflow and feature modules` test so it no longer requires workflow cards to have `notebook-panel`. The new test above replaces that assertion for workflow rows. Keep the feature-card checks, but assert `notebook-status-card` instead of `notebook-panel`.

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js
```

Expected: FAIL because the workbench test ids and ledger classes do not exist yet.

- [ ] **Step 3: Add workbench helper classes**

In `frontend/src/index.css`, inside the existing `@layer components` block before `.notebook-control`, add:

```css
    .empty-workbench {
        background-image:
            linear-gradient(
                hsl(var(--notebook-rule) / 0.2) 1px,
                transparent 1px
            );
        background-size: 100% 2.15rem;
    }

    .notebook-ledger-row {
        border: 1px solid hsl(var(--notebook-border) / 0.68);
        background-color: hsl(var(--notebook-surface-raised) / 0.78);
        color: hsl(var(--notebook-ink));
        box-shadow:
            0 1px 0 hsl(0 0% 100% / 0.22) inset,
            0 5px 12px hsl(220 18% 10% / 0.045);
    }

    .notebook-step-marker {
        border: 1px solid hsl(var(--notebook-action-border) / 0.36);
        background-color: hsl(var(--notebook-action-soft));
        color: hsl(var(--notebook-action));
        font-variant-numeric: tabular-nums;
    }
```

- [ ] **Step 4: Replace `EmptyState` layout with one workbench grid**

In `frontend/src/components/EmptyState.jsx`, update the signature:

```jsx
export default function EmptyState({ onQuickSearch, trustPanel = null }) {
```

Replace the current `return (...)` with:

```jsx
  return (
    <section className="py-8 md:py-10" data-testid="empty-state">
      <div
        className="empty-workbench notebook-surface mx-auto max-w-6xl rounded-md px-5 py-6 md:px-7 md:py-8"
        data-testid="empty-workbench"
      >
        <div
          className="grid gap-7 lg:grid-cols-12 lg:items-start"
          data-testid="empty-workbench-grid"
        >
          <div className="min-w-0 text-left lg:col-span-7" data-testid="empty-workbench-primary">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--notebook-action))]">
              {t("empty.kicker")}
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-[hsl(var(--notebook-ink))] md:text-3xl">
              {t("empty.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[hsl(var(--notebook-muted-ink))]">
              {t("empty.subtitle")}
            </p>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("empty.tryThese")}
              </p>
              <div className="flex flex-wrap gap-3">
                {examples.map((ex) => (
                  <Button
                    key={ex.cas}
                    type="button"
                    onClick={() => onQuickSearch(ex.cas)}
                    variant="notebookSecondary"
                    size="notebook"
                    className="px-4"
                  >
                    <span className="font-mono text-[hsl(var(--notebook-action))]">{ex.cas}</span>
                    <span className="ml-2 text-[hsl(var(--notebook-muted-ink))]">{t(ex.nameKey)}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-7 space-y-3" data-testid="empty-workbench-workflow">
              {workflow.map(({ key, icon: Icon, titleKey, bodyKey }, index) => (
                <div
                  key={titleKey}
                  className="notebook-ledger-row flex min-w-0 items-start gap-3 rounded-md p-3.5"
                  data-testid={`empty-workflow-card-${key}`}
                >
                  <span className="notebook-step-marker mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--notebook-action))]" />
                      <h3 className="text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                        {t(titleKey)}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                      {t(bodyKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="min-w-0 lg:col-span-5"
            data-testid="empty-workbench-support"
            aria-hidden="true"
          >
            <div className="relative mx-auto aspect-[3/2] w-full max-w-xl">
              <img
                src={emptyWorkflowVisual}
                alt=""
                className="h-full w-full object-contain"
                decoding="async"
                data-testid="empty-visual-asset"
              />
              <div className="notebook-panel absolute bottom-3 right-3 rounded-md px-3 py-2 text-xs font-medium backdrop-blur">
                {t("empty.visualBadge")}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12" data-testid="empty-workbench-tools">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ key, icon: Icon, titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="notebook-status-card rounded-md p-4 text-left"
                  data-testid={`empty-feature-card-${key}`}
                >
                  <Icon className="mb-2 h-5 w-5 text-[hsl(var(--notebook-action))]" />
                  <h3 className="mb-1 text-sm font-medium text-[hsl(var(--notebook-ink))]">
                    {t(titleKey)}
                  </h3>
                  <p className="text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                    {t(descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {trustPanel ? (
            <div className="lg:col-span-12" data-testid="empty-workbench-trust-slot">
              {trustPanel}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
```

This keeps all existing translation keys, example CAS values, icons, and quick-search behavior.

- [ ] **Step 5: Run test to verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/index.css frontend/src/components/EmptyState.jsx frontend/src/components/__tests__/EmptyState.test.js
git commit -m "feat: compose empty state notebook workbench"
```

---

## Task 3: Wire Empty Trust Panel Into Workbench

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/__tests__/personaSingleLookupTrust.integration.test.js`
- Test: `frontend/src/components/__tests__/ProductTrustPanel.test.js`
- Test: `frontend/src/components/__tests__/EmptyState.test.js`

- [ ] **Step 1: Update App empty-state render**

In `frontend/src/App.jsx`, replace the empty-results fragment:

```jsx
        {results.length === 0 && !loading && (
          <>
            <EmptyState onQuickSearch={handleQuickSearch} />
            <ProductTrustPanel
              variant="empty"
              onOpenDataCorrection={handleOpenDataCorrection}
            />
          </>
        )}
```

with:

```jsx
        {results.length === 0 && !loading && (
          <EmptyState
            onQuickSearch={handleQuickSearch}
            trustPanel={
              <ProductTrustPanel
                variant="empty"
                embedded
                onOpenDataCorrection={handleOpenDataCorrection}
              />
            }
          />
        )}
```

- [ ] **Step 2: Add integration assertion**

In `frontend/src/__tests__/personaSingleLookupTrust.integration.test.js`, update the first test named `surfaces source confidence, missing Chinese-name curation, and authority boundaries`.

Immediately after:

```js
render(<App />);
```

add:

```js
expect(await screen.findByTestId("empty-workbench-trust-slot")).toContainElement(
  screen.getByTestId("product-trust-panel-empty")
);
expect(screen.getByTestId("product-trust-panel-empty")).toHaveAttribute(
  "data-layout",
  "embedded"
);
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js components/__tests__/ProductTrustPanel.test.js __tests__/personaSingleLookupTrust.integration.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add frontend/src/App.jsx frontend/src/__tests__/personaSingleLookupTrust.integration.test.js
git commit -m "feat: embed trust panel in empty workbench"
```

---

## Task 4: Add Slice A Workbench Visual QA

**Files:**
- Create: `frontend/scripts/check-experiment-notebook-workbench.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Create failing QA command**

Add this script to `frontend/package.json`:

```json
"qa:workbench": "node scripts/check-experiment-notebook-workbench.mjs"
```

Run:

```bash
cd frontend && npm run qa:workbench
```

Expected: FAIL because `scripts/check-experiment-notebook-workbench.mjs` does not exist.

- [ ] **Step 2: Create the workbench QA script**

Create `frontend/scripts/check-experiment-notebook-workbench.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const env = process.env;
const appUrl = env.WORKBENCH_QA_URL || "http://127.0.0.1:5173/";
const outputDir = path.resolve(
  process.cwd(),
  env.WORKBENCH_QA_OUTPUT_DIR || "build/experiment-notebook-workbench",
);
const headless = env.WORKBENCH_QA_HEADLESS !== "0";

const commonChromePaths = () => {
  if (process.platform === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];
};

const resolveChromeExecutable = () => {
  const explicit =
    env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
    env.CHROME_EXECUTABLE_PATH ||
    env.PLAYWRIGHT_EXECUTABLE_PATH;
  const candidates = explicit ? [explicit] : commonChromePaths();
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      "Could not find Chrome/Edge. Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH.",
    );
  }
  return found;
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("workbenchQa", Date.now().toString());
  return nextUrl.toString();
};

const roundedRect = (rect) =>
  rect
    ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      }
    : null;

const inspectWorkbench = async (page) =>
  page.evaluate(() => {
    const rectOf = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const overflowNodes = Array.from(
      document.querySelectorAll(
        [
          '[data-testid="empty-workbench"]',
          '[data-testid^="empty-workflow-card-"]',
          '[data-testid^="empty-feature-card-"]',
          '[data-testid="product-trust-panel-empty"]',
          '[data-testid="product-trust-proof-list-empty"]',
          'button',
          'a',
        ].join(","),
      ),
    )
      .map((node) => ({
        testId: node.getAttribute("data-testid") || "",
        tagName: node.tagName,
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }))
      .filter((item) => item.scrollWidth > item.clientWidth + 2);

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      workbench: rectOf('[data-testid="empty-workbench"]'),
      grid: rectOf('[data-testid="empty-workbench-grid"]'),
      primary: rectOf('[data-testid="empty-workbench-primary"]'),
      support: rectOf('[data-testid="empty-workbench-support"]'),
      tools: rectOf('[data-testid="empty-workbench-tools"]'),
      trustSlot: rectOf('[data-testid="empty-workbench-trust-slot"]'),
      trustPanel: rectOf('[data-testid="product-trust-panel-empty"]'),
      overflowNodes,
    };
  });

const alignmentDelta = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.right - b.right));
};

const inspectViewport = async (browser, viewport, screenshotName) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: "zh-TW",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(withQaParam(appUrl), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.getByTestId("empty-workbench").waitFor({
    state: "visible",
    timeout: 60000,
  });
  await page.screenshot({
    path: path.join(outputDir, screenshotName),
    fullPage: false,
  });
  const rawMetrics = await inspectWorkbench(page);
  await context.close();

  return {
    ...rawMetrics,
    workbench: roundedRect(rawMetrics.workbench),
    grid: roundedRect(rawMetrics.grid),
    primary: roundedRect(rawMetrics.primary),
    support: roundedRect(rawMetrics.support),
    tools: roundedRect(rawMetrics.tools),
    trustSlot: roundedRect(rawMetrics.trustSlot),
    trustPanel: roundedRect(rawMetrics.trustPanel),
    screenshot: path.join(outputDir, screenshotName),
  };
};

fs.mkdirSync(outputDir, { recursive: true });

const failures = [];
const browser = await chromium.launch({
  executablePath: resolveChromeExecutable(),
  headless,
});

try {
  const desktop = await inspectViewport(
    browser,
    { width: 1440, height: 900 },
    "empty-desktop-1440.png",
  );
  const mobile = await inspectViewport(
    browser,
    { width: 390, height: 844 },
    "empty-mobile-390.png",
  );

  const desktopAlignmentDelta = alignmentDelta(desktop.grid, desktop.trustSlot);
  if (desktopAlignmentDelta > 4) {
    failures.push(`desktop-grid-trust-alignment-${desktopAlignmentDelta}`);
  }
  if (desktop.documentScrollWidth > desktop.viewport.width + 2) {
    failures.push("desktop-horizontal-scroll");
  }
  if (mobile.documentScrollWidth > mobile.viewport.width + 2) {
    failures.push("mobile-horizontal-scroll");
  }
  if (mobile.overflowNodes.length > 0) {
    failures.push("mobile-text-overflow");
  }

  const report = {
    ok: failures.length === 0,
    appUrl,
    outputDir,
    failures,
    desktop,
    mobile,
  };
  fs.writeFileSync(
    path.join(outputDir, "workbench-report.json"),
    JSON.stringify(report, null, 2),
  );

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
```

- [ ] **Step 3: Run local dev server**

In a separate terminal:

```bash
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 4: Run visual QA**

Run:

```bash
cd frontend && npm run qa:workbench
```

Expected: PASS and these files exist:

```text
frontend/build/experiment-notebook-workbench/empty-desktop-1440.png
frontend/build/experiment-notebook-workbench/empty-mobile-390.png
frontend/build/experiment-notebook-workbench/workbench-report.json
```

- [ ] **Step 5: Commit**

Run:

```bash
git add frontend/package.json frontend/scripts/check-experiment-notebook-workbench.mjs
git commit -m "test: add experiment notebook workbench qa"
```

---

## Task 5: Slice A Full Verification

**Files:**
- No new files unless verification reveals a problem.

- [ ] **Step 1: Run focused unit and integration tests**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js components/__tests__/ProductTrustPanel.test.js __tests__/personaSingleLookupTrust.integration.test.js
```

Expected: PASS.

- [ ] **Step 2: Run standard docs/build gates**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
cd frontend && npm run test:i18n
cd frontend && npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Run visual QA**

With the local dev server running:

```bash
cd frontend && npm run qa:workbench
```

Expected: PASS.

- [ ] **Step 4: Request code review before Slice B**

Ask an independent reviewer to inspect the Slice A diff and the generated QA artifacts. Provide:

- Base SHA before Slice A implementation.
- Head SHA after Slice A implementation.
- Spec: `docs/superpowers/specs/2026-06-13-experiment-notebook-workbench-v1-design.md`.
- Plan: `docs/superpowers/plans/2026-06-13-experiment-notebook-workbench-slice-a.md`.
- Visual artifacts in `frontend/build/experiment-notebook-workbench/`.

- [ ] **Step 5: Stop condition**

Stop after Slice A passes tests, visual QA, and review. Do not start Slice B until the user or owner approves the Slice A result.
