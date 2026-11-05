jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

jest.mock("@/constants/ghs", () => ({
  GHS_IMAGES: {
    GHS02: "https://example.com/GHS02.svg",
    GHS06: "https://example.com/GHS06.svg",
    GHS07: "https://example.com/GHS07.svg",
    GHS08: "https://example.com/GHS08.svg",
  },
}));

import { buildPrintPreviewDocument } from "../printLabels";
import { buildPreparedSolutionItem } from "../preparedSolution";
import { buildPreparedSolventRisk } from "@/components/label-print/labelPrintModalHelpers";

const parentX = {
  cas_number: "7647-14-5",
  name_en: "Compound X",
  name_zh: "化合物 X",
  found: true,
  ghs_pictograms: [{ code: "GHS07" }],
  hazard_statements: [{ code: "H302", text_en: "Harmful if swallowed" }],
  precautionary_statements: [{ code: "P264", text_en: "Wash hands thoroughly after handling." }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  other_classifications: [],
};

const methanolResult = {
  cas_number: "67-56-1",
  name_en: "Methanol",
  name_zh: "甲醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS06" }, { code: "GHS08" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour" },
    { code: "H301", text_en: "Toxic if swallowed" },
    { code: "H311", text_en: "Toxic in contact with skin" },
    { code: "H331", text_en: "Toxic if inhaled" },
    { code: "H370", text_en: "Causes damage to organs" },
  ],
  precautionary_statements: [{ code: "P210", text_en: "Keep away from heat." }],
  signal_word: "Danger",
  signal_word_zh: "危險",
};

const form = (solvent) => ({
  concentration: "10 mM",
  solvent,
  preparedBy: "A. Chen",
  preparedDate: "2026-11-04",
  expiryDate: "2026-12-04",
});

const inMethanol = buildPreparedSolutionItem(parentX, form("Methanol"), {
  solventResult: methanolResult,
});
const inMethanolNotFound = buildPreparedSolutionItem(parentX, form("Methanol"), {
  solventResult: { found: false },
});
const inWater = buildPreparedSolutionItem(parentX, form("Water"));

const preview = (item, layout) =>
  buildPrintPreviewDocument(
    [item],
    { labelPurpose: "shipping", nameDisplay: "en", ...layout },
    {},
    {},
    {},
    {},
    { mode: "label" },
  ).fragmentHtml;

const COMPLETE_LAYOUTS = [
  ["complete label (large primary)", { template: "full", stockPreset: "large-primary" }],
  ["full-page A4 primary", { template: "full", stockPreset: "a4-primary" }],
];

describe("prepared-solution labels with a solvent other than water", () => {
  it.each(COMPLETE_LAYOUTS)(
    "X in methanol: %s carries methanol's pictograms, H codes, Danger, and the solvent line",
    (_label, layout) => {
      const html = preview(inMethanol, layout);
      ["GHS02", "GHS06", "GHS07", "GHS08"].forEach((code) =>
        expect(html).toContain(`GHS${code.slice(3)}.svg`),
      );
      ["H302", "H225", "H301", "H311", "H331", "H370"].forEach((code) =>
        expect(html).toContain(code),
      );
      expect(html).toMatch(/Danger/);
      expect(html).toContain('data-solvent-hazard-status="included"');
      expect(html).toContain(
        "Includes solvent hazards: Methanol (CAS 67-56-1). Not reduced for dilution.",
      );
      // Parent identity and operational fields are kept.
      expect(html).toContain("7647-14-5");
      expect(html).toContain("A. Chen");
      expect(html).toContain("2026-12-04");
    },
  );

  it.each(COMPLETE_LAYOUTS)(
    "X in methanol (solvent not found): %s prints the 'not included' warning",
    (_label, layout) => {
      const html = preview(inMethanolNotFound, layout);
      expect(html).toContain('data-solvent-hazard-status="not_included"');
      expect(html).toContain(
        "Solvent hazards not included: Methanol. Check the solvent&#39;s SDS.",
      );
      // The parent's hazards are still printed as-is.
      expect(html).toContain("GHS07.svg");
      expect(html).toContain("H302");
      expect(html).not.toContain("H370");
    },
  );

  it("container front label shows a solvent chip", () => {
    const included = preview(inMethanol, {
      template: "standard",
      stockPreset: "medium-bottle",
    });
    expect(included).toContain("Incl. solvent hazards");
    expect(included).toContain("H370");

    const missing = preview(inMethanolNotFound, {
      template: "standard",
      stockPreset: "medium-bottle",
    });
    expect(missing).toContain("meta-chip-prepared-solvent-missing");
    expect(missing).toContain("Solvent hazards not included");
  });
});

