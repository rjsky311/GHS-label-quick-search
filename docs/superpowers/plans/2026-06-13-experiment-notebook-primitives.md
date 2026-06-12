# Experiment Notebook Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Checked items reflect the completed execution state.

**Goal:** Add the first implementable slice of the Experiment Notebook design language: Comfort Dim/Dark Bench tokens, notebook-native button variants, and a narrow application to header/search controls.

**Architecture:** Keep this slice primitive-first. Add CSS theme tokens and reusable control classes in `frontend/src/index.css`, extend the existing shadcn-style `Button` primitive with notebook variants, then replace the most visible hard-coded blue/white buttons in `Header.jsx` and `SearchSection.jsx`. Do not change search behavior, print behavior, data flow, i18n keys, label output rules, or production version.

**Tech Stack:** React 19, Tailwind CSS 3.4, class-variance-authority, Jest, Testing Library.

---

## Files

- Modify: `frontend/src/index.css`
  - Add Comfort Dim and Dark Bench CSS tokens.
  - Add CSS-feasible notebook surface/control classes.
  - Add a white print-preview surface token for future Dark Bench preview use.
- Modify: `frontend/src/components/ui/button.jsx`
  - Add notebook button variants that reuse the existing `Button` primitive.
- Create: `frontend/src/components/ui/__tests__/button.test.jsx`
  - Lock notebook button variant class contracts.
- Modify: `frontend/src/components/Header.jsx`
  - Replace local hard-coded header button classes with notebook variants.
- Modify: `frontend/src/components/SearchSection.jsx`
  - Replace search/clear action buttons with notebook variants.
  - Add notebook section/surface classes without changing behavior.
- Modify: `frontend/src/components/__tests__/Header.test.js`
  - Update class expectations to the notebook control language.
- Modify: `frontend/src/components/__tests__/SearchSection.test.js`
  - Update class expectations and add regression checks that primary actions no longer use hard solid blue classes.
- Optional visual QA after tests/build: local Vite screenshot of first viewport.

---

### Task 1: Commit The Design-Language Baseline

**Files:**
- Stage: `EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md`
- Stage: `DESIGN.md`

