import {
  PRINT_READINESS_STATE,
  evaluatePrintReadiness,
  getMaxSupplementalPictogramCount,
  getMaxSupplementalTextWeight,
  inspectPrintContentFit,
} from "../printFitEngine";
import {
  PRINT_CONTENT_ROLE,
  PRINT_HAZARD_TEXT_MODE,
  PRINT_PRECAUTION_TEXT_MODE,
} from "../printContentPolicy";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";

jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

const completeProfile = {
  organization: "Lab A",
  phone: "02-1234",
  address: "Taipei",
};

const makeChemical = (statementCount = 2) => ({
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  ghs_pictograms: [{ code: "GHS04" }, { code: "GHS05" }],
  hazard_statements: Array.from(
    { length: Math.ceil(statementCount / 2) },
    (_, index) => ({
      code: `H${300 + index}`,
      text_en: `Hazard ${index}`,
    }),
  ),
  precautionary_statements: Array.from(
    { length: Math.floor(statementCount / 2) },
    (_, index) => ({
      code: `P${300 + index}`,
      text_en: `Precaution ${index}`,
    }),
  ),
  signal_word: "Danger",
});

const makeSimpleSupplementalChemical = () => ({
  ...makeChemical(2),
  ghs_pictograms: [{ code: "GHS05" }],
  hazard_statements: [{ code: "H290", text_en: "May be corrosive to metals." }],
  precautionary_statements: [],
});

