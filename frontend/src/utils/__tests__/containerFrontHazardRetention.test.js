jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

jest.mock("@/constants/ghs", () => ({
  GHS_IMAGES: {
    GHS02: "https://example.com/GHS02.svg",
    GHS07: "https://example.com/GHS07.svg",
    GHS08: "https://example.com/GHS08.svg",
  },
}));

import { LABEL_STOCK_PRESETS, isFullPagePrimaryStockId } from "@/constants/labelStocks";
import { buildPrintPreviewDocument } from "../printLabels";

const benzene = {
  cas_number: "71-43-2",
  name_en: "Benzene",
  name_zh: "苯",
  found: true,
  signal_word: "Danger",
  signal_word_zh: "危險",
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS07" }, { code: "GHS08" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour" },
    { code: "H304", text_en: "May be fatal if swallowed and enters airways" },
    { code: "H315", text_en: "Causes skin irritation" },
    { code: "H319", text_en: "Causes serious eye irritation" },
    { code: "H340", text_en: "May cause genetic defects" },
    { code: "H350", text_en: "May cause cancer" },
    { code: "H372", text_en: "Causes damage to organs through prolonged or repeated exposure" },
  ],
  precautionary_statements: [
    { code: "P501", text_en: "Dispose of contents" },
    { code: "P210", text_en: "Keep away from heat" },
    { code: "P201", text_en: "Obtain special instructions before use" },
  ],
};

const dichloromethane = {
  cas_number: "75-09-2",
  name_en: "Dichloromethane",
  name_zh: "二氯甲烷",
  found: true,
  signal_word: "Warning",
  signal_word_zh: "警告",
  ghs_pictograms: [{ code: "GHS07" }, { code: "GHS08" }],
  hazard_statements: [
    { code: "H315", text_en: "Causes skin irritation" },
    { code: "H319", text_en: "Causes serious eye irritation" },
    { code: "H336", text_en: "May cause drowsiness or dizziness" },
    { code: "H351", text_en: "Suspected of causing cancer" },
  ],
  precautionary_statements: [],
};

const containerFrontStockIds = LABEL_STOCK_PRESETS.filter(
  (preset) => !isFullPagePrimaryStockId(preset.id),
).map((preset) => preset.id);

const previewContainerFront = (chemical, stockPreset, nameDisplay = "both") =>
  buildPrintPreviewDocument(
    [chemical],
    { labelPurpose: "shipping", template: "standard", stockPreset, nameDisplay },
    {},
    {},
    {},
    {},
    { mode: "label" },
  );

const expectHazardCodePrinted = (html, code) => {
  // Either the full summary (code + wording) or the code-only chip.
  expect(
    html.includes(`hazard-summary-code">${code}<`) ||
      html.includes(`hazard-code-only">${code}<`),
  ).toBe(true);
};

describe("container front labels keep every H code", () => {
  it("covers the smallest container front stocks", () => {
    expect(containerFrontStockIds).toEqual(
      expect.arrayContaining(["small-strip", "small-rack", "medium-bottle", "large-primary"]),
    );
  });

  it.each(containerFrontStockIds)(
    "benzene on %s keeps H350, H340, and H372 (and every other H code)",
    (stockPreset) => {
      const preview = previewContainerFront(benzene, stockPreset);
      expect(preview.fragmentHtml).toContain("label-standard");
      ["H350", "H340", "H372"].forEach((code) =>
        expectHazardCodePrinted(preview.fragmentHtml, code),
      );
      benzene.hazard_statements.forEach(({ code }) =>
        expectHazardCodePrinted(preview.fragmentHtml, code),
      );
      expect(preview.fragmentHtml).not.toContain("more hazard(s)");
      expect(preview.fragmentHtml).not.toMatch(/<div\s+class="hazard-more"/);
    },
  );

  it("benzene on the smallest stock leads with the severe hazards", () => {
    const html = previewContainerFront(benzene, "small-strip", "en").fragmentHtml;
    const position = (code) =>
      Math.max(
        html.indexOf(`hazard-summary-code">${code}<`),
        html.indexOf(`hazard-code-only">${code}<`),
      );
    expect(position("H350")).toBeLessThan(position("H315"));
    expect(position("H340")).toBeLessThan(position("H225"));
  });

  it.each(containerFrontStockIds)(
    "dichloromethane on %s keeps H351",
    (stockPreset) => {
      const preview = previewContainerFront(dichloromethane, stockPreset);
      expectHazardCodePrinted(preview.fragmentHtml, "H351");
    },
  );

  it("shows a visible count when statements beyond the text budget print as codes only", () => {
    // Roomy summary mode: large stock with English-only names prints wording
    // for the first statements and codes for the rest.
    const configs = containerFrontStockIds.map((stockPreset) =>
      previewContainerFront(benzene, stockPreset, "en"),
    );
    const summaryWithOverflow = configs.find((preview) =>
      preview.fragmentHtml.includes('data-testid="hazard-overflow-codes"'),
    );
    expect(summaryWithOverflow).toBeTruthy();
    const match = summaryWithOverflow.fragmentHtml.match(
      /data-hazard-text-omitted-count="(\d+)"/,
    );
    expect(match).not.toBeNull();
    const fullTextCount = (
      summaryWithOverflow.fragmentHtml.match(/hazard-summary-code">/g) || []
    ).length;
    expect(fullTextCount + Number(match[1])).toBe(benzene.hazard_statements.length);
    expect(summaryWithOverflow.fragmentHtml).toContain(
      `${match[1]} more as H code only`,
    );
  });
});
