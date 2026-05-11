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
  buildPrintQaMatrixReport,
  resolvePrintQaCaseChemical,
} from "@/utils/printQaMatrix";
import { PRINT_OUTPUT_PLAN_STATE } from "@/utils/printOutputPlanner";
import {
  buildPrintDocument,
  buildPrintPreviewDocument,
} from "@/utils/printLabels";

const maybeWriteReport = (report) => {
  const outputPath = process.env.PRINT_QA_REPORT_PATH;
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

const maybeWritePrintArtifacts = () => {
  const outputDir = process.env.PRINT_QA_PRINT_HTML_DIR;
  if (!outputDir) return;

  const absoluteDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(absoluteDir, { recursive: true });

  const index = PRINT_QA_MATRIX.map((testCase) => {
    const chemical = resolvePrintQaCaseChemical(testCase);
    const documentBundle = buildPrintDocument(
      [chemical],
      testCase.labelConfig,
      {},
      testCase.customLabelFields || {},
      { [chemical.cas_number]: 1 },
      PRINT_QA_PROFILE,
    );
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
      expectedHasQr: Boolean(testCase.expected?.hasQr),
      expectedMinTotalLabels: testCase.expected?.minPrintTotalLabels || 1,
    };
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
  it("generates a passing machine-readable report for the core HCl print matrix", () => {
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
        expect.objectContaining({ id: "longNameCorrosive", cas: "QA-LONG-001" }),
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
    expect(report.productionBrowserQa.cases).toHaveLength(PRINT_QA_MATRIX.length);

    const byId = Object.fromEntries(
      report.cases.map((testCase) => [testCase.id, testCase]),
    );
    const browserCaseById = Object.fromEntries(
      report.productionBrowserQa.cases.map((testCase) => [
        testCase.id,
        testCase,
      ]),
    );

    expect(byId["a4-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      casNumbers: ["7647-01-0"],
      labelWidthMm: 188,
      labelHeightMm: 268,
      pageSize: "A4",
      colorMode: "color",
      nameDisplay: "both",
    });
    expect(byId["a4-primary"].actual.hasFullPagePictograms).toBe(true);
    expect(byId["a4-primary"].actual.hasSummaries).toBe(false);

    expect(byId["letter-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: false,
      casNumbers: ["7647-01-0"],
      labelWidthMm: 196,
      labelHeightMm: 250,
      pageSize: "Letter",
    });
    expect(byId["letter-primary"].actual.hasFullPagePictograms).toBe(true);

    expect(byId["formaldehyde-a4-primary-continuation"]).toMatchObject({
      chemical: expect.objectContaining({
        cas: "50-00-0",
        expectedPictograms: ["GHS05", "GHS06", "GHS07", "GHS08"],
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
        hasQr: false,
      }),
    });
    expect(
      byId["formaldehyde-a4-primary-continuation"].actual.printTotalLabels,
    ).toBeGreaterThanOrEqual(2);
    expect(browserCaseById["formaldehyde-a4-primary-continuation"]).toMatchObject({
      expectedCanPrint: true,
      expectedPrintButtonEnabled: true,
      expectedStatus: "qa_handoff",
      expectedPlanState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
      expectedLabelKind: "complete-primary",
      expectedStockPreset: "a4-primary",
      expectedPictograms: ["GHS05", "GHS06", "GHS07", "GHS08"],
      expectedIdentityTexts: ["Formaldehyde", "甲醛", "50-00-0"],
      expectedRequiredIdentityTexts: ["Formaldehyde", "甲醛"],
      expectedMinTotalLabels: 2,
      expectedMinTotalPages: 2,
    });

    expect(byId["bottle-supplemental"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
    });

    expect(byId["tube-vial-quick-id"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
    });

    expect(byId["qr-supplement"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
    });

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
      expect(testCase.actual.hasSignalWord).toBe(true);
      expect(testCase.actual.printHasSignalWord).toBe(true);
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
    ).toEqual(["Ethanol"]);
    expect(
      byId["ethanol-tube-quick-id"].chemical.expectedForbiddenIdentityTexts,
    ).toHaveLength(1);
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
      expectedRequiredIdentityTexts: ["Methanol"],
      expectedMinPictogramSidePx: 26,
    });
    expect(byId["hydrogen-peroxide-qr-supplement-en"].chemical).toMatchObject({
      cas: "7722-84-1",
      expectedPictograms: ["GHS03", "GHS05", "GHS07"],
    });
    expect(byId["long-name-bottle-supplemental"].actual.printHasEveryPictogram).toBe(
      true,
    );
    expect(byId["long-name-tube-quick-id"].actual.identityDensityClass).toBe(
      "identity-density-high",
    );
    expect(byId["tube-vial-quick-id-with-case"].actual).toMatchObject({
      hasRequiredIdentityText: true,
      printHasRequiredIdentityText: true,
      hasSupportChip: true,
      printHasSupportChip: true,
    });
    expect(browserCaseById["tube-vial-quick-id-with-case"]).toMatchObject({
      expectedLabelKind: "quick-id",
      expectedStockPreset: "small-strip",
      expectedHasSignalWord: true,
      expectedIdentityTexts: expect.arrayContaining([
        "Hydrochloric Acid",
        "鹽酸",
      ]),
      expectedMinPictogramSidePx: 26,
      expectedMinQrSidePx: 0,
      expectedRequiredIdentityText: "CASE-2026-0007",
      customLabelFields: { batchNumber: "CASE-2026-0007" },
      selectors: expect.objectContaining({
        printAllButtonTestId: "print-all-with-ghs-btn",
        stockButtonTestId: "primary-output-size-small-strip",
        customFieldPrefixTestId: "custom-label-field-",
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
      expectedRequiredIdentityTexts: ["Ethanol"],
      expectedForbiddenIdentityTexts: expect.any(Array),
    });
    expect(browserCaseById["tube-vial-quick-id-with-case"].steps).toEqual(
      expect.arrayContaining([
        {
          action: "setCustomField",
          key: "batchNumber",
          value: "CASE-2026-0007",
          testId: "custom-label-field-batchNumber",
        },
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
      targetOption: "vial",
      mustContainCas: true,
    });
    expect(browserCaseById["long-name-tube-quick-id"].steps).toEqual(
      expect.arrayContaining([
        { action: "selectTarget", value: "vial" },
        { action: "selectStock", value: "small-strip" },
        { action: "assertQaStatus", elementId: "ghs-print-qa-status" },
      ]),
    );
  });
});
