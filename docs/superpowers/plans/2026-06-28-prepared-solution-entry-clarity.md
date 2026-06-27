# Prepared Solution Entry Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the prepared-label workflow read as "create a prepared-solution label from a selected parent chemical" while the header prepared control reads as recent/reprint access.

**Architecture:** This is a frontend copy and test slice. The workflow model, storage shape, print contract, parent hazard-copy behavior, and production API stay unchanged; implementation is limited to i18n copy, small accessibility/title attributes, and tests that pin the entry model.

**Tech Stack:** React 19, Vite, Jest, Testing Library, i18next flat JSON locale resources, Tailwind/Radix UI components.

---

## Slice Contract

**Source:** Owner/user evidence from 2026-06-27: the prepared-solution/prepared-label entry is unclear enough that even the owner was unsure how to use the feature.

**Affected User Job:** A lab user finds a parent chemical, creates a label for a working solution, prepared solution, or prepared reagent, and later reuses or reprints that prepared-label workflow without changing the parent GHS classification.

**Stop Condition:** Stop after this implementation proves the entry model through focused tests, `test:i18n`, and `build`. Do not expand into backend persistence, print-output behavior, data-model changes, or physical print validation.

**Safety Boundary:**
- Prepared labels copy a single selected parent chemical's hazard data.
- Concentration, solvent, dilution, prepared-by, prepared-date, and expiry are user-entered workflow fields.
- Those fields must not infer, reduce, weaken, modify, or reclassify hazards.
- Saved presets are recipe-only and must not carry operator/date/expiry values or hazard snapshots.
- Recent prepared records support prefill/reprint, but reprint refreshes current parent hazard data.
- SDS, supplier labels, and local regulations remain final authority.

## Accepted Entry Model And Copy

Use these exact product roles for the implementation:

- Header control role: recent prepared-label access and reprint helper.
- Detail CTA role: the only creation entry, shown from a found parent chemical.
- Modal role: create a prepared-solution label from the current parent chemical.
- Sidebar role: review recent prepared-label workflow records and reprint from refreshed parent data.
- Preset role: recipe-only concentration/solvent reuse.
- Recent role: workflow-record prefill/reprint helper; user still reviews before printing.

Recommended bilingual copy:

| Key | zh-TW | en |
|---|---|---|
| `header.prepared` | `配製重印` | `Reprint` |
| `header.preparedTitle` | `查看近期配製標籤與重印` | `View recent prepared labels and reprint` |
| `header.preparedTitleWithCount` | `查看 {{count}} 筆近期配製標籤與重印` | `View {{count}} recent prepared labels and reprint` |
| `detail.prepareSolution` | `用此化學品建立配製標籤` | `Create prepared label from this chemical` |
| `prepared.title` | `建立配製溶液標籤` | `Create prepared solution label` |
| `prepared.subtitle` | `從目前選取的母化學品建立工作液、配製溶液或配製試劑標籤；危害資料會沿用母化學品。` | `Create a label for a working solution, prepared solution, or prepared reagent from the selected parent chemical. Hazard data is copied from the parent.` |
| `prepared.formNote` | `此流程不會重新計算混合物的 GHS 分類，也不會因濃度、溶劑、稀釋比例、配製人、日期或有效期限而推導、降低、弱化或修改危害。標籤會以母化學品危害資料加上你輸入的欄位註記；使用前請以官方安全資料表（SDS）、供應商標籤與所在地規範為準。` | `This workflow does not re-classify the mixture and does not infer, reduce, weaken, or modify hazards from concentration, solvent, dilution, operator, date, or expiry fields. The label uses the parent chemical's hazard data plus the label notes you enter. Verify against the official SDS, supplier label, and local rules before use.` |
| `prepared.labelPrefix` | `配製自` | `Prepared from` |
| `prepared.recentHeading` | `最近使用的配製紀錄 — 點擊帶入，可再確認後列印` | `Recent prepared records — click to prefill, then review before printing` |
| `prepared.presetHeading` | `已儲存配方 — 只帶入濃度 / 溶劑` | `Saved recipes — reuse concentration / solvent only` |
| `prepared.recentHint` | `最近紀錄會帶入濃度、溶劑與配製人供你確認；配製日期會重設為今天，有效期限保持空白。` | `Recent records prefill concentration, solvent, and operator for review; the prepared date resets to today and expiry stays blank.` |
| `prepared.presetHint` | `已儲存配方只保留濃度 / 溶劑，不帶入配製人、日期、有效期限，也不保存危害資料。` | `Saved recipes keep only concentration / solvent. They do not carry operator, dates, expiry, or hazard data.` |
| `prepared.presetBadge` | `配方` | `Recipe` |
| `prepared.saveAsPreset` | `儲存為配方` | `Save as recipe` |
| `prepared.presetName` | `配方名稱（選填）` | `Recipe name (optional)` |
| `prepared.sidebarTitle` | `近期配製標籤` | `Recent prepared labels` |
| `prepared.sidebarHint` | `重印會重新取得母化學品資料並開啟列印確認；列印前請再確認濃度、溶劑與日期資訊。` | `Reprint refreshes the parent chemical data and opens print review; confirm concentration, solvent, and dates before printing.` |
| `prepared.sidebarEmpty` | `還沒有近期配製標籤` | `No recent prepared labels yet` |
| `prepared.sidebarEmptyHint` | `先搜尋母化學品，從詳細資料建立配製溶液標籤；完成後可在這裡用最新的母化學品危害資料重印。` | `Search for a parent chemical first, then create a prepared-solution label from its detail view. After that, reprint here with fresh parent hazard data.` |
| `prepared.closeSidebar` | `關閉近期配製標籤` | `Close recent prepared labels` |
| `prepared.reprint` | `重印` | `Reprint` |

