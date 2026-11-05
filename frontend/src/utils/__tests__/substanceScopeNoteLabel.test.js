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

import { render, screen } from "@testing-library/react";
import SubstanceScopeNotes from "@/components/SubstanceScopeNotes";
import { buildPrintPreviewDocument } from "../printLabels";
import { buildPrintLabelContent } from "../printContentModel";
import { estimatePrintContentTextWeight } from "../printFitEngine";
import { buildPreparedSolutionItem } from "../preparedSolution";
import {
  getSubstanceNoteHowTo,
  getSubstanceNoteText,
  getSubstanceNotes,
} from "../substanceNotes";
import { buildSubstanceNoteRisks } from "@/components/label-print/labelPrintModalHelpers";

const HCL_NOTE = Object.freeze({
  code: "hydrogen-chloride-includes-gas",
  text_en:
    "This GHS classification is for hydrogen chloride (CAS 7647-01-0), including the gas, so it can show gas-only hazards such as GHS04. Hydrochloric acid solution supplier labels are usually GHS05 and GHS07 (H290, H314, H335). The SDS of the bottle in hand governs.",
  text_zh:
    "此 GHS 分類是氯化氫（CAS 7647-01-0，含氣體）的分類，可能出現 GHS04 等只適用於氣體的危害。鹽酸水溶液的供應商標籤通常是 GHS05、GHS07（H290、H314、H335）。以手上那瓶的安全資料表（SDS）為準。",
  how_to_en: "Open Details and set the acid's classification as primary.",
  how_to_zh: "開詳細資訊，把鹽酸那筆設為主要。",
  source:
    "Hydrochloric acid solution: CLP Annex VI index 017-002-01-X (H314, H335); H290 from supplier SDS.",
});

// PubChem data for 7647-01-0 (hydrogen chloride, includes the gas).
const hydrogenChloride = Object.freeze({
  cas_number: "7647-01-0",
  cid: 313,
  name_en: "Hydrogen chloride",
  name_zh: "氯化氫",
  found: true,
  ghs_pictograms: [
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    { code: "H280", text_en: "Contains gas under pressure; may explode if heated" },
    { code: "H314", text_en: "Causes severe skin burns and eye damage" },
    { code: "H331", text_en: "Toxic if inhaled" },
  ],
  precautionary_statements: [{ code: "P260", text_en: "Do not breathe gas." }],
  other_classifications: [],
  substance_notes: [HCL_NOTE],
});

const preview = (chemical, layout) =>
  buildPrintPreviewDocument(
    [chemical],
    { labelPurpose: "shipping", nameDisplay: "en", ...layout },
    {},
    {},
    {},
    {},
    { mode: "label" },
  ).fragmentHtml;

