import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildFullPagePrimaryPatch,
  buildPrintOutputPlan,
  getPreferredFullPageStockId,
} from "../printOutputPlanner";

jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

const completeProfile = {
  organization: "Lab A",
  phone: "02-1234",
  address: "Taipei",
};

const makeChemical = (statementCount = 4) => ({
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  name_zh: "鹽酸",
  ghs_pictograms: [
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
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

describe("printOutputPlanner", () => {
  it("prefers Letter for English/North American contexts and A4 otherwise", () => {
    expect(getPreferredFullPageStockId("en-US")).toBe("letter-primary");
    expect(getPreferredFullPageStockId("zh-TW")).toBe("a4-primary");
    expect(getPreferredFullPageStockId("zh-TW", "Letter")).toBe(
      "letter-primary",
    );
  });

  it("builds a complete Letter primary patch", () => {
    expect(buildFullPagePrimaryPatch({ stockId: "letter-primary" })).toEqual(
      expect.objectContaining({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "letter-primary",
        pageSize: "Letter",
        labelWidthMm: 186,
        labelHeightMm: 236,
        perPage: 1,
      }),
    );
  });

  it("routes dense regular primary output to the preferred full-page stock", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeChemical(24)],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "large-primary",
      }),
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE);
    expect(plan.canPrint).toBe(false);
    expect(plan.recommendedFullPageStockId).toBe("letter-primary");
    expect(plan.recommendedFullPagePatch).toEqual(
      expect.objectContaining({ stockPreset: "letter-primary" }),
    );
  });

  it("allows dense content on full-page primary output", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeChemical(24)],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "letter-primary",
      }),
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY);
    expect(plan.canPrint).toBe(true);
  });

  it("treats bilingual complete labels as denser before recommending stock", () => {
    const englishPlan = buildPrintOutputPlan({
      selectedForLabel: [makeChemical(14)],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "large-primary",
        nameDisplay: "en",
      }),
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });
    const bilingualPlan = buildPrintOutputPlan({
      selectedForLabel: [makeChemical(14)],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "large-primary",
        nameDisplay: "both",
      }),
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    expect(englishPlan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY);
    expect(bilingualPlan.state).toBe(
      PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE,
    );
    expect(bilingualPlan.recommendedFullPageStockId).toBe("letter-primary");
  });

  it("keeps compact QR output printable but marks it as supplemental", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeSimpleSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.outputKind).toBe(PRINT_OUTPUT_KIND.QR_SUPPLEMENT);
    expect(plan.canPrint).toBe(true);
  });

  it("keeps dense compact QR output printable as a supplemental label after text compaction", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeDenseSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
        nameDisplay: "both",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.canPrint).toBe(true);
    expect(plan.outputKind).toBe(PRINT_OUTPUT_KIND.QR_SUPPLEMENT);
    expect(plan.issues).toEqual([]);
  });

  it("keeps dense bottle target printable as supplemental instead of forcing Letter", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeHydrochloricAcid()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
        nameDisplay: "both",
      }),
      resolvedLabProfile: {},
      locale: "en-US",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.outputKind).toBe(PRINT_OUTPUT_KIND.SUPPLEMENTAL);
    expect(plan.canPrint).toBe(true);
    expect(plan.issues).toEqual([]);
  });

  it("keeps tube/vial quick-ID output printable but distinct from QR", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeSimpleSupplementalChemical()],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.outputKind).toBe(PRINT_OUTPUT_KIND.QUICK_ID);
    expect(plan.canPrint).toBe(true);
  });
});
