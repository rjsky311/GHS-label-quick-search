jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

jest.mock("@/constants/ghs", () => ({
  GHS_IMAGES: {
    GHS04: "https://example.com/GHS04.svg",
    GHS05: "https://example.com/GHS05.svg",
    GHS06: "https://example.com/GHS06.svg",
    GHS07: "https://example.com/GHS07.svg",
  },
}));

import fs from "node:fs";
import path from "node:path";
import {
  PRINT_QA_MATRIX,
  buildPrintQaMatrixReport,
} from "@/utils/printQaMatrix";

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

describe("print QA matrix report", () => {
  it("generates a passing machine-readable report for the core HCl print matrix", () => {
    const report = buildPrintQaMatrixReport({
      ...(process.env.PRINT_QA_REPORT_GENERATED_AT
        ? { generatedAt: process.env.PRINT_QA_REPORT_GENERATED_AT }
        : {}),
    });

    maybeWriteReport(report);

    expect(report.schemaVersion).toBe(1);
    expect(report.generatedAt).toEqual(expect.any(String));
    expect(report.summary).toEqual({
      total: PRINT_QA_MATRIX.length,
      passed: PRINT_QA_MATRIX.length,
      failed: 0,
    });

    const byId = Object.fromEntries(
      report.cases.map((testCase) => [testCase.id, testCase]),
    );

    expect(byId["a4-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
    });
    expect(byId["a4-primary"].actual.hasFullPagePictograms).toBe(true);
    expect(byId["a4-primary"].actual.hasSummaries).toBe(false);

    expect(byId["letter-primary"].handoffExpectation).toMatchObject({
      status: "qa_handoff",
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: false,
    });
    expect(byId["letter-primary"].actual.hasFullPagePictograms).toBe(true);

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
      expect(testCase.handoffExpectation.pictogramCodes).toEqual([
        "GHS04",
        "GHS05",
        "GHS06",
        "GHS07",
      ]);
    });
  });
});
