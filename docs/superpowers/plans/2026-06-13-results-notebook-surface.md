# Results Notebook Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Checked items reflect the completed execution state.

**Goal:** Extend the approved Experiment Notebook design language from the search/header primitives into the empty state and results workflow surfaces.

**Architecture:** Keep this slice visual and contract-preserving. Add a small set of reusable notebook panel/note/row/chip classes in `frontend/src/index.css`, then apply them to `EmptyState.jsx` and the high-visibility ResultsTable shell, action bar, workflow summary, filters, and mobile result cards. Do not change sorting, selection, export, print handoff, data-quality issue logic, i18n keys, backend APIs, print output, or version.

**Tech Stack:** React 19, Tailwind CSS 3.4, class-variance-authority Button primitive, Jest, Testing Library, Vite.

---

## Files

- Modify: `frontend/src/index.css`
  - Add reusable notebook panel, note, status-card, chip/action-chip, result-row, and inline-action classes.
- Modify: `frontend/src/components/EmptyState.jsx`
  - Apply notebook surface/card/control classes to the hero examples, workflow cards, feature cards, and visual badge.
  - Add stable `data-testid` hooks for workflow and feature cards.
- Modify: `frontend/src/components/__tests__/EmptyState.test.js`
  - Lock empty-state notebook controls and card classes.
- Modify: `frontend/src/components/ResultsTable.jsx`
  - Import `Button`.
  - Apply `notebook-surface` and new notebook section classes to the shell, decision guide, workflow summary, selection/filter bars, result rows, and row actions.
  - Replace top action buttons with notebook `Button` variants.
- Modify: `frontend/src/components/__tests__/ResultsTable.test.js`
  - Lock ResultsTable notebook shell, header actions, workflow summary, filters, and mobile row card classes.

---

### Task 1: Add Empty State Visual Contract Tests

**Files:**
- Modify: `frontend/src/components/__tests__/EmptyState.test.js`
- Later modify: `frontend/src/components/EmptyState.jsx`

- [x] **Step 1: Add notebook style assertions**

Add tests that assert:

```jsx
it('uses notebook controls for quick example buttons', () => {
  render(<EmptyState onQuickSearch={onQuickSearch} />);

  const example = screen.getByText('64-17-5').closest('button');
  expect(example).toHaveClass('notebook-control', 'notebook-control-secondary');
  expect(example.className).not.toContain('bg-white');
});

it('uses notebook cards for workflow and feature modules', () => {
  render(<EmptyState onQuickSearch={onQuickSearch} />);

  expect(screen.getByTestId('empty-workflow-card-search')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-workflow-card-review')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-workflow-card-use')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-feature-card-batch')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-feature-card-print')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-feature-card-excel')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('empty-feature-card-favorite')).toHaveClass('notebook-panel');
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js
```

Expected: FAIL because the quick example buttons and card test ids/classes do not exist yet.

---

### Task 2: Implement Empty State Notebook Styling

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/EmptyState.jsx`
- Test: `frontend/src/components/__tests__/EmptyState.test.js`

- [x] **Step 1: Add reusable notebook surface classes**

In `frontend/src/index.css`, add classes inside `@layer components`:

```css
.notebook-panel { ... }
.notebook-note { ... }
.notebook-status-card { ... }
.notebook-chip { ... }
.notebook-chip-action { ... }
.notebook-result-row { ... }
.notebook-result-row-selected { ... }
.notebook-inline-action { ... }
```

These should reuse existing `--notebook-*` tokens and preserve readable contrast in Comfort Dim and Dark Bench.

- [x] **Step 2: Apply classes in `EmptyState.jsx`**

Use existing data and labels. Add stable ids:

- `empty-workflow-card-search`
- `empty-workflow-card-review`
- `empty-workflow-card-use`
- `empty-feature-card-batch`
- `empty-feature-card-print`
- `empty-feature-card-excel`
- `empty-feature-card-favorite`

Apply `notebook-control notebook-control-secondary` to quick examples and `notebook-panel` to repeated cards.

- [x] **Step 3: Verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js
```

Expected: PASS.

---

### Task 3: Add ResultsTable Visual Contract Tests

**Files:**
- Modify: `frontend/src/components/__tests__/ResultsTable.test.js`
- Later modify: `frontend/src/components/ResultsTable.jsx`

- [x] **Step 1: Add notebook contract assertions**

Add tests that assert:

