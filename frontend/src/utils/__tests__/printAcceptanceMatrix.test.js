jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

jest.mock("@/constants/ghs", () => ({
  GHS_IMAGES: {
    GHS02: "https://example.com/GHS02.svg",
    GHS04: "https://example.com/GHS04.svg",
    GHS05: "https://example.com/GHS05.svg",
    GHS06: "https://example.com/GHS06.svg",
    GHS07: "https://example.com/GHS07.svg",
  },
}));

import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import { buildPrintOutputPlan, PRINT_OUTPUT_PLAN_STATE } from "../printOutputPlanner";
import { buildPrintPreviewDocument } from "../printLabels";

const completeProfile = {
  organization: "Lab A",
  phone: "02-1234",
  address: "Taipei",
};

const hydrochloricAcid = {
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  name_zh: "鹽酸",
  cid: 313,
  ghs_pictograms: [
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    { code: "H335", text_en: "May cause respiratory irritation" },
    { code: "H280", text_en: "Contains gas under pressure" },
    { code: "H290", text_en: "May be corrosive to metals" },
    { code: "H314", text_en: "Causes severe skin burns and eye damage" },
    { code: "H318", text_en: "Causes serious eye damage" },
    { code: "H331", text_en: "Toxic if inhaled" },
  ],
  precautionary_statements: [
    { code: "P501", text_en: "Dispose of contents in accordance with regulations" },
    { code: "P403+P233", text_en: "Store in a well-ventilated place" },
    { code: "P280", text_en: "Wear protective gloves and eye protection" },
    { code: "P301+P330+P331", text_en: "IF SWALLOWED: rinse mouth" },
    { code: "P304+P340", text_en: "IF INHALED: remove person to fresh air" },
    { code: "P305+P351+P338", text_en: "IF IN EYES: rinse cautiously" },
  ],
};

const ethanol = {
  cas_number: "64-17-5",
  name_en: "Ethanol",
  name_zh: "乙醇",
  cid: 702,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour" },
    { code: "H319", text_en: "Causes serious eye irritation" },
  ],
  precautionary_statements: [
    { code: "P210", text_en: "Keep away from heat" },
    { code: "P280", text_en: "Wear eye protection" },
  ],
};

const water = {
  cas_number: "7732-18-5",
  name_en: "Water",
  name_zh: "水",
  ghs_pictograms: [],
  signal_word: "",
  hazard_statements: [],
  precautionary_statements: [],
};

const upstreamErrorChemical = {
  ...water,
  cas_number: "9999-99-9",
  name_en: "Upstream Error",
  upstream_error: true,
};

const previewLabel = (chemical, labelConfig, labProfile = completeProfile) =>
  buildPrintPreviewDocument(
    [chemical],
    labelConfig,
    {},
    {},
    {},
    labProfile,
    { mode: "label" },
  );

const expectEveryPictogram = (html, codes) => {
  codes.forEach((code) => {
    expect(html).toContain(`alt="${code}"`);
  });
};

const mmValue = (value) => Number.parseFloat(String(value).replace("mm", ""));

