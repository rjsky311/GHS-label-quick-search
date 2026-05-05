import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
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

  it("keeps compact QR output printable but marks it as supplemental", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [makeChemical(8)],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.canPrint).toBe(true);
  });
});