```jsx
it('uses notebook surfaces for the result workbench shell and summary', () => {
  render(<ResultsTable {...defaultProps} results={[mockFoundResult, mockWarningResult]} totalCount={2} />);

  expect(screen.getByTestId('results-table-shell')).toHaveClass('notebook-surface');
  expect(screen.getByTestId('results-decision-guide')).toHaveClass('notebook-note');
  expect(screen.getByTestId('results-workflow-summary')).toHaveClass('notebook-panel');
});

it('uses notebook controls for result header actions', () => {
  render(<ResultsTable {...defaultProps} printAllWithGhsCount={1} />);

  expect(screen.getByTestId('print-label-btn')).toHaveClass('notebook-control', 'notebook-control-primary');
  expect(screen.getByTestId('print-label-btn').className).not.toContain('bg-blue-700');
  expect(screen.getByTestId('print-all-with-ghs-btn')).toHaveClass('notebook-control', 'notebook-control-secondary');
  expect(screen.getByTestId('export-xlsx-btn')).toHaveClass('notebook-control', 'notebook-control-secondary');
  expect(screen.getByTestId('export-csv-btn')).toHaveClass('notebook-control', 'notebook-control-secondary');
});

it('uses notebook row cards and filter chips without losing responsive row classes', () => {
  render(<ResultsTable {...defaultProps} results={[mockFoundResult, mockWarningResult]} totalCount={2} />);

  expect(screen.getByTestId('results-filter-toolbar')).toHaveClass('notebook-panel');
  expect(screen.getByTestId('result-filter-all')).toHaveClass('notebook-chip-action');
  expect(screen.getByTestId('result-row-0')).toHaveClass('notebook-result-row', 'block', 'md:table-row');
  expect(screen.getByTestId('detail-btn-0')).toHaveClass('notebook-inline-action', 'whitespace-nowrap');
  expect(screen.getByTestId('sds-btn-0')).toHaveClass('notebook-inline-action', 'whitespace-nowrap');
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/ResultsTable.test.js
```

Expected: FAIL because ResultsTable has not adopted the notebook classes yet.

---

### Task 4: Implement ResultsTable Notebook Styling

**Files:**
- Modify: `frontend/src/components/ResultsTable.jsx`
- Test: `frontend/src/components/__tests__/ResultsTable.test.js`

- [x] **Step 1: Import `Button`**

Add:

```jsx
import { Button } from "@/components/ui/button";
```

- [x] **Step 2: Apply notebook shell and top actions**

Add `data-testid="results-table-shell"` to the root and use:

```jsx
className="notebook-surface overflow-hidden rounded-lg"
```

Replace the top `print-label-btn`, `print-all-with-ghs-btn`, `compare-btn`, `export-xlsx-btn`, and `export-csv-btn` raw buttons with the shared `Button` primitive using notebook variants.

- [x] **Step 3: Apply notebook summary/filter/row classes**

Use:

- `notebook-note` for `results-decision-guide`
- `notebook-panel` for `results-workflow-summary` and `results-filter-toolbar`
- `notebook-status-card` for internal workflow cards
- `notebook-chip-action` for clickable filters and review-action queue buttons
- `notebook-result-row` / `notebook-result-row-selected` for result rows
- `notebook-inline-action` for row detail/SDS actions

Preserve existing `data-testid`, handlers, disabled states, responsive classes, and row table semantics.

- [x] **Step 4: Verify GREEN**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/ResultsTable.test.js
```

Expected: PASS.

---

### Task 5: Focused Verification And Rendered QA

**Files:**
- All touched frontend files.

- [x] **Step 1: Run focused tests**

Run:

```bash
cd frontend && npm test -- --runInBand components/__tests__/EmptyState.test.js components/__tests__/ResultsTable.test.js components/ui/__tests__/button.test.jsx components/__tests__/Header.test.js components/__tests__/SearchSection.test.js
```

Expected: PASS.

- [x] **Step 2: Run docs check and build**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
cd frontend && npm run build
```

Expected: all commands exit 0.

- [x] **Step 3: Run rendered QA**

Start Vite:

```bash
cd frontend && VITE_BACKEND_URL=https://ghs-backend.zeabur.app npm run dev -- --host 127.0.0.1 --port 5173
```

Use Browser plugin if available. If it is not callable, record that Browser plugin was not available and use Playwright/Chrome to verify:

- empty-state desktop first viewport
- empty-state mobile first viewport
- a searched result screen desktop/mobile
- no console errors, no framework overlay, no horizontal overflow on mobile
- result actions still have 44 px touch height

Stop Vite before final response.

Execution note: the first Zeabur-backed rendered check was blocked locally by
TLS/CORS behavior, not by this UI change. The successful result-screen QA used
local FastAPI through `uv run --with-requirements requirements.txt`, with
`CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173`, and Vite set to
`VITE_BACKEND_URL=http://127.0.0.1:8001`.

- [x] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-13-results-notebook-surface.md frontend/src/index.css frontend/src/components/EmptyState.jsx frontend/src/components/__tests__/EmptyState.test.js frontend/src/components/ResultsTable.jsx frontend/src/components/__tests__/ResultsTable.test.js
git commit -m "feat: extend notebook styling to results surfaces"
```

Expected: implementation commit on `codex/experiment-notebook-primitives`.

---

## Self-Review

Spec coverage:

- Results surface adopts notebook language without data/print behavior changes: Tasks 3-4.
- Empty state adopts the same surface/control language: Tasks 1-2.
- Responsive feasibility: Task 5 rendered desktop/mobile QA.
- Print/data safety boundaries: no print engine, backend, data dictionary, i18n, or version changes.

Known non-goals:

- No print modal redesign.
- No Dark Bench activation or theme toggle.
- No ResultsTable logic refactor.
- No production deployment or Zeabur QA in this local implementation slice.
