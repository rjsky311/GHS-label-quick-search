export const INVENTORY_PRINT_EVIDENCE_PROFILE = Object.freeze({
  organization: "Inventory Layout QA",
  phone: "02-0000-0000",
  address: "Review-only print evidence",
});

const DEFAULT_INVENTORY_PICTOGRAMS = Object.freeze(["GHS07", "GHS08"]);

const OUTPUT_LABEL_KIND = Object.freeze({
  complete: "complete-primary",
  qrSupplement: "qr-supplement",
  quickId: "quick-id",
});

const OUTPUT_CONFIG = Object.freeze({
  complete: Object.freeze({
    labelPurpose: "shipping",
    template: "full",
    stockPreset: "a4-primary",
    nameDisplay: "en",
    colorMode: "color",
  }),
  qrSupplement: Object.freeze({
    labelPurpose: "qrSupplement",
    template: "qrcode",
    stockPreset: "brother-62mm-continuous",
    nameDisplay: "en",
    colorMode: "color",
  }),
  quickId: Object.freeze({
    labelPurpose: "quickId",
    template: "icon",
    stockPreset: "small-strip",
    nameDisplay: "en",
    colorMode: "color",
  }),
});

const SYNTHETIC_OUTPUT_CONFIG = Object.freeze({
  qrSupplement: Object.freeze({
    ...OUTPUT_CONFIG.qrSupplement,
    nameDisplay: "both",
  }),
  quickId: Object.freeze({
    ...OUTPUT_CONFIG.quickId,
    nameDisplay: "both",
  }),
});

const pictogramsForCount = (count) =>
  Array.from({ length: count }, (_, index) => ({
    code: `GHS${String(index + 1).padStart(2, "0")}`,
  }));

const compactId = (value = "") =>
  String(value || "")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const makeInventoryEvidenceChemical = ({
  cas,
  name,
  nameZh = "",
  pictogramCount,
  pictograms,
} = {}) => {
  const ghsPictograms =
    pictograms ||
    (pictogramCount
      ? pictogramsForCount(pictogramCount)
      : DEFAULT_INVENTORY_PICTOGRAMS.map((code) => ({ code })));

  return {
    cas_number: cas,
    name_en: name || cas || "Inventory layout sample",
    name_zh: nameZh || "",
    cid: 0,
    ghs_pictograms: ghsPictograms,
    signal_word: "Warning",
    signal_word_zh: "警告",
    hazard_statements: [
      {
        code: "H315",
        text_en:
          "Layout QA placeholder: causes skin irritation. Verify real hazards against SDS.",
        text_zh: "排版測試佔位文字：實際危害請以 SDS 為準。",
      },
      {
        code: "H319",
        text_en:
          "Layout QA placeholder: causes serious eye irritation. Verify real hazards against SDS.",
        text_zh: "排版測試佔位文字：實際危害請以 SDS 為準。",
      },
    ],
    precautionary_statements: [
      {
        code: "P264",
        text_en: "Layout QA placeholder: wash hands thoroughly after handling.",
        text_zh: "排版測試佔位文字：操作後徹底清洗雙手。",
      },
      {
        code: "P280",
        text_en: "Layout QA placeholder: wear protective gloves and eye protection.",
        text_zh: "排版測試佔位文字：佩戴防護手套與護眼用具。",
      },
    ],
  };
};

const makePrintableCase = ({
  id,
  label,
  chemical,
  labelConfig,
  expectedLabelKind,
  expectedPictograms,
  expectedHasQr,
  expectedRequiredIdentityTexts,
  expectedForbiddenIdentityTexts = [],
  expectedMinTotalLabels = 1,
  expectedPrintMinPictogramSidePx = 22,
  expectedPrintMinQrSidePx = 0,
}) => ({
  id,
  label,
  chemical,
  labelConfig,
  expectedLabelKind,
  expectedPictograms,
  expectedHasQr,
  expectedStockPreset: labelConfig.stockPreset,
  expectedMinTotalLabels,
  expectedPrintMinPictogramSidePx,
  expectedPrintMinQrSidePx,
  expectedRequiredIdentityTexts,
  expectedForbiddenIdentityTexts,
});

const getInventorySample = (report, id) =>
  (report.inventorySamples || []).find((sample) => sample.id === id) || null;

const inventoryChemical = (sample) =>
  makeInventoryEvidenceChemical({
    cas: sample.cas,
    name: sample.name,
  });

