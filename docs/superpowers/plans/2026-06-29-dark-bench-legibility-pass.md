# Dark Bench Legibility Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

Status: completed locally on 2026-06-29. The final slice expanded within the
same evidence boundary to include the footer, skip link, shared modal footer,
and remaining pre-print controls after browser QA found those surfaces still
carried fixed light-theme classes. Printed label previews and GHS pictogram
tiles stayed white/print-faithful.

**Goal:** Improve Dark Bench readability on the main page, post-query results, and pre-print modal surfaces without changing label meaning or printed output.

**Architecture:** Keep Comfort Dim unchanged and preserve white print-preview surfaces. Add a small set of notebook semantic tone utility classes in `frontend/src/index.css`, then replace hard-coded light-theme Tailwind foreground classes only on the reported Dark Bench app-chrome surfaces. Extend focused tests so future changes cannot reintroduce low-contrast `text-slate-*`, `text-blue-*`, `text-amber-*`, or `text-red-*` classes on those surfaces.

**Tech Stack:** React 19, Tailwind CSS, Jest Testing Library, Vite, Playwright workbench QA.

---

## Evidence And Scope

Source: owner/user report on 2026-06-29 that Dark Bench colors are not clear and some text is hard to read on the main page, after query, and before printing.

Affected user job: a repeated daily user should be able to use Dark Bench for lookup, result review, and pre-print review without losing readable instructions, row text, warning text, or action labels.

Non-goals:

- Do not change the public print model or label output.
- Do not change hazard data, exports, backend APIs, admin data, or agent-readable contracts.
- Do not darken generated label previews or printed label fragments.
- Do not redesign the visual system or introduce a third theme.

Stop condition:

- Reported surfaces use notebook token foregrounds or semantic tone utilities in Dark Bench.
- Focused tests catch the specific hard-coded low-contrast classes on those surfaces.
- Local Dark Bench workbench QA still passes and print preview white contract remains green.

## Files

- Modify: `frontend/src/index.css`
  - Add semantic foreground utility classes for notebook action, muted, danger, warning, and ready tones.
- Modify: `frontend/src/components/Header.jsx`
  - Replace header icon hard-coded dark-on-dark classes with notebook tone utilities.
- Modify: `frontend/src/components/Footer.jsx` and `frontend/src/App.jsx`
  - Replace footer and skip/loading chrome fixed light-theme classes with notebook tokens.
- Modify: `frontend/src/components/ui/modalViewport.js`
  - Replace shared modal footer fixed light-theme border/background classes with notebook tokens.
- Modify: `frontend/src/components/SearchSection.jsx`
  - Replace batch over-limit/error/progress hard-coded text classes with notebook tones.
- Modify: `frontend/src/components/ResultsTable.jsx`
  - Replace hard-coded result-row, filter, workflow, review-gate, source-badge, and table heading text classes with notebook token/tone classes.
- Modify: `frontend/src/components/LabelPrintModal.jsx`
  - Replace print blocked issue hard-coded red text with notebook danger tone.
- Modify: `frontend/src/components/label-print/MultipleGhsPrintWarning.jsx`
  - Replace hard-coded amber text with notebook warning tone.
- Modify: `frontend/src/components/label-print/labelPrintModalHelpers.js`
  - Replace readiness tone text colors with notebook tone utilities where those classes are used on notebook surfaces.
- Modify: `frontend/src/components/label-print/LabelPreviewPanel.jsx`
  - Replace pre-print preview-warning hard-coded warning/danger text with notebook tone utilities.
- Modify: `frontend/src/components/label-print/BatchFitReport.jsx`
  - Replace batch fit/pre-print handoff hard-coded foregrounds with notebook token/tone utilities.
- Modify: remaining visible `frontend/src/components/label-print/` control components
  - Replace saved jobs, stock selector, diagnostics, responsible profile, selected-label, and advanced-field fixed light-theme classes with notebook tokens while preserving white preview iframes/fragments.
- Test: `frontend/src/components/__tests__/Header.test.js`
- Test: `frontend/src/components/__tests__/SearchSection.test.js`
- Test: `frontend/src/components/__tests__/ResultsTable.test.js`
- Test: `frontend/src/components/__tests__/LabelPrintModal.test.js`
- Test: `frontend/src/components/__tests__/Footer.test.js`
- Test: `frontend/src/__tests__/themeTokens.test.js`

