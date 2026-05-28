jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

jest.mock("@/constants/ghs", () => {
  const image = (code) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="18" y="18" width="64" height="64" fill="#fff" stroke="#ef2b2d" stroke-width="9" transform="rotate(45 50 50)"/>
        <text x="50" y="56" text-anchor="middle" font-size="18" font-family="Arial" font-weight="700">${code}</text>
      </svg>`,
    )}`;

  return {
    GHS_IMAGES: {
      GHS01: image("GHS01"),
      GHS02: image("GHS02"),
      GHS03: image("GHS03"),
      GHS04: image("GHS04"),
      GHS05: image("GHS05"),
      GHS06: image("GHS06"),
      GHS07: image("GHS07"),
      GHS08: image("GHS08"),
      GHS09: image("GHS09"),
    },
  };
});

import fs from "node:fs";
import path from "node:path";
import {
  PRINT_QA_MATRIX,
  PRINT_QA_PROFILE,
  buildPrintQaCaseResult,
  buildPrintQaMatrixReport,
  resolvePrintQaCaseChemical,
} from "@/utils/printQaMatrix";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
} from "@/utils/printOutputPlanner";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  buildBatchPrintPlan,
  buildBatchPrintableItems,
} from "@/utils/printBatchPlanner";
import { batchPrintMixedFixture50 } from "@/utils/testFixtures/batchPrintFixtures";
import {
  buildPrintDocument,
  buildPrintPreviewDocument,
} from "@/utils/printLabels";

const getPictogramCodes = (chemical = {}) =>
  (chemical.ghs_pictograms || [])
    .map((pictogram) => pictogram?.code)
    .filter(Boolean);

const uniqueSorted = (values = []) => [...new Set(values.filter(Boolean))].sort();

const maybeWriteReport = (report) => {
  const outputPath =
    process.env.PRINT_QA_REPORT_PATH || "build/print-qa-report.json";
  if (!outputPath) return;

  const absolutePath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  // Keep this visible when running `npm run qa:print-report`.
  // eslint-disable-next-line no-console
  console.log(`Print QA report written to ${absolutePath}`);
};

const maybeWritePreviewArtifacts = () => {
  const outputDir = process.env.PRINT_QA_PREVIEW_DIR;
  if (!outputDir) return;

  const absoluteDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(absoluteDir, { recursive: true });

  PRINT_QA_MATRIX.forEach((testCase) => {
    const chemical = resolvePrintQaCaseChemical(testCase);
    const preview = buildPrintPreviewDocument(
      [chemical],
      testCase.labelConfig,
      {},
      {},
      { [chemical.cas_number]: 1 },
      PRINT_QA_PROFILE,
      { mode: "label", previewZoom: "fit" },
    );
    fs.writeFileSync(path.join(absoluteDir, `${testCase.id}.html`), preview.html);
  });

  fs.writeFileSync(
    path.join(absoluteDir, "index.json"),
    `${JSON.stringify(
      PRINT_QA_MATRIX.map((testCase) => ({
        id: testCase.id,
        label: testCase.label,
        chemical: resolvePrintQaCaseChemical(testCase).cas_number,
        file: `${testCase.id}.html`,
      })),
      null,
      2,
    )}\n`,
  );

  // Keep this visible when running `npm run qa:print-report`.
  // eslint-disable-next-line no-console
  console.log(`Print QA previews written to ${absoluteDir}`);
};

const buildCompleteBatchA4Bundle = () => {
  const completeBatchPlan = buildBatchPrintPlan({
    selectedForLabel: batchPrintMixedFixture50,
    layout: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    purpose: BATCH_PRINT_PURPOSE.COMPLETE,
    resolvedLabProfile: PRINT_QA_PROFILE,
    locale: "zh-TW",
  });
  const completeBatchItems = buildBatchPrintableItems(completeBatchPlan);
  const completeBatchBundle = buildPrintDocument(
    completeBatchItems,
    completeBatchPlan.layout,
    {},
    {},
    Object.fromEntries(
      completeBatchItems.map((chemical) => [chemical.cas_number, 1]),
    ),
    PRINT_QA_PROFILE,
  );

  return { completeBatchBundle, completeBatchItems };
};