Implementation should avoid using `稀釋液` as the umbrella term. It can still appear in historical comments or print-specific compatibility text where changing it would broaden scope, but the first-run entry flow should use `配製標籤` / `配製溶液標籤` / `工作液、配製溶液或配製試劑`.

## File Structure

Modify:

- `frontend/src/components/Header.jsx`: add `aria-label` and `title` to the prepared header button using `header.preparedTitle` or `header.preparedTitleWithCount`; keep button behavior unchanged.
- `frontend/src/components/DetailModal.jsx`: no JSX structure change expected; it should continue rendering `detail.prepareSolution` from i18n.
- `frontend/src/components/PreparedSidebar.jsx`: add a persistent populated-state hint using `prepared.sidebarHint` so reprint is visibly framed as refreshed parent data plus print review, and give the icon-only close button an accessible name using `prepared.closeSidebar`.
- `frontend/src/components/PrepareSolutionModal.jsx`: no structure change expected; existing title, subtitle, headings, hints, and form note are the intended surfaces.
- `frontend/src/i18n/locales/zh-TW.json`: update prepared-entry copy and add `header.preparedTitle`.
- `frontend/src/i18n/locales/en.json`: update prepared-entry copy and add `header.preparedTitle`.
- `frontend/src/components/__tests__/Header.test.js`: pin header prepared control as recent/reprint access.
- `frontend/src/components/__tests__/PreparedSidebar.test.js`: pin empty state and reprint helper copy surfaces.
- `frontend/src/components/__tests__/PrepareSolutionModal.test.js`: pin modal copy surfaces for parent creation, recipe-only presets, recent prefill, and safety note.
- `frontend/src/i18n/__tests__/i18n.test.js`: pin exact bilingual copy and the "not dilution as umbrella" decision.
- `frontend/src/__tests__/prepareSolution.integration.test.js`: keep existing flow tests unchanged unless they fail after the planned copy updates.
- `frontend/src/__tests__/personaTeachingSetup.integration.test.js`: add an assertion that the detail CTA remains the creation entry.

Do not modify:

- `frontend/src/utils/preparedSolution.js`
- `frontend/src/utils/printLabels.js`
- `frontend/src/utils/printContentModel.js`
- `frontend/src/utils/printFitEngine.js`
- Backend files
- LocalStorage schema or migration code

## Task 1: Header Prepared Control Reads As Recent/Reprint Access

