# Print UX Label Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the reviewed print UX and small-label layout contract so the three public label outputs have explicit rules, tests, language-mode semantics, and a safer path toward modal UI polish.

**Architecture:** Start by locking the product contract in small pure utility modules and Jest tests, then connect the existing print renderer to those rules. UI copy and visual polish come after the renderer and planner can prove that QR and Identification small labels do not omit pictograms, do not exceed the two-label threshold, and treat English-only as an explicit physical print mode.

**Tech Stack:** React 19, Vite, Jest, Tailwind CSS, Radix UI, existing print renderer utilities in `frontend/src/utils/`.

---

## Design Source

Implement against:

- `docs/superpowers/specs/2026-06-14-print-ux-label-layout-decision-design.md`
- `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`
- `PRINT_LABEL_CONTRACT.md`

Current resolved product decisions:

- Complete A4/Letter is the only complete primary label output.
- Responsible profile belongs only to Complete A4/Letter labels.
- QR small labels target one label in normal cases and allow at most two labels.
- Identification small labels target one label for nearly all cases and allow at most two labels.
- Both small-label layouts should be able to handle roughly six recognizable GHS pictograms when identity remains readable.
- Small-label limits are recovery thresholds, never pictogram truncation limits.
- English-only is an explicit user-selected physical print mode.

## File Structure

Planned files and responsibilities:

- Create `frontend/src/utils/printOutputContract.js`
  - Own public output IDs, small-label continuation thresholds, first-label pictogram targets, and forbidden content policy.
  - Pure functions only; no React, DOM, or i18n dependencies.

- Create `frontend/src/utils/__tests__/printOutputContract.test.js`
  - Pin the product contract independent of renderer details.

- Modify `frontend/src/utils/printRenderHelpers.js`
  - Use `printOutputContract.js` for compact pictogram capacities and small-label continuation limits.

- Modify `frontend/src/utils/__tests__/printLabels.test.js`
  - Pin that QR and Identification small labels target six pictograms on a first label, never exceed two labels, and never omit available pictograms when within the limit.

- Modify `frontend/src/utils/__tests__/printAcceptanceMatrix.test.js`
  - Add or adjust acceptance cases for English-only physical labels and two-label caps.

- Modify `frontend/src/utils/ghsText.js`
  - Clarify English-only name rendering so small labels can intentionally suppress Chinese names while missing Chinese remains a UI data-quality issue.

- Modify `frontend/src/components/LabelPrintModal.jsx`
  - Task 5 exposes language mode and reorganizes the first-layer modal summary.

- Modify `frontend/src/locales/*.json`
  - Task 5 adds warmer print UX copy and language-mode labels.

## Task 1: Create Print Output Contract Module

**Files:**
- Create: `frontend/src/utils/printOutputContract.js`
- Create: `frontend/src/utils/__tests__/printOutputContract.test.js`

- [ ] **Step 1: Write the failing contract tests**

Create `frontend/src/utils/__tests__/printOutputContract.test.js`:

```js
import {
  PRINT_OUTPUT_IDS,
  SMALL_LABEL_CONTINUATION_POLICY,
  getSmallLabelContinuationPolicy,
  getCompactPictogramCapacity,
  requiresSmallLabelRecovery,
  validateSmallLabelContinuationSet,
} from "@/utils/printOutputContract";

const pictograms = (count) =>
  Array.from({ length: count }, (_, index) => ({ code: `GHS0${index + 1}` }));

describe("printOutputContract", () => {
  it("pins the three public output ids", () => {
    expect(Object.values(PRINT_OUTPUT_IDS)).toEqual([
      "complete",
      "qrSupplement",
      "quickId",
    ]);
  });

  it("pins strict small-label continuation targets", () => {
    expect(SMALL_LABEL_CONTINUATION_POLICY.qrSupplement).toMatchObject({
      targetLabels: 1,
      maxLabels: 2,
      firstLabelPictogramTarget: 6,
    });
    expect(SMALL_LABEL_CONTINUATION_POLICY.quickId).toMatchObject({
      targetLabels: 1,
      maxLabels: 2,
      firstLabelPictogramTarget: 6,
    });
  });

  it("uses six pictograms as the first-label compact target", () => {
    expect(
      getCompactPictogramCapacity(
        { stockPreset: "brother-62mm-continuous", labelPurpose: "qrSupplement" },
        "qrcode",
        0,
      ),
    ).toBe(6);
    expect(
      getCompactPictogramCapacity(
        { stockPreset: "small-strip", labelPurpose: "quickId" },
        "icon",
        0,
      ),
    ).toBe(6);
  });

  it("marks third small-label pages as recovery instead of a normal path", () => {
    expect(requiresSmallLabelRecovery("qrSupplement", 1)).toBe(false);
    expect(requiresSmallLabelRecovery("qrSupplement", 2)).toBe(false);
    expect(requiresSmallLabelRecovery("qrSupplement", 3)).toBe(true);
    expect(requiresSmallLabelRecovery("quickId", 3)).toBe(true);
  });

  it("validates that small labels never omit pictograms within the accepted set", () => {
    const result = validateSmallLabelContinuationSet({
      outputId: "qrSupplement",
      sourcePictograms: pictograms(7),
      pages: [pictograms(6), pictograms(1)],
    });

    expect(result).toEqual({
      ok: true,
      pageCount: 2,
      missingCodes: [],
      overLimit: false,
    });
  });

  it("reports missing pictograms and over-limit continuation sets", () => {
    const result = validateSmallLabelContinuationSet({
      outputId: "quickId",
      sourcePictograms: pictograms(7),
      pages: [pictograms(3), pictograms(2), pictograms(1)],
    });

    expect(result).toEqual({
      ok: false,
      pageCount: 3,
      missingCodes: ["GHS04", "GHS07"],
      overLimit: true,
    });
  });

  it("returns no small-label policy for complete labels", () => {
    expect(getSmallLabelContinuationPolicy("complete")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `frontend/`:

```bash
npm test -- --runInBand printOutputContract.test.js
```

Expected result:

```text
FAIL src/utils/__tests__/printOutputContract.test.js
Cannot find module '@/utils/printOutputContract'
```

- [ ] **Step 3: Add the contract implementation**

Create `frontend/src/utils/printOutputContract.js`:

```js
export const PRINT_OUTPUT_IDS = Object.freeze({
  COMPLETE: "complete",
  QR_SUPPLEMENT: "qrSupplement",
  QUICK_ID: "quickId",
});

export const SMALL_LABEL_CONTINUATION_POLICY = Object.freeze({
  [PRINT_OUTPUT_IDS.QR_SUPPLEMENT]: Object.freeze({
    outputId: PRINT_OUTPUT_IDS.QR_SUPPLEMENT,
    targetLabels: 1,
    maxLabels: 2,
    firstLabelPictogramTarget: 6,
    continuationPictogramTarget: 6,
  }),
  [PRINT_OUTPUT_IDS.QUICK_ID]: Object.freeze({
    outputId: PRINT_OUTPUT_IDS.QUICK_ID,
    targetLabels: 1,
    maxLabels: 2,
    firstLabelPictogramTarget: 6,
    continuationPictogramTarget: 6,
  }),
});

export const getPrintOutputIdForLayout = (layout = {}, template) => {
  const resolvedTemplate = template || layout.template;
  if (layout.labelPurpose === PRINT_OUTPUT_IDS.QR_SUPPLEMENT || resolvedTemplate === "qrcode") {
    return PRINT_OUTPUT_IDS.QR_SUPPLEMENT;
  }
  if (layout.labelPurpose === PRINT_OUTPUT_IDS.QUICK_ID || resolvedTemplate === "icon") {
    return PRINT_OUTPUT_IDS.QUICK_ID;
  }
  return PRINT_OUTPUT_IDS.COMPLETE;
};

export const getSmallLabelContinuationPolicy = (outputId) =>
  SMALL_LABEL_CONTINUATION_POLICY[outputId] || null;