## Task 1: Token Utility Guard

- [x] **Step 1: Add failing CSS token tests**

Add tests to `frontend/src/__tests__/themeTokens.test.js`:

```js
it("defines semantic notebook tone utilities for Dark Bench legibility", () => {
  expect(css).toMatch(/\\.notebook-tone-muted\\s*{[^}]*color:\\s*hsl\\(var\\(--notebook-muted-ink\\)\\)/s);
  expect(css).toMatch(/\\.notebook-tone-action\\s*{[^}]*color:\\s*hsl\\(var\\(--notebook-action\\)\\)/s);
  expect(css).toMatch(/\\.notebook-tone-warning\\s*{[^}]*color:\\s*hsl\\(var\\(--notebook-warning\\)\\)/s);
  expect(css).toMatch(/\\.notebook-tone-danger\\s*{[^}]*color:\\s*hsl\\(var\\(--notebook-danger\\)\\)/s);
});
```

- [x] **Step 2: Run failing test**

```bash
cd frontend
npm test -- --runInBand src/__tests__/themeTokens.test.js --testNamePattern="semantic notebook tone utilities"
```

Expected: fail because the utilities do not exist yet.

- [x] **Step 3: Add minimal CSS utilities**

Add to `frontend/src/index.css` inside `@layer components`:

```css
.notebook-tone-ink { color: hsl(var(--notebook-ink)); }
.notebook-tone-muted { color: hsl(var(--notebook-muted-ink)); }
.notebook-tone-action { color: hsl(var(--notebook-action)); }
.notebook-tone-warning { color: hsl(var(--notebook-warning)); }
.notebook-tone-danger { color: hsl(var(--notebook-danger)); }
.notebook-tone-ready { color: hsl(var(--notebook-ready)); }
```

- [x] **Step 4: Run test**

```bash
cd frontend
npm test -- --runInBand src/__tests__/themeTokens.test.js --testNamePattern="semantic notebook tone utilities"
```

Expected: pass.

## Task 2: Main Page / Header Legibility

- [x] **Step 1: Add failing Header and SearchSection tests**

Add a Header test asserting the brand/admin/prepared/history icons no longer use fixed `text-red-700`, `text-blue-700`, or `text-slate-600` classes, and use notebook tone utilities instead.

Add SearchSection tests asserting batch over-limit, progress labels, and general error messages no longer use fixed red/slate text classes.

- [x] **Step 2: Run failing tests**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/Header.test.js src/components/__tests__/SearchSection.test.js --testNamePattern="Dark Bench|notebook"
```

Expected: fail on the newly added assertions.

- [x] **Step 3: Replace classes**

In `Header.jsx`, replace:

- `text-red-700` with `notebook-tone-danger`
- `text-blue-700` with `notebook-tone-action`
- `text-slate-600` with `notebook-tone-muted`

In `SearchSection.jsx`, replace:

- `text-red-600` / `text-red-700` with `notebook-tone-danger`
- `text-slate-500` / `text-slate-600` with `notebook-tone-muted`

- [x] **Step 4: Run tests**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/Header.test.js src/components/__tests__/SearchSection.test.js
```

Expected: pass.

## Task 3: Results Surface Legibility

- [x] **Step 1: Add failing ResultsTable tests**

Extend `frontend/src/components/__tests__/ResultsTable.test.js` to assert:

- `results-multiple-ghs-review-body` and primary CTA use notebook warning/ink tones, not `text-amber-*`.
- workflow review action queue buttons do not contain `text-blue-*`, `text-slate-*`, `bg-blue-50`, or `bg-slate-50`.
- visible result row primary/secondary names and CAS use notebook ink/muted/action tones.
- table header cells use notebook muted tone rather than `text-slate-600`.

- [x] **Step 2: Run failing test subset**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/ResultsTable.test.js --testNamePattern="notebook|Dark Bench|workflow"
```

Expected: fail on the newly added assertions.

- [x] **Step 3: Replace hard-coded result surface classes**

In `ResultsTable.jsx`, replace fixed light-theme text classes on notebook surfaces with:

- `notebook-tone-action` for CAS/action/source emphasis.
- `notebook-tone-muted` for secondary names, table headings, counts, body notes.
- `notebook-tone-warning` for multiple-GHS and review warning text.
- `notebook-tone-danger` for blocking/error text.
- `text-[hsl(var(--notebook-ink))]` for primary names and labels.

Do not change data processing, filtering, sorting, export, or selection behavior.

- [x] **Step 4: Run focused ResultsTable tests**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/ResultsTable.test.js
```