**Files:**
- Modify: `frontend/src/components/__tests__/Header.test.js`
- Modify: `frontend/src/components/Header.jsx`
- Modify: `frontend/src/i18n/locales/zh-TW.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Write the failing header test**

Add this test near the existing prepared-count tests in `frontend/src/components/__tests__/Header.test.js`:

```jsx
it('describes the prepared header button as recent/reprint access', () => {
  render(<Header {...defaultProps} />);

  const preparedBtn = screen.getByTestId('prepared-toggle-btn');
  expect(preparedBtn).toHaveTextContent('header.prepared');
  expect(preparedBtn).toHaveAttribute('aria-label', 'header.preparedTitle');
  expect(preparedBtn).toHaveAttribute('title', 'header.preparedTitle');
});

it('includes prepared count in the recent/reprint accessible label', () => {
  render(<Header {...defaultProps} preparedCount={3} />);

  const preparedBtn = screen.getByTestId('prepared-toggle-btn');
  expect(preparedBtn).toHaveAttribute(
    'aria-label',
    'header.preparedTitleWithCount'
  );
  expect(preparedBtn).toHaveAttribute(
    'title',
    'header.preparedTitleWithCount'
  );
});
```

- [ ] **Step 2: Run the header test and confirm the failure**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/Header.test.js
```

Expected failure before implementation:

```text
expect(element).toHaveAttribute("aria-label", "header.preparedTitle")
Expected the element to have attribute:
  aria-label="header.preparedTitle"
Received:
  null
```

- [ ] **Step 3: Add accessibility/title copy to the header button**

In `frontend/src/components/Header.jsx`, change the prepared button to include the new i18n key:

```jsx
const preparedButtonTitle =
  preparedCount > 0
    ? t("header.preparedTitleWithCount", { count: preparedCount })
    : t("header.preparedTitle");

<Button
  onClick={onTogglePrepared}
  variant="notebookUtility"
  size="notebookIcon"
  className={headerButtonBase}
  data-testid="prepared-toggle-btn"
  aria-label={preparedButtonTitle}
  title={preparedButtonTitle}
>
```

- [ ] **Step 4: Add the new locale key and clearer reprint label**

In `frontend/src/i18n/locales/zh-TW.json` update the header block to:

```json
"header.prepared": "配製重印",
"header.preparedTitle": "查看近期配製標籤與重印",
"header.preparedTitleWithCount": "查看 {{count}} 筆近期配製標籤與重印",
```

In `frontend/src/i18n/locales/en.json` update the header block to:

```json
"header.prepared": "Reprint",
"header.preparedTitle": "View recent prepared labels and reprint",
"header.preparedTitleWithCount": "View {{count}} recent prepared labels and reprint",
```

- [ ] **Step 5: Re-run the header test**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/Header.test.js
```

Expected result: all tests in `Header.test.js` pass.

## Task 2: Exact Bilingual Entry Copy Is Pinned In i18n Runtime Tests

**Files:**
- Modify: `frontend/src/i18n/__tests__/i18n.test.js`
- Modify: `frontend/src/i18n/locales/zh-TW.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Add zh-TW prepared-entry copy assertions**

Append this test in `frontend/src/i18n/__tests__/i18n.test.js`:

```js
test("pins Traditional Chinese prepared-label entry copy", async () => {
  window.localStorage.setItem("ghs_language", "zh-TW");

  const { default: i18n, i18nReady } = await import("@/i18n");
  await i18nReady;

  expect(i18n.t("header.prepared")).toBe("配製重印");
  expect(i18n.t("header.preparedTitle")).toBe("查看近期配製標籤與重印");
  expect(i18n.t("header.preparedTitleWithCount", { count: 3 })).toBe(
    "查看 3 筆近期配製標籤與重印"
  );
  expect(i18n.t("detail.prepareSolution")).toBe("用此化學品建立配製標籤");
  expect(i18n.t("prepared.title")).toBe("建立配製溶液標籤");
  expect(i18n.t("prepared.subtitle")).toContain("母化學品");
  expect(i18n.t("prepared.subtitle")).toContain("工作液、配製溶液或配製試劑");
  expect(i18n.t("prepared.subtitle")).not.toContain("稀釋液");
  expect(i18n.t("prepared.formNote")).toContain("不會重新計算");
  expect(i18n.t("prepared.formNote")).toContain("不會因濃度");
  expect(i18n.t("prepared.formNote")).toContain("稀釋比例");
  expect(i18n.t("prepared.formNote")).toContain("降低、弱化或修改危害");
  expect(i18n.t("prepared.formNote")).toContain("官方安全資料表（SDS）");
  expect(i18n.t("prepared.formNote")).toContain("供應商標籤");
  expect(i18n.t("prepared.formNote")).toContain("所在地規範");
  expect(i18n.t("prepared.labelPrefix")).toBe("配製自");
  expect(i18n.t("prepared.recentHeading")).toBe(
    "最近使用的配製紀錄 — 點擊帶入，可再確認後列印"
  );
  expect(i18n.t("prepared.presetHeading")).toBe(
    "已儲存配方 — 只帶入濃度 / 溶劑"
  );
  expect(i18n.t("prepared.recentHint")).toBe(
    "最近紀錄會帶入濃度、溶劑與配製人供你確認；配製日期會重設為今天，有效期限保持空白。"
  );
  expect(i18n.t("prepared.presetHint")).toBe(
    "已儲存配方只保留濃度 / 溶劑，不帶入配製人、日期、有效期限，也不保存危害資料。"
  );
  expect(i18n.t("prepared.presetBadge")).toBe("配方");
  expect(i18n.t("prepared.saveAsPreset")).toBe("儲存為配方");
  expect(i18n.t("prepared.presetName")).toBe("配方名稱（選填）");
  expect(i18n.t("prepared.sidebarHint")).toBe(
    "重印會重新取得母化學品資料並開啟列印確認；列印前請再確認濃度、溶劑與日期資訊。"
  );
  expect(i18n.t("prepared.sidebarEmpty")).toBe("還沒有近期配製標籤");
  expect(i18n.t("prepared.sidebarEmptyHint")).toBe(
    "先搜尋母化學品，從詳細資料建立配製溶液標籤；完成後可在這裡用最新的母化學品危害資料重印。"
  );
  expect(i18n.t("prepared.closeSidebar")).toBe("關閉近期配製標籤");
  expect(i18n.t("prepared.reprint")).toBe("重印");
});
```

- [ ] **Step 2: Add English prepared-entry copy assertions**

Append this test in `frontend/src/i18n/__tests__/i18n.test.js`:

```js
test("pins English prepared-label entry copy", async () => {
  window.localStorage.setItem("ghs_language", "en");

  const { default: i18n, i18nReady } = await import("@/i18n");
  await i18nReady;

  expect(i18n.t("header.prepared")).toBe("Reprint");
  expect(i18n.t("header.preparedTitle")).toBe(
    "View recent prepared labels and reprint"
  );
  expect(i18n.t("header.preparedTitleWithCount", { count: 3 })).toBe(
    "View 3 recent prepared labels and reprint"
  );
  expect(i18n.t("detail.prepareSolution")).toBe(
    "Create prepared label from this chemical"
  );
  expect(i18n.t("prepared.title")).toBe("Create prepared solution label");
  expect(i18n.t("prepared.subtitle")).toContain("selected parent chemical");
  expect(i18n.t("prepared.subtitle")).toContain("working solution");
  expect(i18n.t("prepared.subtitle")).not.toContain("dilution");
  expect(i18n.t("prepared.formNote")).toContain("does not re-classify");
  expect(i18n.t("prepared.formNote")).toContain(
    "does not infer, reduce, weaken, or modify hazards"
  );
  expect(i18n.t("prepared.formNote")).toContain("dilution");
  expect(i18n.t("prepared.formNote")).toContain("official SDS");
  expect(i18n.t("prepared.formNote")).toContain("supplier label");
  expect(i18n.t("prepared.formNote")).toContain("local rules");
  expect(i18n.t("prepared.labelPrefix")).toBe("Prepared from");
  expect(i18n.t("prepared.recentHeading")).toBe(
    "Recent prepared records — click to prefill, then review before printing"
  );
  expect(i18n.t("prepared.presetHeading")).toBe(
    "Saved recipes — reuse concentration / solvent only"
  );
  expect(i18n.t("prepared.recentHint")).toBe(
    "Recent records prefill concentration, solvent, and operator for review; the prepared date resets to today and expiry stays blank."
  );
  expect(i18n.t("prepared.presetHint")).toBe(
    "Saved recipes keep only concentration / solvent. They do not carry operator, dates, expiry, or hazard data."
  );
  expect(i18n.t("prepared.presetBadge")).toBe("Recipe");
  expect(i18n.t("prepared.saveAsPreset")).toBe("Save as recipe");
  expect(i18n.t("prepared.presetName")).toBe("Recipe name (optional)");
  expect(i18n.t("prepared.sidebarHint")).toBe(
    "Reprint refreshes the parent chemical data and opens print review; confirm concentration, solvent, and dates before printing."
  );
  expect(i18n.t("prepared.sidebarEmpty")).toBe("No recent prepared labels yet");
  expect(i18n.t("prepared.sidebarEmptyHint")).toBe(
    "Search for a parent chemical first, then create a prepared-solution label from its detail view. After that, reprint here with fresh parent hazard data."
  );
  expect(i18n.t("prepared.closeSidebar")).toBe("Close recent prepared labels");
  expect(i18n.t("prepared.reprint")).toBe("Reprint");
});
```