export const getCompactPictogramCapacity = (
  layout = {},
  template,
  pageIndex = 0,
) => {
  const outputId = getPrintOutputIdForLayout(layout, template);
  const policy = getSmallLabelContinuationPolicy(outputId);
  if (!policy) return 6;
  return pageIndex === 0
    ? policy.firstLabelPictogramTarget
    : policy.continuationPictogramTarget;
};

export const requiresSmallLabelRecovery = (outputId, pageCount) => {
  const policy = getSmallLabelContinuationPolicy(outputId);
  return Boolean(policy && Number(pageCount || 0) > policy.maxLabels);
};

const getPictogramCode = (pictogram) => String(pictogram?.code || "").trim();

export const validateSmallLabelContinuationSet = ({
  outputId,
  sourcePictograms = [],
  pages = [],
} = {}) => {
  const requiredCodes = sourcePictograms.map(getPictogramCode).filter(Boolean);
  const renderedCodes = pages.flat().map(getPictogramCode).filter(Boolean);
  const missingCodes = requiredCodes.filter(
    (code) => !renderedCodes.includes(code),
  );
  const pageCount = pages.length;
  const overLimit = requiresSmallLabelRecovery(outputId, pageCount);

  return {
    ok: missingCodes.length === 0 && !overLimit,
    pageCount,
    missingCodes,
    overLimit,
  };
};
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run from `frontend/`:

```bash
npm test -- --runInBand printOutputContract.test.js
```

Expected result:

```text
PASS src/utils/__tests__/printOutputContract.test.js
```

- [ ] **Step 5: Commit Task 1**

```bash
git add frontend/src/utils/printOutputContract.js frontend/src/utils/__tests__/printOutputContract.test.js
git commit -m "test: lock print output contract"
```

## Task 2: Connect Compact Pictogram Capacity To The Contract

**Files:**
- Modify: `frontend/src/utils/printRenderHelpers.js`
- Modify: `frontend/src/utils/__tests__/printLabels.test.js`
- Test: `frontend/src/utils/__tests__/printOutputContract.test.js`
- Test: `frontend/src/utils/__tests__/printLabels.test.js`

- [ ] **Step 1: Add renderer tests for six first-label pictograms and two-label maximum**

Add tests near the existing QR and quick-ID print tests in `frontend/src/utils/__tests__/printLabels.test.js`:

```js
it("keeps six QR small-label pictograms on the first 62 mm label", () => {
  const sixPictogramChemical = {
    ...mockChemical,
    ghs_pictograms: [
      { code: "GHS01" },
      { code: "GHS02" },
      { code: "GHS03" },
      { code: "GHS04" },
      { code: "GHS05" },
      { code: "GHS06" },
    ],
  };

  const preview = buildPrintPreviewDocument(
    [sixPictogramChemical],
    {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "both",
    },
    {},
    {},
    {},
    {},
    { mode: "label" },
  );

  expect(preview.model.expandedLabels).toHaveLength(1);
  expect(preview.fragmentHtml.match(/alt="GHS0[1-6]"/g)).toHaveLength(6);
  expect(preview.fragmentHtml).toContain("qrcode-img");
});

it("keeps six Identification small-label pictograms on one label", () => {
  const sixPictogramChemical = {
    ...mockChemical,
    ghs_pictograms: [
      { code: "GHS01" },
      { code: "GHS02" },
      { code: "GHS03" },
      { code: "GHS04" },
      { code: "GHS05" },
      { code: "GHS06" },
    ],
  };

  const preview = buildPrintPreviewDocument(
    [sixPictogramChemical],
    {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
    },
    {},
    {},
    {},
    {},
    { mode: "label" },
  );

  expect(preview.model.expandedLabels).toHaveLength(1);
  expect(preview.fragmentHtml.match(/alt="GHS0[1-6]"/g)).toHaveLength(6);
  expect(preview.fragmentHtml).not.toContain("qrcode-img");
});
```