const makeDenseSupplementalChemical = () => ({
  ...makeChemical(4),
  name_en:
    "Hydrochloric Acid Concentrated Laboratory Reagent Secondary Bottle",
  name_zh: "濃鹽酸實驗室試藥分裝瓶",
  ghs_pictograms: [
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
  hazard_statements: [
    {
      code: "H280",
      text_en:
        "Contains gas under pressure; may explode if heated during storage or transfer.",
      text_zh: "內含高壓氣體；遇熱可能爆炸，分裝或儲存時需保持警戒。",
    },
    {
      code: "H314",
      text_en:
        "Causes severe skin burns and eye damage under routine handling conditions.",
      text_zh: "在例行操作條件下可能造成嚴重皮膚灼傷和眼睛損傷。",
    },
  ],
  precautionary_statements: [
    {
      code: "P280",
      text_en:
        "Wear protective gloves, protective clothing, eye protection, and face protection.",
      text_zh: "穿戴防護手套、防護衣、眼睛防護具與臉部防護具。",
    },
  ],
});

const makeHydrochloricAcid = () => ({
  ...makeChemical(28),
  name_en: "Hydrochloric Acid",
  ghs_pictograms: [
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
  hazard_statements: [
    {
      code: "H280",
      text_en:
        "Contains gas under pressure; may explode if heated [Warning Gases under pressure]",
    },
    {
      code: "H290",
      text_en: "May be corrosive to metals [Warning Corrosive to Metals]",
    },
    {
      code: "H314",
      text_en:
        "Causes severe skin burns and eye damage [Danger Skin corrosion/irritation]",
    },
    {
      code: "H318",
      text_en:
        "Causes serious eye damage [Danger Serious eye damage/eye irritation]",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled [Danger Acute toxicity, inhalation]",
    },
    {
      code: "H335",
      text_en:
        "May cause respiratory irritation [Warning Specific target organ toxicity, single exposure]",
    },
  ],
  precautionary_statements: Array.from({ length: 22 }, (_, index) => ({
    code: `P${260 + index}`,
    text_en:
      "Use appropriate protective controls and follow official SDS handling instructions.",
  })),
});

describe("printFitEngine", () => {
  it("routes dense complete labels to A4 primary before printing", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(24)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "large-primary",
        widthMm: 140,
        heightMm: 88,
      },
      resolvedLabProfile: completeProfile,
    });

    expect(readiness.state).toBe(
      PRINT_READINESS_STATE.TOO_DENSE_AUTO_UPGRADE,
    );
    expect(readiness.canPrint).toBe(false);
    expect(readiness.maxStatementCount).toBe(24);
    expect(readiness.issues).toEqual([
      expect.objectContaining({ type: "content-too-dense" }),
    ]);
  });

  it("routes very dense complete labels to A4 continuation", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(72)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "a4-primary",
        widthMm: 180,
        heightMm: 250,
      },
      resolvedLabProfile: completeProfile,
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.NEEDS_CONTINUATION);
    expect(readiness.canPrint).toBe(false);
    expect(readiness.elementSummary.pictograms).toEqual({
      expected: 2,
      present: 2,
    });
  });

  it("routes long bilingual text by rendered weight even when statement counts fit", () => {
    const longBilingualChemical = {
      ...makeChemical(8),
      name_en:
        "Hydrochloric Acid Concentrated Laboratory Reagent Primary Container",
      name_zh: "濃鹽酸實驗室試藥主要容器",
      hazard_statements: Array.from({ length: 4 }, (_, index) => ({
        code: `H${330 + index}`,
        text_en:
          "May cause severe respiratory irritation and delayed tissue damage under ordinary handling conditions.",
        text_zh:
          "在一般操作條件下可能造成嚴重呼吸道刺激，並可能造成延遲性組織傷害。",
      })),
      precautionary_statements: Array.from({ length: 4 }, (_, index) => ({
        code: `P${260 + index}`,
        text_en:
          "Wear suitable protective gloves, protective clothing, eye protection, and face protection before handling.",
        text_zh:
          "操作前應穿戴適當防護手套、防護衣、眼睛防護具與臉部防護具。",
      })),
    };

    const readiness = evaluatePrintReadiness({
      selectedForLabel: [longBilingualChemical],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        nameDisplay: "both",
        size: "large",
        stockId: "large-primary",
        widthMm: 140,
        heightMm: 88,
      },
      resolvedLabProfile: completeProfile,
    });

    expect(readiness.state).toBe(
      PRINT_READINESS_STATE.TOO_DENSE_AUTO_UPGRADE,
    );
    expect(readiness.issues).toEqual([
      expect.objectContaining({ type: "content-text-too-dense" }),
    ]);
  });

  it("keeps simple supplemental labels printable but marks them as supplemental", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeSimpleSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      }),
      resolvedLabProfile: {},
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.elementSummary.responsibleProfile).toEqual({
      expected: 0,
      present: 0,
    });
  });

  it("keeps dense QR supplements printable by matching the renderer's code-only compact text", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "both",
    });
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeDenseSupplementalChemical()],
      layout,
      resolvedLabProfile: {},
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.recommendedAction).toBe("review_supplemental");
    expect(readiness.issues).toEqual([]);
    expect(
      inspectPrintContentFit({
        layout,
        expandedLabels: [makeDenseSupplementalChemical()],
        customGHSSettings: {},
        resolvedLabProfile: {},
      }),
    ).toEqual([]);
  });

  it("keeps dense bottle labels printable by trimming supplemental text before blocking", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    });
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeHydrochloricAcid()],
      layout,
      resolvedLabProfile: {},
      locale: "en",
    });

    expect(layout.templateBudgets.standard.primaryHazards).toBe(2);
    expect(layout.templateBudgets.standard.precautions).toBe(0);
    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.issues).toEqual([]);
  });

  it("derives supplemental fit capacity from resolved renderer metrics", () => {
    const compact = resolvePrintLayoutConfig({
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "both",
    });
    const roomy = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "large-primary",
      nameDisplay: "both",
    });

    expect(getMaxSupplementalTextWeight(roomy)).toBeGreaterThan(
      getMaxSupplementalTextWeight(compact),
    );
  });

  it("keeps supplemental stocks printable because extra pictograms continue onto same-stock labels", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
    });
    const chemical = {
      ...makeSimpleSupplementalChemical(),
      ghs_pictograms: [
        { code: "GHS01" },
        { code: "GHS02" },
        { code: "GHS03" },
        { code: "GHS04" },
        { code: "GHS05" },
      ],
    };
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [chemical],
      layout,
      resolvedLabProfile: {},
    });

    expect(getMaxSupplementalPictogramCount(layout)).toBe(99);
    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.issues).toEqual([]);
  });

  it("keeps normal case identity printable on small quick-ID labels", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeSimpleSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
        nameDisplay: "both",
      }),
      customLabelFields: { batchNumber: "CASE-2026-0007" },
      resolvedLabProfile: {},
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.issues).toEqual([]);
  });

  it("blocks custom identity values that cannot fit the selected stock", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeSimpleSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
        nameDisplay: "both",
      }),
      customLabelFields: {
        batchNumber: "CASE-2026-0007-EXTRA-LONG-LOCATION-SUFFIX",
      },
      resolvedLabProfile: {},
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.BLOCKED_INVALID);
    expect(readiness.canPrint).toBe(false);
    expect(readiness.issues).toEqual([
      expect.objectContaining({
        type: "custom-identity-too-long-for-stock",
        valueLength: 41,
        maxLength: 22,
      }),
    ]);
  });

  it("blocks complete primary labels until responsible profile is complete", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(6)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "large-primary",
        widthMm: 140,
        heightMm: 88,
      },
      resolvedLabProfile: { organization: "Lab A", phone: "02-1234" },
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.NEEDS_PROFILE);
    expect(readiness.canPrint).toBe(false);
    expect(readiness.contentPolicy).toMatchObject({
      role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
    });
    expect(readiness.elementSummary.responsibleProfile).toEqual({
      expected: 3,
      present: 2,
    });
    expect(readiness.issues).toEqual([
      expect.objectContaining({ type: "responsible-profile-missing" }),
    ]);
  });

  it("shares dense content preflight with printLabels", () => {
    const chemical = makeChemical(24);
    const model = {
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "large-primary",
      }),
      expandedLabels: [chemical],
      customGHSSettings: {},
      resolvedLabProfile: {},
    };

    expect(inspectPrintContentFit(model)).toEqual([
      expect.objectContaining({
        type: "content-too-dense",
        statementCount: 24,
        maxStatements: 12,
      }),
    ]);
  });
});