- [ ] **Step 3: Run the i18n runtime test and confirm the failure**

Run from `frontend/`:

```bash
npm test -- --runInBand src/i18n/__tests__/i18n.test.js
```

Expected failure before implementation: assertions for `header.prepared`, `header.preparedTitleWithCount`, `detail.prepareSolution`, `prepared.title`, `prepared.subtitle`, `prepared.formNote`, `prepared.labelPrefix`, `prepared.recentHeading`, `prepared.presetHeading`, `prepared.recentHint`, `prepared.presetHint`, `prepared.sidebarHint`, `prepared.sidebarEmptyHint`, `prepared.closeSidebar`, and `prepared.reprint` fail against the current copy.

- [ ] **Step 4: Update locale copy**

Update `frontend/src/i18n/locales/zh-TW.json`:

```json
"detail.prepareSolution": "用此化學品建立配製標籤",
"header.preparedTitleWithCount": "查看 {{count}} 筆近期配製標籤與重印",
"prepared.title": "建立配製溶液標籤",
"prepared.subtitle": "從目前選取的母化學品建立工作液、配製溶液或配製試劑標籤；危害資料會沿用母化學品。",
"prepared.formNote": "此流程不會重新計算混合物的 GHS 分類，也不會因濃度、溶劑、稀釋比例、配製人、日期或有效期限而推導、降低、弱化或修改危害。標籤會以母化學品危害資料加上你輸入的欄位註記；使用前請以官方安全資料表（SDS）、供應商標籤與所在地規範為準。",
"prepared.labelPrefix": "配製自",
```

Update `frontend/src/i18n/locales/en.json`:

```json
"detail.prepareSolution": "Create prepared label from this chemical",
"header.preparedTitleWithCount": "View {{count}} recent prepared labels and reprint",
"prepared.title": "Create prepared solution label",
"prepared.subtitle": "Create a label for a working solution, prepared solution, or prepared reagent from the selected parent chemical. Hazard data is copied from the parent.",
"prepared.formNote": "This workflow does not re-classify the mixture and does not infer, reduce, weaken, or modify hazards from concentration, solvent, dilution, operator, date, or expiry fields. The label uses the parent chemical's hazard data plus the label notes you enter. Verify against the official SDS, supplier label, and local rules before use.",
```

- [ ] **Step 5: Re-run the i18n runtime test**

Run from `frontend/`:

```bash
npm test -- --runInBand src/i18n/__tests__/i18n.test.js
```

Expected result: all tests in `i18n.test.js` pass.

## Task 3: Sidebar Explains Where Creation Starts And What Reprint Does