describe("prepared-solution small container front label", () => {
  it.each(["small-strip", "small-rack"])("%s names the concentration and the solvent", (stockPreset) => {
    const html = preview(inMethanol, { template: "standard", stockPreset });
    expect(html).toContain("10 mM");
    expect(html).toContain("Methanol");
  });
});

describe("prepared-solution labels in water", () => {
  it.each(COMPLETE_LAYOUTS)("X in water: %s is unchanged and has no solvent line", (_label, layout) => {
    const html = preview(inWater, layout);
    expect(html).not.toContain('data-testid="prepared-solvent-hazards"');
    expect(html).not.toContain("solvent hazards");
    expect(html).toContain("GHS07.svg");
    expect(html).toContain("H302");
    expect(html).not.toContain("GHS06.svg");
  });
});

describe("label preview note for the solvent", () => {
  const tx = (key, fallback, options = {}) =>
    String(fallback).replace(/\{\{(\w+)\}\}/g, (_m, name) => options[name] ?? "");

  it("warns when a non-water solvent is not included", () => {
    expect(
      buildPreparedSolventRisk({ previewChem: inMethanolNotFound, locale: "en", tx }),
    ).toBe('Solvent hazards for "Methanol" are not included. Check the solvent\'s SDS.');
  });

  it("says which solvent was added", () => {
    expect(
      buildPreparedSolventRisk({ previewChem: inMethanol, locale: "zh-TW", tx }),
    ).toBe("Hazards of the solvent 甲醇 (CAS 67-56-1) are added to this label.");
  });

  it("stays silent for water and for ordinary chemicals", () => {
    expect(buildPreparedSolventRisk({ previewChem: inWater, locale: "en", tx })).toBe("");
    expect(buildPreparedSolventRisk({ previewChem: parentX, locale: "en", tx })).toBe("");
  });
});

describe("prepared-solution small labels", () => {
  const SMALL_LAYOUTS = [
    ["quick ID", { labelPurpose: "quickId", template: "icon", stockPreset: "small-strip" }],
    [
      "QR",
      {
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "brother-62mm-continuous",
      },
    ],
  ];
  const WARNING = 'data-testid="small-prepared-warning"';
  const IDENTITY = 'data-testid="small-prepared-identity"';

  it.each(SMALL_LAYOUTS)("%s: names the concentration and solvent", (_label, layout) => {
    expect(preview(inWater, layout)).toMatch(/small-prepared-identity[^>]*>10 mM in Water</);
    expect(preview(inMethanol, layout)).toMatch(/small-prepared-identity[^>]*>10 mM in Methanol</);
  });

  it.each(SMALL_LAYOUTS)("%s: a merged solvent adds its pictograms and no warning", (_label, layout) => {
    const html = preview(inMethanol, layout);
    expect(html).toContain("GHS06.svg");
    expect(html).toContain("GHS07.svg");
    expect(html).not.toContain(WARNING);
  });

  it.each(SMALL_LAYOUTS)("%s: warns on the label when the solvent lookup failed", (_label, layout) => {
    const html = preview(inMethanolNotFound, layout);
    expect(html).toContain(WARNING);
    expect(html).toContain("Solvent hazards not included");
    expect(html).toContain("10 mM in Methanol");
  });

  it.each(SMALL_LAYOUTS)("%s: water needs no warning", (_label, layout) => {
    expect(preview(inWater, layout)).not.toContain(WARNING);
  });

  it.each(SMALL_LAYOUTS)("%s: an old record with no status warns unless water", (_label, layout) => {
    const oldRecord = (solvent) => {
      const item = buildPreparedSolutionItem(parentX, form(solvent));
      const { solventHazards: _dropped, ...preparedSolution } = item.preparedSolution;
      return { ...item, preparedSolution };
    };
    expect(preview(oldRecord("Methanol"), layout)).toContain(WARNING);
    expect(preview(oldRecord("Water"), layout)).not.toContain(WARNING);
  });

  it.each(SMALL_LAYOUTS)("%s: the pure substance has no solution line", (_label, layout) => {
    const html = preview(parentX, layout);
    expect(html).not.toContain(IDENTITY);
    expect(html).not.toContain(WARNING);
  });

  it.each(SMALL_LAYOUTS)("%s: escapes what the user typed", (_label, layout) => {
    const item = buildPreparedSolutionItem(
      parentX,
      { ...form("Water"), concentration: "<b>1 M</b>" },
    );
    const html = preview(item, layout);
    expect(html).not.toContain("<b>1 M</b>");
    expect(html).toContain("&lt;b&gt;1 M&lt;/b&gt;");
  });
});