- [x] **Step 1: Verify docs-only changes are clean**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
```

Expected: both commands exit 0.

- [x] **Step 2: Stage the design-language docs**

Run:

```bash
git add EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md DESIGN.md
```

- [x] **Step 3: Commit the design-language docs**

Run:

```bash
git commit -m "docs: record experiment notebook design language"
```

Expected: a docs-only commit on `codex/experiment-notebook-primitives`.

---

### Task 2: Add Notebook Button Variant Tests

**Files:**
- Create: `frontend/src/components/ui/__tests__/button.test.jsx`
- Modify later: `frontend/src/components/ui/button.jsx`

- [x] **Step 1: Write failing tests for notebook button variants**

Create `frontend/src/components/ui/__tests__/button.test.jsx`:

```jsx
import { render, screen } from "@testing-library/react";
import { Search, AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "../button";

describe("Button notebook variants", () => {
  it("renders notebook primary as a paper-tab action instead of a solid blue block", () => {
    render(
      <Button variant="notebookPrimary">
        <Search aria-hidden="true" />
        查詢
      </Button>
    );

    const button = screen.getByRole("button", { name: "查詢" });
    expect(button).toHaveClass("notebook-control", "notebook-control-primary");
    expect(button.className).not.toContain("bg-blue-700");
  });

  it("renders notebook secondary with the shared notebook control affordance", () => {
    render(<Button variant="notebookSecondary">匯出 CSV / Excel</Button>);

    expect(screen.getByRole("button", { name: "匯出 CSV / Excel" })).toHaveClass(
      "notebook-control",
      "notebook-control-secondary"
    );
  });

  it("renders notebook danger as a stamp-outline report action", () => {
    render(
      <Button variant="notebookDanger">
        <AlertTriangle aria-hidden="true" />
        回報資料問題
      </Button>
    );

    const button = screen.getByRole("button", { name: "回報資料問題" });
    expect(button).toHaveClass("notebook-control", "notebook-control-danger");
  });

  it("exposes notebook variant classes through buttonVariants for non-rendered composition", () => {
    expect(buttonVariants({ variant: "notebookUtility", size: "notebookIcon" })).toContain(
      "notebook-control-utility"
    );
    expect(buttonVariants({ variant: "notebookTab", size: "default" })).toContain(
      "notebook-control-tab"
    );
  });
});
```

- [x] **Step 2: Run the new test and verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/ui/__tests__/button.test.jsx
```

Expected: FAIL because `notebookPrimary`, `notebookSecondary`, `notebookDanger`, `notebookUtility`, `notebookTab`, and `notebookIcon` do not exist yet.

---

### Task 3: Implement Notebook Theme Tokens And Button Variants

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/ui/button.jsx`
- Test: `frontend/src/components/ui/__tests__/button.test.jsx`

- [x] **Step 1: Add Comfort Dim and Dark Bench tokens plus notebook control classes**

In `frontend/src/index.css`, extend the first `@layer base` block with notebook variables:

```css
:root,
.theme-comfort-dim {
    --notebook-app: 42 29% 91%;
    --notebook-ink: 220 24% 15%;
    --notebook-muted-ink: 218 13% 43%;
    --notebook-surface: 42 38% 96%;
    --notebook-surface-raised: 42 45% 98%;
    --notebook-border: 37 20% 77%;
    --notebook-rule: 218 24% 83%;
    --notebook-action: 218 72% 34%;
    --notebook-action-soft: 216 82% 96%;
    --notebook-action-border: 218 67% 42%;
    --notebook-danger: 0 72% 48%;
    --notebook-danger-soft: 0 86% 97%;
    --notebook-warning: 36 92% 40%;
    --notebook-warning-soft: 39 90% 94%;
    --notebook-ready: 148 58% 32%;
    --notebook-ready-soft: 146 45% 93%;
    --notebook-print-surface: 0 0% 100%;
    --notebook-print-ink: 220 24% 12%;
}

.theme-dark-bench {
    --notebook-app: 210 18% 8%;
    --notebook-ink: 42 30% 91%;
    --notebook-muted-ink: 215 14% 70%;
    --notebook-surface: 210 16% 12%;
    --notebook-surface-raised: 210 16% 15%;
    --notebook-border: 210 12% 28%;
    --notebook-rule: 204 16% 22%;
    --notebook-action: 196 90% 76%;
    --notebook-action-soft: 202 48% 18%;
    --notebook-action-border: 198 84% 63%;
    --notebook-danger: 4 78% 62%;
    --notebook-danger-soft: 4 42% 16%;
    --notebook-warning: 39 86% 64%;
    --notebook-warning-soft: 38 40% 16%;
    --notebook-ready: 142 55% 58%;
    --notebook-ready-soft: 142 33% 16%;
    --notebook-print-surface: 0 0% 100%;
    --notebook-print-ink: 220 24% 12%;
}
```

Add this new `@layer components` block after the base layers:

```css
@layer components {
    .notebook-app {
        background-color: hsl(var(--notebook-app));
        color: hsl(var(--notebook-ink));
        background-image:
            linear-gradient(hsl(var(--notebook-rule) / 0.24) 1px, transparent 1px),
            radial-gradient(hsl(var(--notebook-rule) / 0.18) 0.7px, transparent 0.7px);
        background-size: 100% 2.35rem, 18px 18px;
    }

    .notebook-surface {
        border: 1px solid hsl(var(--notebook-border) / 0.78);
        background-color: hsl(var(--notebook-surface));
        color: hsl(var(--notebook-ink));
        box-shadow: 0 12px 28px hsl(220 18% 10% / 0.08);
    }

    .notebook-print-preview {
        border: 1px solid hsl(var(--notebook-border) / 0.8);
        background-color: hsl(var(--notebook-print-surface));
        color: hsl(var(--notebook-print-ink));
    }

    .notebook-control {
        min-height: 2.75rem;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--notebook-border) / 0.95);
        background-color: hsl(var(--notebook-surface-raised));
        color: hsl(var(--notebook-ink));
        box-shadow:
            0 1px 0 hsl(0 0% 100% / 0.36) inset,
            0 4px 10px hsl(220 18% 10% / 0.07);
    }

    .notebook-control:hover {
        border-color: hsl(var(--notebook-action-border));
        background-color: hsl(var(--notebook-action-soft));
        color: hsl(var(--notebook-action));
    }

    .notebook-control:focus-visible {
        outline: 2px solid hsl(var(--notebook-action-border));
        outline-offset: 2px;
    }

    .notebook-control-primary {
        border-color: hsl(var(--notebook-action-border));
        background-color: hsl(var(--notebook-action-soft));
        color: hsl(var(--notebook-action));
        font-weight: 700;
    }

    .notebook-control-secondary,
    .notebook-control-utility,
    .notebook-control-tab {
        background-color: hsl(var(--notebook-surface-raised));
    }

    .notebook-control-danger {
        border-color: hsl(var(--notebook-danger) / 0.88);
        background-color: hsl(var(--notebook-danger-soft));
        color: hsl(var(--notebook-danger));
        font-weight: 700;
    }

    .notebook-control-tab {
        min-height: 2.5rem;
        border-bottom-color: hsl(var(--notebook-action-border) / 0.6);
        box-shadow: 0 -1px 0 hsl(var(--notebook-rule) / 0.7) inset;
    }
}
```

- [x] **Step 2: Extend `buttonVariants`**

In `frontend/src/components/ui/button.jsx`, add these variants and sizes:

```jsx
notebookPrimary:
  "notebook-control notebook-control-primary hover:text-[hsl(var(--notebook-action))]",