- [ ] **Step 2: Run the focused tests and confirm the new assertions fail if capacity is still five**

Run from `frontend/`:

```bash
npm test -- --runInBand printLabels.test.js --testNamePattern="six"
```

Expected result before implementation:

```text
FAIL src/utils/__tests__/printLabels.test.js
Expected length: 1
Received length: 2
```

- [ ] **Step 3: Replace local capacity literals with the contract function**

Modify `frontend/src/utils/printRenderHelpers.js`:

```js
import i18n from "@/i18n";
import {
  getCompactPictogramCapacity as getContractCompactPictogramCapacity,
} from "@/utils/printOutputContract";
```

Replace the current `getCompactPictogramCapacity` body with:

```js
export const getCompactPictogramCapacity = (
  layout = {},
  template,
  pageIndex = 0,
) => getContractCompactPictogramCapacity(layout, template, pageIndex);
```

- [ ] **Step 4: Run the focused tests**

Run from `frontend/`:

```bash
npm test -- --runInBand printOutputContract.test.js printLabels.test.js --testNamePattern="six|printOutputContract"
```

Expected result:

```text
PASS src/utils/__tests__/printOutputContract.test.js
PASS src/utils/__tests__/printLabels.test.js
```

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/utils/printRenderHelpers.js frontend/src/utils/__tests__/printLabels.test.js
git commit -m "fix: apply small label pictogram capacity contract"
```

## Task 3: Lock English-Only As A Physical Print Mode

**Files:**
- Modify: `frontend/src/utils/ghsText.js`
- Modify: `frontend/src/utils/__tests__/printAcceptanceMatrix.test.js`
- Modify: `frontend/src/utils/__tests__/printLabels.test.js`

- [ ] **Step 1: Add a regression test for English-only QR physical output**

In `frontend/src/utils/__tests__/printAcceptanceMatrix.test.js`, update the QR small-label language case so `nameDisplay: "en"` suppresses trusted Chinese in the physical fragment:

```js
it("renders English-only QR small labels as a physical print mode", () => {
  const preview = previewLabel(hydrochloricAcid, {
    labelPurpose: "qrSupplement",
    template: "qrcode",
    stockPreset: "brother-62mm-continuous",
    nameDisplay: "en",
    colorMode: "bw",
  }, {});

  expect(preview.fragmentHtml).toContain("label-kind-qr-supplement");
  expect(preview.fragmentHtml).toContain("Hydrochloric Acid");
  expect(preview.fragmentHtml).not.toContain(hydrochloricAcid.name_zh);
  expect(preview.fragmentHtml).toContain("qrcode-img");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails if current QR ignores `nameDisplay`**

Run from `frontend/`:

```bash
npm test -- --runInBand printAcceptanceMatrix.test.js --testNamePattern="English-only QR"
```

Expected result before implementation:

```text
FAIL src/utils/__tests__/printAcceptanceMatrix.test.js
Expected substring not found to be absent
```

- [ ] **Step 3: Update small identity rendering to honor `resolveNameDisplayForChemical`**

Modify `renderSmallIdentitySection` in `frontend/src/utils/printLabels.js`:

```js
const renderSmallIdentitySection = (chemical, effectiveChem, model) => {
  const nameDisplay = resolveNameDisplayForChemical(effectiveChem, model);
  const englishName =
    effectiveChem.name_en || effectiveChem.name || effectiveChem.cas_number || "";
  const chineseName = resolvePrintableChineseName(effectiveChem);
  const continuation = getContinuationMeta(chemical);
  const englishNameHtml =
    nameDisplay === "en" || nameDisplay === "both"
      ? `<div class="small-name-en">${escapeHtml(englishName)}</div>`
      : "";
  const chineseNameHtml =
    (nameDisplay === "zh" || nameDisplay === "both") && chineseName
      ? `<div class="small-name-zh">${escapeHtml(chineseName)}</div>`
      : "";
  const fallbackNameHtml =
    !englishNameHtml && !chineseNameHtml
      ? `<div class="small-name-en">${escapeHtml(englishName || chineseName)}</div>`
      : "";

  return `<div class="small-identity${getIdentityDensityClass(effectiveChem, model)}">
    <div class="small-cas">CAS ${escapeHtml(effectiveChem.cas_number || "")}</div>
    ${englishNameHtml}
    ${chineseNameHtml}
    ${fallbackNameHtml}
    ${renderContinuationBadge(continuation, model)}
  </div>`;
};
```

- [ ] **Step 4: Run language-focused print tests**

Run from `frontend/`:

```bash
npm test -- --runInBand printAcceptanceMatrix.test.js printLabels.test.js --testNamePattern="English-only|QR small|small labels"
```

Expected result:

```text
PASS src/utils/__tests__/printAcceptanceMatrix.test.js
PASS src/utils/__tests__/printLabels.test.js
```

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/src/utils/printLabels.js frontend/src/utils/__tests__/printAcceptanceMatrix.test.js frontend/src/utils/__tests__/printLabels.test.js
git commit -m "fix: honor english-only small label print mode"
```

## Task 4: Add Small-Label Recovery State To Planning

**Files:**
- Modify: `frontend/src/utils/printOutputPlanner.js`
- Modify: `frontend/src/utils/__tests__/printOutputPlanner.test.js`

- [ ] **Step 1: Add tests for third-label recovery**

Add a test in `frontend/src/utils/__tests__/printOutputPlanner.test.js`:

```js
it("requires recovery when a small-label output would need a third label", () => {
  const layout = resolvePrintLayoutConfig({
    labelPurpose: "qrSupplement",
    template: "qrcode",
    stockPreset: "brother-62mm-continuous",
    nameDisplay: "both",
  });
  const plan = buildPrintOutputPlan({
    selectedForLabel: [{
      cas_number: "9000-00-0",
      name_en: "Crowded pictogram sample",
      name_zh: "多圖示樣品",
      ghs_pictograms: Array.from({ length: 13 }, (_, index) => ({
        code: `GHS${String(index + 1).padStart(2, "0")}`,
      })),
    }],
    layout,
    resolvedLabProfile: {},
    locale: "zh-TW",
  });

  expect(plan.canPrint).toBe(false);
  expect(plan.recoveryActions).toEqual(
    expect.arrayContaining(["use-english-only", "use-complete-label"]),
  );
});
```

- [ ] **Step 2: Run the planner test and confirm it fails**

Run from `frontend/`:

```bash
npm test -- --runInBand printOutputPlanner.test.js --testNamePattern="third label"
```

Expected result before implementation:

```text
FAIL src/utils/__tests__/printOutputPlanner.test.js
Expected: false
Received: true
```

- [ ] **Step 3: Implement recovery using `requiresSmallLabelRecovery`**

In `frontend/src/utils/printOutputPlanner.js`, import:

```js
import {
  getPrintOutputIdForLayout,
  requiresSmallLabelRecovery,
} from "@/utils/printOutputContract";
import { splitCompactPictograms } from "@/utils/printRenderHelpers";
```

After resolving the layout and selected item content, compute:

```js
const outputId = getPrintOutputIdForLayout(layout, layout.template);
const smallLabelPageCounts = selectedForLabel.map((chemical) =>
  splitCompactPictograms(
    chemical.ghs_pictograms || [],
    layout,
    layout.template,
  ).length,
);
const exceedsSmallLabelLimit = smallLabelPageCounts.some((count) =>
  requiresSmallLabelRecovery(outputId, count),
);
```

When `exceedsSmallLabelLimit` is true, return a blocked/recovery state with:

```js
recoveryActions: ["use-english-only", "use-complete-label"],
recoveryReason: "small-label-continuation-limit",
```

- [ ] **Step 4: Run planner tests**

Run from `frontend/`:

```bash
npm test -- --runInBand printOutputPlanner.test.js printAcceptanceMatrix.test.js
```

Expected result:

```text
PASS src/utils/__tests__/printOutputPlanner.test.js
PASS src/utils/__tests__/printAcceptanceMatrix.test.js
```

- [ ] **Step 5: Commit Task 4**

```bash
git add frontend/src/utils/printOutputPlanner.js frontend/src/utils/__tests__/printOutputPlanner.test.js
git commit -m "fix: block overlong small label continuation sets"
```

## Task 5: Reorganize Modal Copy And First-Layer Summary

**Files:**
- Modify: `frontend/src/components/LabelPrintModal.jsx`
- Modify: `frontend/src/locales/en.json`
- Modify: `frontend/src/locales/zh-TW.json`
- Modify: `frontend/src/components/__tests__/LabelPrintModal.test.js`

- [ ] **Step 1: Add tests for warmer safety copy**

Add expectations in `frontend/src/components/__tests__/LabelPrintModal.test.js`:

```js
expect(screen.getByText(/補充小標籤，不能取代完整主標/)).toBeInTheDocument();
expect(screen.getByText(/列印前核對/)).toBeInTheDocument();
```

- [ ] **Step 2: Run modal tests and confirm missing copy fails**

Run from `frontend/`:

```bash
npm test -- --runInBand LabelPrintModal.test.js --testNamePattern="supplemental|profile"
```

Expected result before implementation:

```text
FAIL src/components/__tests__/LabelPrintModal.test.js
Unable to find an element with the text
```

- [ ] **Step 3: Add i18n copy**

Add keys:

```json
{
  "label.printCheck": "列印前核對",
  "label.supplementalBoundary": "補充小標籤，不能取代完整主標、SDS、供應商標籤或當地規範要求。",
  "label.completeReferenceBoundary": "完整主標需要負責單位名稱、電話與地址。補齊後才能列印此參考主標；使用前仍需依 SDS、供應商標籤與當地規範確認。",
  "label.languageMode": "標籤語言",
  "label.languageBilingual": "繁中 + English",
  "label.languageEnglishOnly": "English only"
}
```

- [ ] **Step 4: Wire the copy into the modal summary**

Use existing `tx()` translation helper near the selected output summary:

```jsx
<div className="print-check-summary">
  <p className="print-check-title">{tx("label.printCheck", "列印前核對")}</p>
  {isSupplementalOutput ? (
    <p>{tx("label.supplementalBoundary", "補充小標籤，不能取代完整主標、SDS、供應商標籤或當地規範要求。")}</p>
  ) : (
    <p>{tx("label.completeReferenceBoundary", "完整主標需要負責單位名稱、電話與地址。補齊後才能列印此參考主標；使用前仍需依 SDS、供應商標籤與當地規範確認。")}</p>
  )}
</div>
```

- [ ] **Step 5: Run tests**

Run from `frontend/`:

```bash
npm test -- --runInBand LabelPrintModal.test.js
npm run test:i18n
```

Expected result:

```text
PASS src/components/__tests__/LabelPrintModal.test.js
No i18n parity errors
```

- [ ] **Step 6: Commit Task 5**

```bash
git add frontend/src/components/LabelPrintModal.jsx frontend/src/locales frontend/src/components/__tests__/LabelPrintModal.test.js
git commit -m "feat: clarify print modal safety summary"
```

## Task 6: Full Verification

**Files:**
- No new file changes expected unless tests reveal a regression.

- [ ] **Step 1: Run print contract tests**

Run from `frontend/`:

```bash
npm run test:print-contract
```

Expected result:

```text
PASS
```

- [ ] **Step 2: Run docs and build checks**

Run from the repo root and `frontend/`:

```bash
git diff --check
cd frontend && npm run test:i18n && npm run build
```

Expected result:

```text
No whitespace errors
No i18n parity errors
vite build completes
```

- [ ] **Step 3: Confirm no verification-only changes remain**

Run from the repo root:

```bash
git status --short
```

Expected result:

```text
```

If verification reveals a regression, stop and create a new focused fix task
before committing. Do not create an empty commit for a clean verification run.