**Files:**
- Modify: `frontend/src/components/PreparedSidebar.jsx`
- Modify: `frontend/src/components/__tests__/PreparedSidebar.test.js`
- Modify: `frontend/src/i18n/locales/zh-TW.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Pin the empty-state hint surface in the sidebar test**

Extend the existing "renders an empty state" test in `frontend/src/components/__tests__/PreparedSidebar.test.js`:

```jsx
expect(screen.getByText("prepared.sidebarTitle")).toBeInTheDocument();
expect(screen.getByText("prepared.sidebarEmpty")).toBeInTheDocument();
expect(screen.getByText("prepared.sidebarEmptyHint")).toBeInTheDocument();
expect(screen.getByTestId("close-prepared-sidebar-btn")).toHaveAttribute(
  "aria-label",
  "prepared.closeSidebar"
);
```

- [ ] **Step 2: Add a populated-state reprint hint test**

Add this test to `frontend/src/components/__tests__/PreparedSidebar.test.js`:

```jsx
it("explains that reprint refreshes parent data before print review", () => {
  render(
    <PreparedSidebar
      recents={[makeRecent()]}
      onClose={jest.fn()}
      onClearRecents={jest.fn()}
      onReprint={jest.fn()}
    />
  );

  expect(screen.getByText("prepared.sidebarHint")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the sidebar test and confirm the populated hint fails**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/PreparedSidebar.test.js
```

Expected failure before implementation:

```text
Unable to find an element with the text: prepared.sidebarHint
```

- [ ] **Step 4: Render a persistent populated-state sidebar hint**

In `frontend/src/components/PreparedSidebar.jsx`, replace the sticky header block with this shape so the hint appears only when saved records exist:

```jsx
<div className="sticky top-0 border-b border-slate-200 bg-white p-4">
  <div className="flex items-center justify-between">
    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
      <FlaskConical className="h-5 w-5 text-blue-700" />
      {t("prepared.sidebarTitle")}
    </h2>
    <div className="flex gap-2">
      {recents.length > 0 && (
        <button
          onClick={onClearRecents}
          className="text-sm font-medium text-red-600 hover:text-red-700"
          data-testid="clear-prepared-recents-btn"
        >
          {t("prepared.clearAll")}
        </button>
      )}
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700"
        data-testid="close-prepared-sidebar-btn"
        aria-label={t("prepared.closeSidebar")}
        title={t("prepared.closeSidebar")}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
  {recents.length > 0 ? (
    <p className="mt-2 text-xs leading-relaxed text-slate-500">
      {t("prepared.sidebarHint")}
    </p>
  ) : null}
</div>
```

- [ ] **Step 5: Update sidebar copy in both locale files**

Update `frontend/src/i18n/locales/zh-TW.json`:

```json
"prepared.sidebarHint": "重印會重新取得母化學品資料並開啟列印確認；列印前請再確認濃度、溶劑與日期資訊。",
"prepared.sidebarEmpty": "還沒有近期配製標籤",
"prepared.sidebarEmptyHint": "先搜尋母化學品，從詳細資料建立配製溶液標籤；完成後可在這裡用最新的母化學品危害資料重印。",
"prepared.closeSidebar": "關閉近期配製標籤",
```

Update `frontend/src/i18n/locales/en.json`:

```json
"prepared.sidebarHint": "Reprint refreshes the parent chemical data and opens print review; confirm concentration, solvent, and dates before printing.",
"prepared.sidebarEmpty": "No recent prepared labels yet",
"prepared.sidebarEmptyHint": "Search for a parent chemical first, then create a prepared-solution label from its detail view. After that, reprint here with fresh parent hazard data.",
"prepared.closeSidebar": "Close recent prepared labels",
```

- [ ] **Step 6: Re-run the sidebar and i18n tests**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/PreparedSidebar.test.js src/i18n/__tests__/i18n.test.js
```

Expected result: both test files pass.

## Task 4: Modal Distinguishes Recents, Saved Recipes, And Safety Note

**Files:**
- Modify: `frontend/src/components/__tests__/PrepareSolutionModal.test.js`
- Modify: `frontend/src/i18n/locales/zh-TW.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Add a modal copy-surface test**

Add this test after the existing parent summary tests in `frontend/src/components/__tests__/PrepareSolutionModal.test.js`:

```jsx
it("surfaces parent creation, recipe-only presets, recent prefill, and safety note copy", () => {
  render(
    <PrepareSolutionModal
      parent={baseParent}
      recents={[
        {
          createdAt: "2026-04-16T10:00:00.000Z",
          parentCas: "64-17-5",
          parentNameEn: "Ethanol",
          parentNameZh: "乙醇",
          concentration: "10%",
          solvent: "Water",
          preparedBy: "A. Chen",
          preparedDate: "2026-04-16",
          expiryDate: null,
        },
      ]}
      presets={[
        {
          id: "ethanol-water-10",
          parentCas: "64-17-5",
          parentNameEn: "Ethanol",
          parentNameZh: "乙醇",
          concentration: "10%",
          solvent: "Water",
          presetName: "10% ethanol",
          updatedAt: "2026-04-16T10:00:00.000Z",
        },
      ]}
      onSubmit={jest.fn()}
      onClose={jest.fn()}
      onSavePreset={jest.fn()}
    />
  );

  expect(screen.getByText("prepared.title")).toBeInTheDocument();
  expect(screen.getByText("prepared.subtitle")).toBeInTheDocument();
  expect(screen.getByText("prepared.presetHeading")).toBeInTheDocument();
  expect(screen.getByText("prepared.presetHint")).toBeInTheDocument();
  expect(screen.getByText("prepared.presetBadge")).toBeInTheDocument();
  expect(screen.getByText("prepared.saveAsPreset")).toBeInTheDocument();
  expect(screen.getByText("prepared.presetName")).toBeInTheDocument();
  expect(screen.getByText("prepared.recentHeading")).toBeInTheDocument();
  expect(screen.getByText("prepared.recentHint")).toBeInTheDocument();
  expect(screen.getByTestId("prepare-solution-form-note")).toHaveTextContent(
    "prepared.formNote"
  );
});
```

- [ ] **Step 2: Run the modal test**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/PrepareSolutionModal.test.js
```

Expected result before locale updates: component-surface assertions pass because the test mock returns keys. This confirms the copy has a rendered surface before the exact translation is pinned in `i18n.test.js`.

- [ ] **Step 3: Update recent and recipe copy in both locale files**

Update `frontend/src/i18n/locales/zh-TW.json`:

```json
"prepared.recentHeading": "最近使用的配製紀錄 — 點擊帶入，可再確認後列印",
"prepared.presetHeading": "已儲存配方 — 只帶入濃度 / 溶劑",
"prepared.recentHint": "最近紀錄會帶入濃度、溶劑與配製人供你確認；配製日期會重設為今天，有效期限保持空白。",
"prepared.presetHint": "已儲存配方只保留濃度 / 溶劑，不帶入配製人、日期、有效期限，也不保存危害資料。",
"prepared.presetBadge": "配方",
"prepared.saveAsPreset": "儲存為配方",
"prepared.presetName": "配方名稱（選填）",
```

Update `frontend/src/i18n/locales/en.json`:

```json
"prepared.recentHeading": "Recent prepared records — click to prefill, then review before printing",
"prepared.presetHeading": "Saved recipes — reuse concentration / solvent only",
"prepared.recentHint": "Recent records prefill concentration, solvent, and operator for review; the prepared date resets to today and expiry stays blank.",
"prepared.presetHint": "Saved recipes keep only concentration / solvent. They do not carry operator, dates, expiry, or hazard data.",
"prepared.presetBadge": "Recipe",
"prepared.saveAsPreset": "Save as recipe",
"prepared.presetName": "Recipe name (optional)",
```

- [ ] **Step 4: Re-run modal and i18n tests**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/PrepareSolutionModal.test.js src/i18n/__tests__/i18n.test.js
```

Expected result: both test files pass.

## Task 5: Integration Gates Keep The Workflow Task-First

**Files:**
- Modify: `frontend/src/__tests__/personaTeachingSetup.integration.test.js`
- Keep unchanged unless a test failure requires otherwise: `frontend/src/__tests__/prepareSolution.integration.test.js`

- [ ] **Step 1: Add a targeted detail-entry assertion**

In `frontend/src/__tests__/personaTeachingSetup.integration.test.js`, add this assertion immediately after the existing wait for `detail-modal` in `openPrepareSolutionModal()`:

```jsx
expect(screen.getByTestId("prepare-solution-btn")).toHaveTextContent(
  "detail.prepareSolution"
);
```

This preserves the current mock-key style while ensuring the creation entry remains on the detail surface.

- [ ] **Step 2: Run the focused integration gates**

Run from `frontend/`:

```bash
npm test -- --runInBand src/__tests__/prepareSolution.integration.test.js src/__tests__/personaTeachingSetup.integration.test.js
```

Expected result: both integration files pass.

## Task 6: Verification And Documentation State

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md` only after the implementation is verified and the active slice state genuinely changes.

- [ ] **Step 1: Run the focused prepared-label test set**

Run from `frontend/`:

```bash
npm test -- --runInBand src/components/__tests__/Header.test.js src/components/__tests__/PreparedSidebar.test.js src/components/__tests__/PrepareSolutionModal.test.js src/i18n/__tests__/i18n.test.js src/__tests__/prepareSolution.integration.test.js src/__tests__/personaTeachingSetup.integration.test.js
```

Expected result: all listed test files pass.

- [ ] **Step 2: Run i18n parity**

Run from `frontend/`:

```bash
npm run test:i18n
```

Expected result:

```text
i18n parity OK
```

- [ ] **Step 3: Run build**

Run from `frontend/`:

```bash
npm run build
```

Expected result: Vite build exits 0 and writes the production bundle.

- [ ] **Step 4: Run docs/test drift check**

Run from `frontend/`:

```bash
npm run test:docs
```

Expected result:

```text
docs drift OK
```

- [ ] **Step 5: Run repository whitespace check**

Run from the repository root:

```bash
git diff --check
```

Expected result: exit code 0 with no whitespace errors.

- [ ] **Step 6: Update live queue state only if code implementation ships**

If the implementation completes and verification passes, update `NEXT_PRODUCT_WORK.md` to record:

```markdown
Latest closed concrete slice: the 2026-06-28 prepared-solution entry clarity
slice is closed. It clarified the header prepared control as recent/reprint
access, made the detail surface the clear creation entry for prepared-solution
labels, pinned bilingual copy for parent-hazard reuse and non-reclassification,
and verified the focused header/sidebar/modal/i18n/prepared-flow gates.
```

Keep `LAB_WORKFLOW_READINESS_ROADMAP.md` unchanged unless the product direction, guardrails, stop condition, or roadmap order changes.

- [ ] **Step 7: Check repository state before staging**

Run from the repository root:

```bash
git status --short --branch
```

Expected result: only files changed by this implementation are modified. The repository may already be ahead of `origin/main`; do not push unless the owner opens that deployment/push step.

- [ ] **Step 8: Commit exact intended files**

Stage only files changed by this implementation:

```bash
git add frontend/src/components/Header.jsx \
  frontend/src/components/PreparedSidebar.jsx \
  frontend/src/components/__tests__/Header.test.js \
  frontend/src/components/__tests__/PreparedSidebar.test.js \
  frontend/src/components/__tests__/PrepareSolutionModal.test.js \
  frontend/src/i18n/__tests__/i18n.test.js \
  frontend/src/i18n/locales/zh-TW.json \
  frontend/src/i18n/locales/en.json \
  NEXT_PRODUCT_WORK.md
git commit -m "Clarify prepared label entry workflow"
```

If `NEXT_PRODUCT_WORK.md` is not changed because the implementation is not yet shipped, omit it from `git add`.

## Post-Deploy Production QA

After the implementation is merged to `main`, pushed, and Zeabur deploys the expected SHA, run from `frontend/`:

```bash
export PRODUCTION_HEALTH_EXPECTED_GIT_SHA="$(git rev-parse HEAD)"
npm run qa:production-health
npm run qa:production-prepared
```

Expected proof:

- Production health reports the expected SHA.
- Prepared production QA opens the detail CTA, creates a prepared label, verifies the three print outputs remain available, uses a saved recipe/recent path, and captures report/screenshots.

## Review Checklist For Plan Reviewers

Reviewers should treat the plan as blocked if any item below fails:

- A first-time user can answer "Where do I start?" with "search a parent chemical, then use the detail CTA."
- The header prepared control cannot be mistaken for the creation entry.
- Recent records and saved recipes are visibly different.
- The wording states that user-entered fields do not infer, reduce, weaken, modify, or reclassify hazards.
- The plan does not change backend persistence, public API, localStorage schema, print output contract, or parent hazard-copy behavior.
- The tests pin real bilingual copy, not only mock i18n keys.
- Verification includes focused tests, `test:i18n`, `build`, `test:docs`, and `git diff --check`.
