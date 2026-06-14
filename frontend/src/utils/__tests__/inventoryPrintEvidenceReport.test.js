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
  INVENTORY_PRINT_EVIDENCE_PROFILE,
  buildInventoryPrintEvidenceCases,
  caseChemicals,
  caseFileName,
} from "@/utils/inventoryPrintEvidence";
import { buildPrintDocument } from "@/utils/printLabels";

const DEFAULT_SAMPLE_REPORT_PATH =
  "../qa/evidence/2026-06-15-inventory-print-sampling/inventory-print-sampling-report.json";

const readSampleReport = () => {
  const reportPath = path.resolve(
    process.cwd(),
    process.env.INVENTORY_PRINT_SAMPLE_REPORT_PATH || DEFAULT_SAMPLE_REPORT_PATH,
  );
  return {
    reportPath,
    report: JSON.parse(fs.readFileSync(reportPath, "utf8")),
  };
};

const maybeWriteEvidenceArtifacts = ({ evidence, outputDir }) => {
  if (!outputDir) return null;

  const absoluteDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(absoluteDir, { recursive: true });

  const index = evidence.printableCases.map((testCase) => {
    const documentBundle = buildPrintDocument(
      caseChemicals(testCase),
      testCase.labelConfig,
      {},
      {},
      Object.fromEntries(
        caseChemicals(testCase).map((chemical) => [chemical.cas_number, 1]),
      ),
      INVENTORY_PRINT_EVIDENCE_PROFILE,
    );
    const file = caseFileName(testCase);
    fs.writeFileSync(path.join(absoluteDir, file), documentBundle.html);
    return {
      id: testCase.id,
      label: testCase.label,
      chemical: caseChemicals(testCase)
        .map((chemical) => chemical.cas_number)
        .join(", "),
      file,
      expectedLabelKind: testCase.expectedLabelKind,
      expectedLabelKinds: [testCase.expectedLabelKind],
      expectedPictograms: testCase.expectedPictograms,
      expectedHasQr: testCase.expectedHasQr,
      expectedStockPreset: testCase.expectedStockPreset,
      expectedMinTotalLabels: testCase.expectedMinTotalLabels,
      expectedPrintMinPictogramSidePx:
        testCase.expectedPrintMinPictogramSidePx,
      expectedPrintMinQrSidePx: testCase.expectedPrintMinQrSidePx,
      expectedRequiredIdentityTexts: testCase.expectedRequiredIdentityTexts,
      expectedForbiddenIdentityTexts: testCase.expectedForbiddenIdentityTexts,
    };
  });

  fs.writeFileSync(
    path.join(absoluteDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(absoluteDir, "blocked-cases.json"),
    `${JSON.stringify(evidence.blockedCases, null, 2)}\n`,
  );

  return { absoluteDir, index };
};

describe("inventory print evidence report", () => {
  it("builds printable HTML artifact metadata from the sampler report", () => {
    const { report } = readSampleReport();
    const evidence = buildInventoryPrintEvidenceCases(report);

    const written = maybeWriteEvidenceArtifacts({
      evidence,
      outputDir: process.env.INVENTORY_PRINT_EVIDENCE_DIR,
    });

    expect(evidence.printableCases.map((testCase) => testCase.id)).toEqual(
      expect.arrayContaining([
        "inventory-longest-name-quick-id",
        "inventory-longest-name-qr",
        "inventory-sample-batch-quick-id",
        "synthetic-qr-small-8-ghs",
        "synthetic-qr-small-9-ghs",
        "synthetic-quick-id-9-ghs",
      ]),
    );
    expect(evidence.blockedCases).toEqual([
      expect.objectContaining({
        id: "synthetic-qr-small-over-limit-19-ghs",
        expectedCanPrint: false,
      }),
    ]);

    if (written) {
      expect(fs.existsSync(path.join(written.absoluteDir, "index.json"))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(written.absoluteDir, "blocked-cases.json"))).toBe(
        true,
      );
      expect(written.index).toHaveLength(evidence.printableCases.length);
      expect(written.index).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "synthetic-qr-small-9-ghs",
            expectedLabelKind: "qr-supplement",
            expectedHasQr: true,
            expectedPictograms: [
              "GHS01",
              "GHS02",
              "GHS03",
              "GHS04",
              "GHS05",
              "GHS06",
              "GHS07",
              "GHS08",
              "GHS09",
            ],
          }),
        ]),
      );
    }
  });
});