const buildInventoryPrintableCases = (report) => {
  const first = getInventorySample(report, "inventory-first-valid");
  const longest = getInventorySample(report, "inventory-longest-name");
  const shortest = getInventorySample(report, "inventory-short-name");
  const samples = [first, longest, shortest].filter(Boolean);
  const cases = [];

  if (first) {
    const chemical = inventoryChemical(first);
    cases.push(
      makePrintableCase({
        id: "inventory-first-valid-complete",
        label: "Inventory first valid A4 complete layout probe",
        chemical,
        labelConfig: OUTPUT_CONFIG.complete,
        expectedLabelKind: OUTPUT_LABEL_KIND.complete,
        expectedPictograms: chemical.ghs_pictograms.map(({ code }) => code),
        expectedHasQr: true,
        expectedPrintMinPictogramSidePx: 18,
        expectedPrintMinQrSidePx: 30,
        expectedRequiredIdentityTexts: [first.name],
      }),
    );
  }

  if (longest) {
    const chemical = inventoryChemical(longest);
    cases.push(
      makePrintableCase({
        id: "inventory-longest-name-quick-id",
        label: "Inventory longest name identification label probe",
        chemical,
        labelConfig: OUTPUT_CONFIG.quickId,
        expectedLabelKind: OUTPUT_LABEL_KIND.quickId,
        expectedPictograms: chemical.ghs_pictograms.map(({ code }) => code),
        expectedHasQr: false,
        expectedRequiredIdentityTexts: [longest.name],
      }),
      makePrintableCase({
        id: "inventory-longest-name-qr",
        label: "Inventory longest name QR small label probe",
        chemical,
        labelConfig: OUTPUT_CONFIG.qrSupplement,
        expectedLabelKind: OUTPUT_LABEL_KIND.qrSupplement,
        expectedPictograms: chemical.ghs_pictograms.map(({ code }) => code),
        expectedHasQr: true,
        expectedPrintMinQrSidePx: 48,
        expectedRequiredIdentityTexts: [longest.name],
      }),
    );
  }

  if (shortest) {
    const chemical = inventoryChemical(shortest);
    cases.push(
      makePrintableCase({
        id: "inventory-short-name-quick-id",
        label: "Inventory short name identification label baseline",
        chemical,
        labelConfig: OUTPUT_CONFIG.quickId,
        expectedLabelKind: OUTPUT_LABEL_KIND.quickId,
        expectedPictograms: chemical.ghs_pictograms.map(({ code }) => code),
        expectedHasQr: false,
        expectedRequiredIdentityTexts: [shortest.name],
      }),
    );
  }

  if (samples.length > 0) {
    const chemicals = samples.map(inventoryChemical);
    cases.push(
      makePrintableCase({
        id: "inventory-sample-batch-quick-id",
        label: "Inventory representative batch identification labels",
        chemical: chemicals,
        labelConfig: OUTPUT_CONFIG.quickId,
        expectedLabelKind: OUTPUT_LABEL_KIND.quickId,
        expectedPictograms: ["GHS07", "GHS08"],
        expectedHasQr: false,
        expectedMinTotalLabels: chemicals.length,
        expectedRequiredIdentityTexts: samples.map((sample) => sample.name),
      }),
    );
  }

  return cases;
};

const buildSyntheticCase = (sample) => {
  const labelConfig =
    SYNTHETIC_OUTPUT_CONFIG[sample.output] || OUTPUT_CONFIG[sample.output];
  const chemical = makeInventoryEvidenceChemical({
    cas: sample.cas,
    name: sample.name,
    nameZh: sample.nameZh,
    pictogramCount: sample.pictogramCount,
  });
  const labelKind = OUTPUT_LABEL_KIND[sample.output];
  const isQr = sample.output === "qrSupplement";

  return makePrintableCase({
    id: `synthetic-${sample.id}`,
    label: sample.name,
    chemical,
    labelConfig,
    expectedLabelKind: labelKind,
    expectedPictograms: chemical.ghs_pictograms.map(({ code }) => code),
    expectedHasQr: isQr,
    expectedPrintMinPictogramSidePx: sample.pictogramCount >= 9 ? 22 : 26,
    expectedPrintMinQrSidePx: isQr ? 48 : 0,
    expectedRequiredIdentityTexts: [sample.name],
  });
};

const buildSyntheticEvidence = (report) => {
  const printableCases = [];
  const blockedCases = [];

  (report.syntheticStressCases || []).forEach((sample) => {
    if (Number(sample.pictogramCount) > 18) {
      blockedCases.push({
        id: `synthetic-${sample.id}`,
        sample,
        expectedPlanState: "small_label_continuation_limit",
        expectedCanPrint: false,
      });
      return;
    }
    printableCases.push(buildSyntheticCase(sample));
  });

  return { printableCases, blockedCases };
};

export const buildInventoryPrintEvidenceCases = (report = {}) => {
  const inventoryCases = buildInventoryPrintableCases(report);
  const synthetic = buildSyntheticEvidence(report);

  return {
    sourceName: report.sourceName || "",
    boundary:
      "review-only: generated labels use synthetic layout QA hazards and do not approve inventory data",
    printableCases: [...inventoryCases, ...synthetic.printableCases],
    blockedCases: synthetic.blockedCases,
  };
};

export const caseChemicals = (testCase) =>
  Array.isArray(testCase.chemical) ? testCase.chemical : [testCase.chemical];

export const caseFileName = (testCase) => `${compactId(testCase.id)}.html`;