const maybeWritePrintArtifacts = () => {
  const outputDir = process.env.PRINT_QA_PRINT_HTML_DIR;
  if (!outputDir) return;

  const absoluteDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(absoluteDir, { recursive: true });

  const index = PRINT_QA_MATRIX.filter(
    (testCase) => testCase.expected?.canPrint !== false,
  ).map((testCase) => {
    const chemical = resolvePrintQaCaseChemical(testCase);
    const documentBundle = buildPrintDocument(
      [chemical],
      testCase.labelConfig,
      {},
      testCase.customLabelFields || {},
      { [chemical.cas_number]: 1 },
      PRINT_QA_PROFILE,
    );
    const caseResult = buildPrintQaCaseResult({
      testCase,
      chemical,
      labProfile: PRINT_QA_PROFILE,
    });
    const file = `${testCase.id}.html`;
    fs.writeFileSync(path.join(absoluteDir, file), documentBundle.html);
    return {
      id: testCase.id,
      label: testCase.label,
      chemical: chemical.cas_number,
      file,
      expectedLabelKind: testCase.expected?.labelKind || "",
      expectedPictograms: (chemical.ghs_pictograms || [])
        .map((pictogram) => pictogram.code)
        .filter(Boolean),
      expectedHasQr: Boolean(caseResult.expected?.hasQr),
      expectedStockPreset: testCase.expected?.stockPreset || "",
      expectedMinTotalLabels: testCase.expected?.minPrintTotalLabels || 1,
      expectedPrintMinPictogramSidePx:
        caseResult.handoffExpectation.expectedPrintMinPictogramSidePx,
      expectedPrintMinQrSidePx:
        caseResult.handoffExpectation.expectedPrintMinQrSidePx,
      expectedRequiredIdentityText:
        caseResult.handoffExpectation.requiredIdentityText || "",
      expectedRequiredIdentityTexts:
        caseResult.chemical.expectedRequiredIdentityTexts || [],
      expectedForbiddenIdentityTexts:
        caseResult.chemical.expectedForbiddenIdentityTexts || [],
    };
  });

  const quickIdBatchPlan = buildBatchPrintPlan({
    selectedForLabel: batchPrintMixedFixture50,
    layout: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "color",
    },
    purpose: BATCH_PRINT_PURPOSE.QUICK_ID,
    resolvedLabProfile: PRINT_QA_PROFILE,
    locale: "en-US",
  });
  const quickIdBatchItems = buildBatchPrintableItems(quickIdBatchPlan);
  const quickIdBatchBundle = buildPrintDocument(
    quickIdBatchItems,
    quickIdBatchPlan.layout,
    {},
    {},
    Object.fromEntries(
      quickIdBatchItems.map((chemical) => [chemical.cas_number, 1]),
    ),
    PRINT_QA_PROFILE,
  );
  const quickIdBatchFile = "batch-quick-id-50-small-strip.html";
  fs.writeFileSync(
    path.join(absoluteDir, quickIdBatchFile),
    quickIdBatchBundle.html,
  );
  index.push({
    id: "batch-quick-id-50-small-strip",
    label: "50-item fixed-stock Quick ID batch",
    chemical: "batchPrintMixedFixture50",
    file: quickIdBatchFile,
    expectedLabelKind: "quick-id",
    expectedLabelKinds: ["quick-id"],
    expectedPictograms: uniqueSorted(
      quickIdBatchItems.flatMap((chemical) => getPictogramCodes(chemical)),
    ),
    expectedBatchCategories: [BATCH_PRINT_ITEM_CATEGORY.READY],
    expectedHasQr: false,
    expectedStockPreset: "small-strip",
    expectedMinTotalLabels: quickIdBatchItems.length,
    expectedPrintMinPictogramSidePx: 26,
    expectedPrintMinQrSidePx: 0,
    expectedRequiredIdentityText: "",
    expectedRequiredIdentityTexts: ["Hydrochloric Acid", "Ethanol"],
    expectedForbiddenIdentityTexts: ["Urea", "Temporary Upstream Failure Reagent"],
  });

  const qrBatchPlan = buildBatchPrintPlan({
    selectedForLabel: batchPrintMixedFixture50,
    layout: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "both",
      colorMode: "color",
    },
    purpose: BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
    resolvedLabProfile: PRINT_QA_PROFILE,
    locale: "zh-TW",
  });
  const qrBatchItems = buildBatchPrintableItems(qrBatchPlan);
  const qrBatchBundle = buildPrintDocument(
    qrBatchItems,
    qrBatchPlan.layout,
    {},
    {},
    Object.fromEntries(qrBatchItems.map((chemical) => [chemical.cas_number, 1])),
    PRINT_QA_PROFILE,
  );
  const qrBatchFile = "batch-qr-50-brother-62mm.html";
  fs.writeFileSync(path.join(absoluteDir, qrBatchFile), qrBatchBundle.html);
  index.push({
    id: "batch-qr-50-brother-62mm",
    label: "50-item fixed-stock QR small-label batch",
    chemical: "batchPrintMixedFixture50",
    file: qrBatchFile,
    expectedLabelKind: "qr-supplement",
    expectedLabelKinds: ["qr-supplement"],
    expectedPictograms: uniqueSorted(
      qrBatchItems.flatMap((chemical) => getPictogramCodes(chemical)),
    ),
    expectedBatchCategories: [BATCH_PRINT_ITEM_CATEGORY.READY],
    expectedHasQr: true,
    expectedStockPreset: "brother-62mm-continuous",
    expectedMinTotalLabels: qrBatchItems.length,
    expectedPrintMinPictogramSidePx: 26,
    expectedPrintMinQrSidePx: 48,
    expectedRequiredIdentityText: "",
    expectedRequiredIdentityTexts: ["Hydrochloric Acid", "Five Pictogram"],
    expectedForbiddenIdentityTexts: ["Urea", "Temporary Upstream Failure Reagent"],
  });

  const { completeBatchBundle, completeBatchItems } = buildCompleteBatchA4Bundle();
  expect(completeBatchBundle.model.expandedLabels.length).toBeLessThanOrEqual(
    completeBatchItems.length + 4,
  );
  const completeBatchFile = "batch-a4-complete-50.html";
  fs.writeFileSync(path.join(absoluteDir, completeBatchFile), completeBatchBundle.html);
  index.push({
    id: "batch-a4-complete-50",
    label: "50-item fixed-stock A4 complete-label batch",
    chemical: "batchPrintMixedFixture50",
    file: completeBatchFile,
    expectedLabelKind: "complete-primary",
    expectedLabelKinds: ["complete-primary"],
    expectedPictograms: uniqueSorted(
      completeBatchItems.flatMap((chemical) => getPictogramCodes(chemical)),
    ),
    expectedBatchCategories: [BATCH_PRINT_ITEM_CATEGORY.READY],
    expectedHasQr: true,
    expectedStockPreset: "a4-primary",
    expectedMinTotalLabels: completeBatchItems.length,
    expectedPrintMinPictogramSidePx: 18,
    expectedPrintMinQrSidePx: 30,
    expectedRequiredIdentityText: "",
    expectedRequiredIdentityTexts: ["Hydrochloric Acid", "Ethanol"],
    expectedForbiddenIdentityTexts: ["Urea", "Temporary Upstream Failure Reagent"],
  });

  fs.writeFileSync(
    path.join(absoluteDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );

  // Keep this visible when running `npm run qa:print-report`.
  // eslint-disable-next-line no-console
  console.log(`Print QA print artifacts written to ${absoluteDir}`);
};