describe("print acceptance matrix", () => {
  it("renders complete A4 primary labels without QR or H/P summaries", () => {
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    });

    expect(preview.fragmentHtml).toContain("label-kind-complete-primary");
    expect(preview.fragmentHtml).toContain("label-a4-primary");
    expect(preview.fragmentHtml).not.toContain("qrcode-img");
    expect(preview.fragmentHtml).not.toContain("hazard-more");
    expect(preview.fragmentHtml).not.toContain("precaution-more");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
    hydrochloricAcid.hazard_statements.forEach((statement) => {
      expect(preview.fragmentHtml).toContain(`>${statement.code}</span>`);
    });
    hydrochloricAcid.precautionary_statements.forEach((statement) => {
      expect(preview.fragmentHtml).toContain(`>${statement.code}</span>`);
    });
  });

  it("renders complete Letter primary labels on Letter paper without QR", () => {
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "letter-primary",
      nameDisplay: "both",
    });

    expect(preview.fragmentHtml).toContain("label-kind-complete-primary");
    expect(preview.fragmentHtml).toContain("label-letter-primary");
    expect(preview.html).toContain("size: Letter");
    expect(preview.fragmentHtml).not.toContain("qrcode-img");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
  });

  it("keeps standard bottle labels printable as supplemental with all pictograms", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    });
    const plan = buildPrintOutputPlan({
      selectedForLabel: [hydrochloricAcid],
      layout,
      resolvedLabProfile: {},
      locale: "zh-TW",
    });
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    }, {});

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE);
    expect(plan.canPrint).toBe(true);
    expect(preview.fragmentHtml).toContain("label-kind-supplemental");
    expect(preview.fragmentHtml).toContain("label-form-bottle");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
    expect(preview.fragmentHtml).not.toContain("more-pics");
  });

  it("allows a roomy large primary stock to stay complete for a dense common chemical", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "large-primary",
      nameDisplay: "both",
    });
    const plan = buildPrintOutputPlan({
      selectedForLabel: [hydrochloricAcid],
      layout,
      resolvedLabProfile: completeProfile,
      locale: "zh-TW",
    });
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "large-primary",
      nameDisplay: "both",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.READY);
    expect(plan.canPrint).toBe(true);
    expect(preview.fragmentHtml).toContain("label-kind-complete-primary");
    expect(preview.fragmentHtml).not.toContain("hazard-more");
    expect(preview.fragmentHtml).not.toContain("precaution-more");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
  });

  it("routes dense medium sheet stock to a printable supplemental label instead of pretending it is complete", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "avery-5163",
      nameDisplay: "both",
    });
    const plan = buildPrintOutputPlan({
      selectedForLabel: [hydrochloricAcid],
      layout,
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });
    const supplementalPreview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "avery-5163",
      nameDisplay: "both",
    }, {});

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE);
    expect(plan.recommendedFullPageStockId).toBe("letter-primary");
    expect(supplementalPreview.fragmentHtml).toContain("label-kind-supplemental");
    expect(supplementalPreview.fragmentHtml).not.toContain("label-kind-complete-primary");
    expectEveryPictogram(supplementalPreview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
  });

  it("uses a strip pictogram row for small supplemental stock", () => {
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "small-strip",
      nameDisplay: "both",
    }, {});

    expect(preview.fragmentHtml).toContain("label-kind-supplemental");
    expect(preview.fragmentHtml).toContain("label-form-strip");
    expect(preview.html).toContain("grid-template-columns: repeat(4, 9.1mm)");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
  });

  it("scales pictogram and text budgets by physical stock size before content is summarized", () => {
    const strip = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "small-strip",
      nameDisplay: "both",
    });
    const bottle = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    });
    const large = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "large-primary",
      nameDisplay: "both",
    });

    expect(mmValue(strip.typography.standardPictogramSize)).toBeLessThan(
      mmValue(bottle.typography.standardPictogramSize),
    );
    expect(mmValue(bottle.typography.standardPictogramSize)).toBeLessThan(
      mmValue(large.typography.standardPictogramSize),
    );
    expect(strip.templateBudgets.standard.primaryHazards).toBeLessThan(
      bottle.templateBudgets.standard.primaryHazards,
    );
    expect(bottle.templateBudgets.standard.primaryHazards).toBeLessThanOrEqual(
      large.templateBudgets.standard.primaryHazards,
    );
  });

  it("keeps custom tiny shipping stock from bypassing the full-page-primary recommendation", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "custom",
      labelWidthMm: 45,
      labelHeightMm: 28,
      nameDisplay: "both",
    });
    const plan = buildPrintOutputPlan({
      selectedForLabel: [hydrochloricAcid],
      layout,
      resolvedLabProfile: completeProfile,
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE);
    expect(plan.canPrint).toBe(false);
    expect(plan.recommendedFullPageStockId).toBe("a4-primary");
  });

  it("still lets custom supplemental stock print an honest compact hazard label with every pictogram", () => {
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "custom",
      labelWidthMm: 45,
      labelHeightMm: 28,
      nameDisplay: "both",
    }, {});

    expect(preview.fragmentHtml).toContain("label-kind-supplemental");
    expect(preview.fragmentHtml).not.toContain("label-kind-complete-primary");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
    expect(preview.fragmentHtml).not.toContain("more-pics");
  });

  it("renders English black-and-white QR supplement with QR and all pictograms", () => {
    const preview = previewLabel(hydrochloricAcid, {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "bw",
    }, {});

    expect(preview.html).toContain("print-bw");
    expect(preview.fragmentHtml).toContain("label-kind-qr-supplement");
    expect(preview.fragmentHtml).toContain("qrcode-img");
    expect(preview.fragmentHtml).not.toContain("鹽酸");
    expectEveryPictogram(preview.fragmentHtml, ["GHS04", "GHS05", "GHS06", "GHS07"]);
    expect(preview.fragmentHtml).not.toContain("more-pics");
  });

  it("makes orientation and page-size changes visible in preview and print HTML", () => {
    const strip = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "small-strip",
      nameDisplay: "en",
    }, {});
    const letter = previewLabel(hydrochloricAcid, {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "letter-primary",
      nameDisplay: "en",
    });

    expect(strip.html).toContain("size: A4 landscape");
    expect(strip.model.layout.orientation).toBe("landscape");
    expect(letter.html).toContain("size: Letter");
    expect(letter.model.layout.page.size).toBe("Letter");
  });

  it("keeps lower-density ethanol bottle output readable and printable", () => {
    const layout = resolvePrintLayoutConfig({
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    });
    const plan = buildPrintOutputPlan({
      selectedForLabel: [ethanol],
      layout,
      resolvedLabProfile: {},
      locale: "zh-TW",
    });
    const preview = previewLabel(ethanol, {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
    }, {});

    expect(plan.canPrint).toBe(true);
    expect(preview.fragmentHtml).toContain("label-kind-supplemental");
    expectEveryPictogram(preview.fragmentHtml, ["GHS02", "GHS07"]);
    expect(preview.fragmentHtml).not.toContain("hazard-more");
  });

  it("does not present no-GHS chemicals as printable hazard labels", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [water],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA);
    expect(plan.canPrint).toBe(false);
    expect(plan.issues).toContainEqual({ type: "missing-hazard-data" });
  });

  it("distinguishes upstream lookup failure from confirmed no-GHS content", () => {
    const plan = buildPrintOutputPlan({
      selectedForLabel: [upstreamErrorChemical],
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
      }),
      resolvedLabProfile: {},
      locale: "zh-TW",
    });

    expect(plan.state).toBe(PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA);
    expect(plan.canPrint).toBe(false);
    expect(plan.issues).toContainEqual({ type: "upstream-error" });
    expect(plan.issues).toContainEqual({ type: "missing-hazard-data" });
  });
});