notebookSecondary:
  "notebook-control notebook-control-secondary hover:text-[hsl(var(--notebook-action))]",
notebookDanger:
  "notebook-control notebook-control-danger hover:text-[hsl(var(--notebook-danger))]",
notebookUtility:
  "notebook-control notebook-control-utility hover:text-[hsl(var(--notebook-action))]",
notebookTab:
  "notebook-control notebook-control-tab hover:text-[hsl(var(--notebook-action))]",
```

Add sizes:

```jsx
notebook: "h-11 px-4 py-2",
notebookWide: "h-11 px-5 py-2",
notebookIcon: "h-11 w-11",
```

- [x] **Step 3: Run the button test and verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/ui/__tests__/button.test.jsx
```

Expected: PASS.

---

### Task 4: Apply Notebook Controls To Header

**Files:**
- Modify: `frontend/src/components/Header.jsx`
- Modify: `frontend/src/components/__tests__/Header.test.js`

- [x] **Step 1: Update the Header test first**

In `frontend/src/components/__tests__/Header.test.js`, change the stable icon slot test to expect the notebook class:

```jsx
expect(button).toHaveClass("notebook-control", "notebook-control-utility");
expect(button).toHaveClass("h-11", "w-11", "shrink-0", "sm:w-28");
```

For the pilot active state, add a test:

```jsx
it("uses notebook primary styling for the active admin button", () => {
  render(<Header {...defaultProps} showPilotDashboard={true} />);
  expect(screen.getByTestId("pilot-dashboard-toggle-btn")).toHaveClass(
    "notebook-control",
    "notebook-control-primary"
  );
});
```

- [x] **Step 2: Run Header test and verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/Header.test.js
```

Expected: FAIL because current Header uses local slate/blue button classes.

- [x] **Step 3: Implement Header notebook controls**

In `Header.jsx`:

1. Import `Button`:

```jsx
import { Button } from "@/components/ui/button";
```

2. Replace `buttonBase` and `activeButton` with:

```jsx
const headerButtonBase =
  "relative h-11 w-11 shrink-0 px-0 sm:w-28 sm:justify-start sm:px-3";
```

3. Replace each header `<button>` with `<Button>` using:

```jsx
variant={showPilotDashboard ? "notebookPrimary" : "notebookUtility"}
size="notebookIcon"
className={headerButtonBase}
```

For non-admin utility buttons, use:

```jsx
variant="notebookUtility"
size="notebookIcon"
className={headerButtonBase}
```

Keep all existing handlers, `data-testid`, `title`, `aria-label`, badges, icons, and hidden text spans.

- [x] **Step 4: Run Header test and verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/Header.test.js
```

Expected: PASS.

---

### Task 5: Apply Notebook Controls To SearchSection

**Files:**
- Modify: `frontend/src/components/SearchSection.jsx`
- Modify: `frontend/src/components/__tests__/SearchSection.test.js`

- [x] **Step 1: Update SearchSection tests first**

In `frontend/src/components/__tests__/SearchSection.test.js`:

1. In the single button width test, expect:

```jsx
expect(button).toHaveClass(
  "notebook-control",
  "notebook-control-primary",
  "inline-flex",
  "w-28",
  "shrink-0",
  "sm:w-32"
);
expect(button.className).not.toContain("bg-blue-700");
```

2. Add a batch action styling test:

```jsx
it("uses notebook action styling for batch submit and clear actions", () => {
  render(<SearchSection {...defaultProps} activeTab="batch" batchCount={5} />);

  expect(screen.getByTestId("batch-search-btn")).toHaveClass(
    "notebook-control",
    "notebook-control-primary"
  );
  expect(screen.getByTestId("batch-search-btn").className).not.toContain("bg-blue-700");
  expect(screen.getByTestId("clear-batch-btn")).toHaveClass(
    "notebook-control",
    "notebook-control-secondary"
  );
});
```

- [x] **Step 2: Run SearchSection test and verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/SearchSection.test.js
```

Expected: FAIL because current search buttons use hard-coded blue/white classes.

- [x] **Step 3: Implement SearchSection notebook controls**

In `SearchSection.jsx`:

1. Import `Button`:

```jsx
import { Button } from "@/components/ui/button";
```

2. Change the outer shell class to include:

```jsx
"notebook-surface mb-6 rounded-lg"
```

3. Replace tab button active/inactive classes with `notebook-control-tab` plus existing layout classes. Keep `data-testid`, handlers, icons, and labels.

4. Replace single search raw button with:

```jsx
<Button
  onClick={() => onSearchSingle()}
  disabled={loading}
  variant="notebookPrimary"
  size="notebook"
  className="w-28 shrink-0 sm:w-32"
  data-testid="single-search-btn"