describe("substance scope notes", () => {
  it("never prints what to do on the site", () => {
    const html = preview(hydrogenChloride, { template: "full", stockPreset: "a4-primary" });

    expect(html).toContain('data-testid="substance-scope-notes"');
    expect(html).not.toContain(HCL_NOTE.how_to_en);
    expect(buildSubstanceNoteRisks({
      previewChem: hydrogenChloride,
      locale: "en",
      tx: (_key, _fallback, { note }) => note,
    })[0]).not.toContain(HCL_NOTE.how_to_en);
  });

  it("shows what to do on the site", () => {
    render(<SubstanceScopeNotes chemical={hydrogenChloride} compact />);

    expect(screen.getByRole("note")).toHaveTextContent(HCL_NOTE.how_to_en);
  });

  it("shows only the note when it says nothing about the site", () => {
    const { how_to_en, how_to_zh, ...noteWithoutHowTo } = HCL_NOTE;
    expect(getSubstanceNoteHowTo(noteWithoutHowTo, "zh-TW")).toBe("");
    expect(getSubstanceNoteHowTo(HCL_NOTE, "en")).toBe(how_to_en);
    expect(getSubstanceNoteHowTo(HCL_NOTE, "zh-TW")).toBe(how_to_zh);
  });

  it("reads valid notes and localizes them", () => {
    expect(getSubstanceNotes(hydrogenChloride)).toHaveLength(1);
    expect(getSubstanceNotes({ substance_notes: [{ code: "x" }, null] })).toEqual([]);
    expect(getSubstanceNotes({})).toEqual([]);
    expect(getSubstanceNoteText(HCL_NOTE, "zh-TW")).toBe(HCL_NOTE.text_zh);
    expect(getSubstanceNoteText(HCL_NOTE, "en")).toBe(HCL_NOTE.text_en);
  });

  it.each([
    ["large primary", { template: "full", stockPreset: "large-primary" }],
    ["A4 primary", { template: "full", stockPreset: "a4-primary" }],
    ["Letter primary", { template: "full", stockPreset: "letter-primary" }],
  ])("complete label (%s) prints the hydrogen chloride note and every pictogram", (_label, layout) => {
    const html = preview(hydrogenChloride, layout);
    expect(html).toContain('data-testid="substance-scope-notes"');
    expect(html).toContain('data-substance-note-code="hydrogen-chloride-includes-gas"');
    expect(html).toContain("hydrogen chloride (CAS 7647-01-0), including the gas");
    expect(html).toContain("Hydrogen chloride");
    // The note never hides or swaps the classification.
    ["GHS04", "GHS05", "GHS06", "GHS07"].forEach((code) =>
      expect(html).toContain(`${code}.svg`),
    );
    ["H280", "H314", "H331"].forEach((code) => expect(html).toContain(code));
  });

  it("prints the note in both languages on a bilingual complete label", () => {
    const html = preview(hydrogenChloride, {
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
    });
    expect(html).toContain("氯化氫（CAS 7647-01-0，含氣體）");
    expect(html).toContain("including the gas");
  });

  it.each([
    ["QR small label", { labelPurpose: "qrSupplement", template: "qrcode", stockPreset: "brother-62mm-continuous" }],
    ["identification small label", { labelPurpose: "quickId", template: "icon", stockPreset: "avery-5163" }],
  ])("%s carries no note text (small-label contract) but keeps every pictogram", (_label, layout) => {
    const html = preview(hydrogenChloride, layout);
    expect(html).not.toContain("substance-scope-notes");
    ["GHS04", "GHS05", "GHS06", "GHS07"].forEach((code) =>
      expect(html).toContain(`${code}.svg`),
    );
  });

  it("prepared hydrogen chloride in water keeps the note on the complete label", () => {
    const prepared = buildPreparedSolutionItem(hydrogenChloride, {
      concentration: "1 M",
      solvent: "Water",
    });
    expect(prepared.substance_notes).toEqual([HCL_NOTE]);
    const html = preview(prepared, { template: "full", stockPreset: "a4-primary" });
    expect(html).toContain('data-substance-note-code="hydrogen-chloride-includes-gas"');
  });

  it("counts the note text in the complete-label fit estimate", () => {
    const layout = { labelPurpose: "shipping", template: "full", stockPreset: "a4-primary" };
    const withNote = buildPrintLabelContent(hydrogenChloride, { layout, locale: "en" });
    const withoutNote = buildPrintLabelContent(
      { ...hydrogenChloride, substance_notes: [] },
      { layout, locale: "en" },
    );
    expect(
      estimatePrintContentTextWeight(withNote, layout, "en") -
        estimatePrintContentTextWeight(withoutNote, layout, "en"),
    ).toBe(HCL_NOTE.text_en.length);
  });

  it("puts the note in the label preview notes", () => {
    const tx = (key, fallback, options = {}) =>
      String(fallback).replace(/\{\{(\w+)\}\}/g, (_m, name) => options[name] ?? "");
    expect(
      buildSubstanceNoteRisks({ previewChem: hydrogenChloride, locale: "zh-TW", tx }),
    ).toEqual([`Substance note: ${HCL_NOTE.text_zh}`]);
    expect(
      buildSubstanceNoteRisks({
        previewChem: { ...hydrogenChloride, substance_notes: [] },
        locale: "en",
        tx,
      }),
    ).toEqual([]);
  });
});