Expected: pass.

## Task 4: Pre-Print Modal Legibility

- [x] **Step 1: Add failing LabelPrintModal tests**

Extend `frontend/src/components/__tests__/LabelPrintModal.test.js` to assert:

- `print-blocked-issue` uses `notebook-tone-danger` and no fixed `text-red-*`.
- `print-multiple-ghs-warning` uses `notebook-tone-warning` and no fixed `text-amber-*`.
- `preview-warning-banner` uses `notebook-tone-danger` or `notebook-tone-warning` and no fixed `text-red-*` / `text-amber-*`.
- `batch-fit-report` visible labels and output contract use notebook token classes rather than `text-slate-*` / `text-blue-*`.

- [x] **Step 2: Run failing test subset**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/LabelPrintModal.test.js --testNamePattern="warning|blocked|batch fit|Dark Bench"
```

Expected: fail on the newly added assertions.

- [x] **Step 3: Replace pre-print hard-coded classes**

Update:

- `LabelPrintModal.jsx`
- `MultipleGhsPrintWarning.jsx`
- `labelPrintModalHelpers.js`
- `LabelPreviewPanel.jsx`
- `BatchFitReport.jsx`

Use notebook tone utilities and existing notebook surface classes. Keep `.notebook-print-preview` and generated label fragment containers white.

- [x] **Step 4: Run focused LabelPrintModal tests**

```bash
cd frontend
npm test -- --runInBand src/components/__tests__/LabelPrintModal.test.js
```

Expected: pass.

## Task 5: Verification And State

- [x] **Step 1: Run focused theme and component tests**

```bash
cd frontend
npm test -- --runInBand src/__tests__/themeTokens.test.js src/components/__tests__/Header.test.js src/components/__tests__/SearchSection.test.js src/components/__tests__/ResultsTable.test.js src/components/__tests__/LabelPrintModal.test.js
```

Expected: pass.

- [x] **Step 2: Run i18n and build**

```bash
cd frontend
npm run test:i18n
npm run build
```

Expected: pass.

- [x] **Step 3: Run local Dark Bench workbench QA**

Start Vite if needed:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Then:

```bash
cd frontend
WORKBENCH_QA_THEME=dark-bench WORKBENCH_QA_URL=http://127.0.0.1:5173/ npm run qa:workbench
```

Expected: `ok: true`, no missing selectors, no horizontal overflow, screenshots in `frontend/build/experiment-notebook-workbench/`.

- [x] **Step 4: Run docs whitespace check**

```bash
git diff --check
```

Expected: exit 0.

- [x] **Step 5: Update state docs**

Update `PROJECT_STATUS_AND_NEXT_PLAN.md`, `NEXT_PRODUCT_WORK.md`, and `LAB_WORKFLOW_READINESS_ROADMAP.md` only with a concise breadcrumb:

- mode: RSL v2 `default`
- risk tier: `browser_no_spend`
- source: 2026-06-29 owner report about Dark Bench unclear text on main/results/pre-print surfaces
- verification commands and screenshot/report artifact paths
- next slice remains evidence-gated

- [x] **Step 6: Commit exact files**

```bash
git add frontend/src/index.css frontend/src/components/Header.jsx frontend/src/components/SearchSection.jsx frontend/src/components/ResultsTable.jsx frontend/src/components/LabelPrintModal.jsx frontend/src/components/label-print/MultipleGhsPrintWarning.jsx frontend/src/components/label-print/labelPrintModalHelpers.js frontend/src/components/label-print/LabelPreviewPanel.jsx frontend/src/components/label-print/BatchFitReport.jsx frontend/src/__tests__/themeTokens.test.js frontend/src/components/__tests__/Header.test.js frontend/src/components/__tests__/SearchSection.test.js frontend/src/components/__tests__/ResultsTable.test.js frontend/src/components/__tests__/LabelPrintModal.test.js PROJECT_STATUS_AND_NEXT_PLAN.md NEXT_PRODUCT_WORK.md LAB_WORKFLOW_READINESS_ROADMAP.md docs/superpowers/plans/2026-06-29-dark-bench-legibility-pass.md
git commit -m "Improve Dark Bench legibility"
```

Expected: one verified logical slice.