describe("print QA matrix report", () => {
  it("generates a passing machine-readable report for the production print matrix", () => {
    const report = buildPrintQaMatrixReport({
      ...(process.env.PRINT_QA_REPORT_GENERATED_AT
        ? { generatedAt: process.env.PRINT_QA_REPORT_GENERATED_AT }
        : {}),
    });

    maybeWriteReport(report);
    maybeWritePreviewArtifacts();
    maybeWritePrintArtifacts();

    expect(report.schemaVersion).toBe(1);
    expect(report.generatedAt).toEqual(expect.any(String));
    expect(report.chemicals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "hydrochloricAcid", cas: "7647-01-0" }),
        expect.objectContaining({ id: "ethanol", cas: "64-17-5" }),
        expect.objectContaining({ id: "sodiumHydroxide", cas: "1310-73-2" }),
        expect.objectContaining({ id: "nitrogen", cas: "7727-37-9" }),
        expect.objectContaining({ id: "zincOxide", cas: "1314-13-2" }),
        expect.objectContaining({ id: "boricAcid", cas: "10043-35-3" }),
        expect.objectContaining({ id: "longNameCorrosive", cas: "QA-LONG-001" }),
        expect.objectContaining({
          id: "preparedHydrochloricAcid",
          cas: "7647-01-0",
        }),
      ]),
    );
    expect(report.summary).toEqual({
      total: PRINT_QA_MATRIX.length,
      passed: PRINT_QA_MATRIX.length,
      failed: 0,
    });
    expect(report.productionBrowserQa).toMatchObject({
      targetUrl: "https://ghs-frontend.zeabur.app/",
      qaHandoffUrl: "https://ghs-frontend.zeabur.app/?qaPrintHandoff=1",
      requiredStatusElement: "ghs-print-qa-status",
      responsibleProfile: PRINT_QA_PROFILE,
    });
    expect(report.productionBrowserQa.requiredAttributes).toEqual(
      expect.arrayContaining([
        "data-status",
        "data-label-kind",
        "data-pictograms",
        "data-has-qr",
        "data-cas-numbers",
        "data-has-cas",
        "data-label-width-mm",
        "data-label-height-mm",
        "data-page-size",
        "data-color-mode",
        "data-name-display",
        "data-stock-preset",
        "data-support-chips",
      ]),
    );
    expect(report.productionBrowserQa.cases).toHaveLength(
      PRINT_QA_MATRIX.filter((testCase) => testCase.productionHandoff !== false)
        .length,
    );

    const byId = Object.fromEntries(
      report.cases.map((testCase) => [testCase.id, testCase]),
    );
    const browserCaseById = Object.fromEntries(
      report.productionBrowserQa.cases.map((testCase) => [
        testCase.id,
        testCase,
      ]),
    );
    const chemicalById = Object.fromEntries(
      report.chemicals.map((chemical) => [chemical.id, chemical]),
    );

    report.chemicals.forEach((chemical) => {
      expect(chemical.coverage).toEqual(
        expect.objectContaining({
          source: expect.any(String),
          rationale: expect.any(String),
          riskTags: expect.any(Array),
        }),
      );
      expect(chemical.coverage.riskTags.length).toBeGreaterThan(0);
    });

    const coveredStockPresets = new Set(
      report.cases.map((testCase) => testCase.expected.stockPreset),
    );
    [
      "small-strip",
      "small-rack",
      "medium-rack",
      "brother-62mm-continuous",
      "medium-bottle",
      "large-primary",
      "a4-primary",
      "letter-primary",
      "custom",
    ].forEach((stockPreset) => {
      expect(coveredStockPresets.has(stockPreset)).toBe(true);
    });

    report.cases.forEach((testCase) => {
      expect(testCase.actual.stockFit).toEqual(
        expect.objectContaining({
          stockPreset: testCase.expected.stockPreset,
          labelKind: testCase.expected.labelKind,
          labelWidthMm: expect.any(Number),
          labelHeightMm: expect.any(Number),
          expectedPrintMinPictogramSidePx: expect.any(Number),
          expectedPrintMinQrSidePx: expect.any(Number),
        }),
      );
      expect(
        testCase.handoffExpectation.expectedPrintMinPictogramSidePx,
      ).toBe(testCase.actual.stockFit.expectedPrintMinPictogramSidePx);
      expect(testCase.handoffExpectation.expectedPrintMinQrSidePx).toBe(
        testCase.actual.stockFit.expectedPrintMinQrSidePx,
      );
      if (testCase.expected.hasQr) {
        expect(testCase.actual.stockFit.expectedPrintMinQrSidePx).toBeGreaterThan(
          0,
        );
      }
    });

    report.productionBrowserQa.cases.forEach((testCase) => {
      expect(testCase.stockFit).toEqual(
        expect.objectContaining({
          stockPreset: testCase.expectedStockPreset,
          labelKind: testCase.expectedLabelKind,
          expectedPrintMinPictogramSidePx:
            testCase.expectedPrintMinPictogramSidePx,
          expectedPrintMinQrSidePx: testCase.expectedPrintMinQrSidePx,
        }),
      );
    });

    expect(byId["a4-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: true,
      casNumbers: ["7647-01-0"],
      labelWidthMm: 188,
      labelHeightMm: 268,
      pageSize: "A4",
      colorMode: "color",
      nameDisplay: "both",
    });
    expect(byId["a4-primary"].actual.hasFullPagePictograms).toBe(true);
    expect(byId["a4-primary"].actual.hasSummaries).toBe(false);
    expect(byId["a4-primary"].actual.contentPolicy).toMatchObject(
      byId["a4-primary"].expected.contentPolicy,
    );

    expect(byId["a4-primary-profile-blocked"]).toMatchObject({
      expected: expect.objectContaining({
        canPrint: false,
        planState: PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE,
        outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
        stockPreset: "a4-primary",
        template: "full",
        recoveryKind: "profile",
      }),
      actual: expect.objectContaining({
        canPrint: false,
        planState: PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE,
        outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
        stockPreset: "a4-primary",
        template: "full",
      }),
      handoffExpectation: expect.objectContaining({
        status: "blocked",
        labelKind: "complete-primary",
        stockPreset: "a4-primary",
        template: "full",
        recoveryKind: "profile",
      }),
    });
    expect(browserCaseById["a4-primary-profile-blocked"]).toMatchObject({
      expectedCanPrint: false,
      expectedPrintButtonEnabled: false,
      expectedRecoveryKind: "profile",
      responsibleProfile: {
        organization: "",
        phone: "",
        address: "",
      },
    });

    expect(byId["letter-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: true,
      casNumbers: ["7647-01-0"],
      labelWidthMm: 196,
      labelHeightMm: 250,
      pageSize: "Letter",
    });
    expect(byId["letter-primary"].actual.hasFullPagePictograms).toBe(true);

    expect(byId["a4-primary-zh-bw"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: true,
      casNumbers: ["7647-01-0"],
      pageSize: "A4",
      colorMode: "bw",
      nameDisplay: "both",
    });
    expect(byId["a4-primary-zh-bw"].actual.hasFullPagePictograms).toBe(true);
    expect(browserCaseById["a4-primary-zh-bw"]).toMatchObject({
      expectedColorMode: "bw",
      expectedNameDisplay: "both",
      expectedRequiredIdentityTexts: ["鹽酸", "Hydrochloric Acid"],
      expectedForbiddenIdentityTexts: [],
    });

    expect(byId["letter-primary-en-bw"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: true,
      casNumbers: ["7647-01-0"],
      pageSize: "Letter",
      colorMode: "bw",
      nameDisplay: "both",
    });
    expect(byId["letter-primary-en-bw"].actual.hasFullPagePictograms).toBe(true);
    expect(browserCaseById["letter-primary-en-bw"]).toMatchObject({
      expectedColorMode: "bw",
      expectedNameDisplay: "both",
      expectedRequiredIdentityTexts: ["鹽酸", "Hydrochloric Acid"],
      expectedForbiddenIdentityTexts: [],
    });

    expect(byId["ethylene-oxide-a4-primary-continuation"]).toMatchObject({
      chemical: expect.objectContaining({
        cas: "75-21-8",
        expectedPictograms: [
          "GHS02",
          "GHS04",
          "GHS05",
          "GHS06",
          "GHS07",
          "GHS08",
        ],
      }),
      expected: expect.objectContaining({
        canPrint: true,
        planState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
        minPrintTotalLabels: 2,
      }),
      actual: expect.objectContaining({
        canPrint: true,
        planState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
        hasFullPagePictograms: true,
      }),
      handoffExpectation: expect.objectContaining({
        status: "qa_handoff",
        labelKind: "complete-primary",
        stockPreset: "a4-primary",
        template: "full",
        hasQr: true,
      }),
    });
    expect(
      byId["ethylene-oxide-a4-primary-continuation"].actual.printTotalLabels,
    ).toBeGreaterThanOrEqual(2);
    expect(browserCaseById["ethylene-oxide-a4-primary-continuation"]).toMatchObject({
      expectedCanPrint: true,
      expectedPrintButtonEnabled: true,
      expectedStatus: "qa_handoff",
      expectedPlanState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
      expectedLabelKind: "complete-primary",
      expectedStockPreset: "a4-primary",
      expectedPictograms: [
        "GHS02",
        "GHS04",
        "GHS05",
        "GHS06",
        "GHS07",
        "GHS08",
      ],
      expectedIdentityTexts: ["Ethylene Oxide", "75-21-8"],
      expectedRequiredIdentityTexts: ["Ethylene Oxide"],
      expectedMinTotalLabels: 2,
      expectedMinTotalPages: 2,
    });
    expect(
      byId["bromothiophene-a4-primary-packing-regression"],
    ).toMatchObject({
      chemical: expect.objectContaining({
        cas: "1003-09-4",
        expectedPictograms: ["GHS02", "GHS05", "GHS06", "GHS07"],
      }),
      expected: expect.objectContaining({
        canPrint: true,
        planState: PRINT_OUTPUT_PLAN_STATE.READY,
        printTotalLabels: 1,
      }),
      actual: expect.objectContaining({
        canPrint: true,
        planState: PRINT_OUTPUT_PLAN_STATE.READY,
        printTotalLabels: 1,
      }),
      handoffExpectation: expect.objectContaining({
        status: "qa_handoff",
        labelKind: "complete-primary",
        stockPreset: "a4-primary",
        template: "full",
        hasQr: true,
      }),
    });
    expect(
      browserCaseById["bromothiophene-a4-primary-packing-regression"],
    ).toMatchObject({
      expectedCanPrint: true,
      expectedPrintButtonEnabled: true,
      expectedStatus: "qa_handoff",
      expectedPlanState: PRINT_OUTPUT_PLAN_STATE.READY,
      expectedLabelKind: "complete-primary",
      expectedStockPreset: "a4-primary",
      expectedPictograms: ["GHS02", "GHS05", "GHS06", "GHS07"],
      expectedIdentityTexts: ["2-Bromothiophene", "1003-09-4"],
      expectedRequiredIdentityTexts: ["2-Bromothiophene"],
      expectedMinTotalLabels: 1,
      expectedMinTotalPages: 1,
    });

    expect(byId["bottle-supplemental"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
    });
    expect(byId["bottle-supplemental"].actual.contentPolicy).toMatchObject(
      byId["bottle-supplemental"].expected.contentPolicy,
    );
    expect(byId["bottle-supplemental-with-case"].actual).toMatchObject({
      hasRequiredIdentityText: true,
      printHasRequiredIdentityText: true,
      hasSupportChip: true,
      printHasSupportChip: true,
    });
    expect(browserCaseById["bottle-supplemental-with-case"]).toMatchObject({
      expectedLabelKind: "supplemental",
      expectedStockPreset: "medium-bottle",
      expectedRequiredIdentityText: "CASE-2026-0007",
      customLabelFields: { batchNumber: "CASE-2026-0007" },
      selectors: expect.objectContaining({
        stockButtonTestId: "primary-output-size-medium-bottle",
        customFieldPrefixTestId: "custom-label-field-",
      }),
    });

    expect(byId["tube-vial-quick-id"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
    });
    expect(byId["tube-vial-quick-id"].actual.contentPolicy).toMatchObject(
      byId["tube-vial-quick-id"].expected.contentPolicy,
    );

    expect(byId["qr-supplement"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
    });
    expect(byId["qr-supplement"].actual.contentPolicy).toMatchObject(
      byId["qr-supplement"].expected.contentPolicy,
    );

    expect(byId["custom-tiny-complete-primary-blocked"]).toMatchObject({
      expected: expect.objectContaining({
        canPrint: false,
        planState: PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE,
        outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
        stockPreset: "custom",
        template: "full",
      }),
      actual: expect.objectContaining({
        canPrint: false,
        planState: PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE,
        outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
        stockPreset: "custom",
        template: "full",
        hasEveryPictogram: true,
        printHasEveryPictogram: true,
      }),
      handoffExpectation: expect.objectContaining({
        status: "blocked",
        labelKind: "complete-primary",
        stockPreset: "custom",
        template: "full",
        hasQr: true,
      }),
    });
    expect(browserCaseById["custom-tiny-complete-primary-blocked"]).toBeUndefined();

    expect(byId["custom-tiny-supplemental"]).toMatchObject({
      expected: expect.objectContaining({
        canPrint: true,
        outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
        stockPreset: "custom",
        template: "standard",
      }),
      actual: expect.objectContaining({
        canPrint: true,
        outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
        stockPreset: "custom",
        template: "standard",
        hasEveryPictogram: true,
        printHasEveryPictogram: true,
      }),
      handoffExpectation: expect.objectContaining({
        status: "qa_handoff",
        labelKind: "supplemental",
        stockPreset: "custom",
        template: "standard",
        hasQr: false,
      }),
    });
    expect(browserCaseById["custom-tiny-supplemental"]).toBeUndefined();

    report.cases.forEach((testCase) => {
      expect(testCase.passed).toBe(true);
      expect(testCase.failures).toEqual([]);
      expect(testCase.actual.previewZoom).toBe("fit");
      expect(testCase.actual.inspectPreviewZoom).toBe("inspect");
      expect(testCase.actual.inspectStartsAtLeft).toBe(true);
      expect(testCase.actual.hasEveryPictogram).toBe(true);
      expect(testCase.actual.printHasEveryPictogram).toBe(true);
      expect(testCase.actual.hasExactPictogramSet).toBe(true);
      expect(testCase.actual.printHasExactPictogramSet).toBe(true);
      expect(testCase.actual.previewPrintPictogramParity).toBe(true);
      const shouldRenderSignalWord = !["quick-id", "qr-supplement"].includes(
        testCase.expected.labelKind,
      );
      expect(testCase.actual.hasSignalWord).toBe(shouldRenderSignalWord);
      expect(testCase.actual.printHasSignalWord).toBe(shouldRenderSignalWord);
      expect(testCase.actual.hasAnyIdentityText).toBe(true);
      expect(testCase.actual.printHasAnyIdentityText).toBe(true);
      expect(testCase.actual.hasRequiredIdentityTexts).toBe(true);
      expect(testCase.actual.printHasRequiredIdentityTexts).toBe(true);
      expect(testCase.actual.hasNoForbiddenIdentityText).toBe(true);
      expect(testCase.actual.printHasNoForbiddenIdentityText).toBe(true);
      expect(testCase.actual.printLabelKind).toBe(testCase.expected.labelKind);
      expect(testCase.actual.printTemplate).toBe(testCase.expected.template);
      expect(testCase.actual.printStockPreset).toBe(
        testCase.expected.stockPreset,
      );
      expect(testCase.handoffExpectation.pictogramCodes).toEqual(
        testCase.chemical.expectedPictograms,
      );
    });

    expect(byId["ethanol-bottle-supplemental"].chemical).toMatchObject({
      cas: "64-17-5",
      expectedPictograms: ["GHS02", "GHS07"],
      expectedIdentityTexts: expect.arrayContaining(["Ethanol", "乙醇"]),
      hasSignalWord: true,
    });
    expect(byId["ethanol-bottle-supplemental"].actual.hasSummaries).toBe(false);
    expect(
      byId["ethanol-bottle-supplemental"].chemical.expectedRequiredIdentityTexts,
    ).toEqual([]);
    expect(
      byId["ethanol-bottle-supplemental"].chemical.expectedForbiddenIdentityTexts,
    ).toEqual([]);
    expect(
      byId["ethanol-tube-quick-id"].chemical.expectedRequiredIdentityTexts,
    ).toEqual(["乙醇", "Ethanol"]);
    expect(
      byId["ethanol-tube-quick-id"].chemical.expectedForbiddenIdentityTexts,
    ).toEqual([]);
    expect(byId["sodium-hydroxide-qr-supplement"].chemical).toMatchObject({
      cas: "1310-73-2",
      expectedPictograms: ["GHS05", "GHS07"],
      expectedIdentityTexts: expect.arrayContaining([
        "Sodium Hydroxide",
        "氫氧化鈉",
      ]),
    });
    expect(byId["sodium-hydroxide-qr-supplement"].actual.hasQr).toBe(true);
    expect(byId["methanol-brother-quick-id-bw"].chemical).toMatchObject({
      cas: "67-56-1",
      expectedPictograms: ["GHS02", "GHS06", "GHS08"],
    });
    expect(browserCaseById["methanol-brother-quick-id-bw"]).toMatchObject({
      expectedNameDisplay: "en",
      expectedColorMode: "bw",
      expectedRequiredIdentityTexts: ["甲醇", "Methanol"],
      expectedMinPictogramSidePx: 26,
    });
    expect(byId["hydrogen-peroxide-qr-supplement-en"].chemical).toMatchObject({
      cas: "7722-84-1",
      expectedPictograms: ["GHS03", "GHS05", "GHS07"],
    });
    expect(byId["nitrogen-tube-quick-id-single-pictogram"].chemical).toMatchObject({
      cas: "7727-37-9",
      expectedPictograms: ["GHS04"],
      expectedRequiredIdentityTexts: ["氮氣", "Nitrogen"],
    });
    expect(browserCaseById["nitrogen-tube-quick-id-single-pictogram"]).toMatchObject({
      expectedNameDisplay: "en",
      expectedLabelKind: "quick-id",
      expectedStockPreset: "small-strip",
      expectedPictograms: ["GHS04"],
      expectedMinPictogramSidePx: 26,
    });
    expect(byId["zinc-oxide-small-qr-environmental"].chemical).toMatchObject({
      cas: "1314-13-2",
      expectedPictograms: ["GHS09"],
      expectedRequiredIdentityTexts: ["氧化鋅", "Zinc Oxide"],
    });
    expect(browserCaseById["zinc-oxide-small-qr-environmental"]).toMatchObject({
      expectedNameDisplay: "en",
      expectedLabelKind: "qr-supplement",
      expectedStockPreset: "small-strip",
      expectedPictograms: ["GHS09"],
      expectedMinQrSidePx: 30,
    });
    expect(byId["boric-acid-bottle-supplemental-health"].chemical).toMatchObject({
      cas: "10043-35-3",
      expectedPictograms: ["GHS08"],
      expectedRequiredIdentityTexts: ["Boric Acid"],
    });
    expect(byId["boric-acid-bottle-supplemental-health"].actual.hasSummaries).toBe(
      false,
    );
    expect(browserCaseById["boric-acid-bottle-supplemental-health"]).toMatchObject({
      expectedNameDisplay: "en",
      expectedLabelKind: "supplemental",
      expectedStockPreset: "medium-bottle",
      expectedPictograms: ["GHS08"],
    });
    expect(chemicalById.nitrogen.coverage.riskTags).toEqual(
      expect.arrayContaining(["single-pictogram", "compressed-gas"]),
    );
    expect(chemicalById.zincOxide.coverage.riskTags).toEqual(
      expect.arrayContaining(["single-pictogram", "environmental"]),
    );
    expect(chemicalById.boricAcid.coverage.riskTags).toEqual(
      expect.arrayContaining(["single-pictogram", "health-hazard"]),
    );
    expect(byId["prepared-a4-primary"]).toMatchObject({
      chemical: expect.objectContaining({
        id: "preparedHydrochloricAcid",
        cas: "7647-01-0",
        expectedPictograms: ["GHS04", "GHS05", "GHS06", "GHS07"],
      }),
      actual: expect.objectContaining({
        hasPreparedIdentityTexts: true,
        printHasPreparedIdentityTexts: true,
        hasFullPagePictograms: true,
      }),
    });
    expect(byId["prepared-bottle-supplemental"].actual).toMatchObject({
      hasPreparedIdentityTexts: true,
      printHasPreparedIdentityTexts: true,
      printLabelKind: "supplemental",
    });
    expect(byId["prepared-tube-quick-id"].actual).toMatchObject({
      hasPreparedIdentityTexts: true,
      printHasPreparedIdentityTexts: true,
      printLabelKind: "quick-id",
    });
    expect(browserCaseById["prepared-a4-primary"]).toBeUndefined();
    expect(browserCaseById["prepared-bottle-supplemental"]).toBeUndefined();
    expect(browserCaseById["prepared-tube-quick-id"]).toBeUndefined();
    expect(byId["long-name-bottle-supplemental"].actual.printHasEveryPictogram).toBe(
      true,
    );
    expect(byId["long-name-tube-quick-id"].actual.identityDensityClass).toBe(
      "identity-density-high",
    );
    expect(byId["long-name-tube-quick-id"].actual.autoFitLevel).toBe(2);
    expect(byId["tube-vial-quick-id-with-case"].actual).toMatchObject({
      hasRequiredIdentityText: true,
      printHasRequiredIdentityText: true,
      hasSupportChip: false,
      printHasSupportChip: false,
      autoFitLevel: 2,
    });
    expect(browserCaseById["tube-vial-quick-id-with-case"]).toMatchObject({
      expectedLabelKind: "quick-id",
      expectedStockPreset: "small-strip",
      expectedHasSignalWord: false,
      expectedIdentityTexts: expect.arrayContaining([
        "Hydrochloric Acid",
        "鹽酸",
      ]),
      expectedMinPictogramSidePx: 26,
      expectedMinQrSidePx: 0,
      expectedRequiredIdentityText: "",
      customLabelFields: {},
      selectors: expect.objectContaining({
        printAllButtonTestId: "print-all-with-ghs-btn",
        stockButtonTestId: "primary-output-size-small-strip",
        qaStatusElementId: "ghs-print-qa-status",
      }),
    });
    expect(browserCaseById["qr-supplement"]).toMatchObject({
      expectedMinPictogramSidePx: 18,
      expectedMinQrSidePx: 30,
    });
    expect(browserCaseById["ethanol-tube-quick-id"]).toMatchObject({
      expectedNameDisplay: "en",
      expectedColorMode: "bw",
      expectedRequiredIdentityTexts: ["乙醇", "Ethanol"],
      expectedForbiddenIdentityTexts: [],
    });
    expect(browserCaseById["tube-vial-quick-id-with-case"].steps).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "setCustomField" }),
      ]),
    );
    expect(browserCaseById["long-name-tube-quick-id"]).toMatchObject({
      searchTerm: "QA-LONG-001",
      expectedLabelKind: "quick-id",
      expectedStockPreset: "small-strip",
      expectedCasNumbers: ["QA-LONG-001"],
      expectedLabelWidthMm: 70,
      expectedLabelHeightMm: 24,
      expectedPageSize: "A4",
      targetOption: "quickId",
      mustContainCas: true,
    });
    expect(browserCaseById["long-name-tube-quick-id"].steps).toEqual(
      expect.arrayContaining([
        { action: "selectTarget", value: "quickId" },
        { action: "selectStock", value: "small-strip" },
        { action: "assertQaStatus", elementId: "ghs-print-qa-status" },
      ]),
    );
  });

  it("keeps fixed-stock A4 complete batches from doubling into false continuations", () => {
    const { completeBatchBundle, completeBatchItems } =
      buildCompleteBatchA4Bundle();

    expect(completeBatchBundle.model.expandedLabels.length).toBeLessThanOrEqual(
      completeBatchItems.length + 4,
    );
  });
});