>
```

5. Replace batch submit raw button with:

```jsx
<Button
  onClick={onSearchBatch}
  disabled={
    loading ||
    batchCount > BATCH_SEARCH_LIMIT ||
    (batchSummary?.inputCount > 0 && batchCount === 0)
  }
  variant="notebookPrimary"
  size="notebookWide"
  className="flex-1"
  data-testid="batch-search-btn"
>
```

6. Replace clear batch raw button with:

```jsx
<Button
  onClick={() => onSetBatchCas("")}
  variant="notebookSecondary"
  size="notebookWide"
  data-testid="clear-batch-btn"
>
```

- [x] **Step 4: Run SearchSection test and verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/SearchSection.test.js
```

Expected: PASS.

---

### Task 6: Apply The Default Comfort Dim Shell Class

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: existing component smoke tests plus build.

- [x] **Step 1: Add a small regression test if an App shell test exists**

Check:

```bash
find frontend/src -name '*App*.test*' -print
```

If an App shell test exists, add an assertion that the root shell uses `theme-comfort-dim` and `notebook-app`. If no App shell test exists, skip a new broad App test in this first slice and rely on component tests plus browser screenshot.

- [x] **Step 2: Apply shell classes**

In `frontend/src/App.jsx`, change:

```jsx
<div className="min-h-screen bg-slate-50 text-slate-950">
```

to:

```jsx
<div className="theme-comfort-dim notebook-app min-h-screen">
```

Keep the skip link and Toaster unchanged for now.

- [x] **Step 3: Run focused tests**

Run:

```bash
cd frontend && npm test -- --runInBand components/ui/__tests__/button.test.jsx components/__tests__/Header.test.js components/__tests__/SearchSection.test.js
```

Expected: PASS.

---

### Task 7: Build And Visual Smoke

**Files:**
- No required source changes unless verification exposes issues.

- [x] **Step 1: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build exits 0.

- [x] **Step 2: Start local dev server**

Run:

```bash
cd frontend && VITE_BACKEND_URL=https://ghs-backend.zeabur.app npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves `http://127.0.0.1:5173/`.

- [x] **Step 3: Capture desktop and mobile screenshots**

Use Playwright/Chrome to capture:

- Desktop `1440x1000`
- Mobile `390x844`

Expected:

- Comfort Dim background is low-glare, not pure white.
- Search/header buttons read as clickable paper-tab controls.
- Primary search action is not a large saturated solid blue block.
- Mobile touch targets remain large enough.
- No obvious overlap in the first viewport.

- [x] **Step 4: Stop the dev server**

Stop the Vite process before final response.

---

### Task 8: Final Verification

**Files:**
- All touched files.

- [x] **Step 1: Run docs and focused tests**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
cd frontend && npm test -- --runInBand components/ui/__tests__/button.test.jsx components/__tests__/Header.test.js components/__tests__/SearchSection.test.js
cd frontend && npm run build
```

Expected: all commands exit 0.

- [x] **Step 2: Review git diff**

Run:

```bash
git diff --stat
git diff -- frontend/src/index.css frontend/src/components/ui/button.jsx frontend/src/components/Header.jsx frontend/src/components/SearchSection.jsx
```

Expected:

- Changes are limited to docs, theme tokens, button primitive, Header, SearchSection, and related tests.
- No print engine, backend, data, i18n, or version changes.

- [x] **Step 3: Commit implementation**

Run:

```bash
git add docs/superpowers/plans/2026-06-13-experiment-notebook-primitives.md frontend/src/index.css frontend/src/components/ui/button.jsx frontend/src/components/ui/__tests__/button.test.jsx frontend/src/components/Header.jsx frontend/src/components/SearchSection.jsx frontend/src/components/__tests__/Header.test.js frontend/src/components/__tests__/SearchSection.test.js frontend/src/App.jsx
git commit -m "feat: add experiment notebook UI primitives"
```

Expected: implementation commit on `codex/experiment-notebook-primitives`.

---

## Self-Review

Spec coverage:

- Comfort Dim default: Task 3 tokens and Task 6 shell class.
- Dark Bench token readiness: Task 3 tokens.
- Dark Bench white label preview rule: Task 3 `notebook-print-preview` token class; not applied to print modal in this first slice.
- Notebook button language: Tasks 2-5.
- Responsive feasibility: Task 7 desktop/mobile smoke.
- Print/data safety boundaries: no print/data files touched; Task 8 diff review checks that.

Known non-goals:

- No user-facing theme toggle.
- No full homepage/results redesign.
- No print modal redesign.
- No Dark Bench activation.
- No generated image assets committed.
