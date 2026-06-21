import {
  applySelectedGhsClassification,
  resolveSelectedGhsClassification,
} from "@/utils/selectedGhsClassification";

const chemical = {
  cas_number: "64-17-5",
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225" }],
  precautionary_statements: [{ code: "P210" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  primary_source: "Primary PubChem",
  primary_report_count: "12",
  other_classifications: [
    {
      pictograms: [{ code: "GHS07" }],
      hazard_statements: [{ code: "H302" }],
      precautionary_statements: [{ code: "P264" }],
      signal_word: "Warning",
      signal_word_zh: "警告",
      source: "Alternate SDS",
      report_count: "3",
    },
  ],
};

describe("selectedGhsClassification", () => {
  it("uses primary classification when there is no valid custom index", () => {
    const selected = resolveSelectedGhsClassification(chemical, {
      "64-17-5": { selectedIndex: 99, note: "out of range" },
    });

    expect(selected).toMatchObject({
      pictograms: [{ code: "GHS02" }],
      signal_word: "Danger",
      source: "Primary PubChem",
      report_count: "12",
      isCustom: false,
      customIndex: 0,
    });
  });

  it("applies a selected alternate classification to print chemicals", () => {
    const effective = applySelectedGhsClassification(chemical, {
      "64-17-5": { selectedIndex: 1, note: "Use alternate" },
    });

    expect(effective).toMatchObject({
      ghs_pictograms: [{ code: "GHS07" }],
      hazard_statements: [{ code: "H302" }],
      precautionary_statements: [{ code: "P264" }],
      signal_word: "Warning",
      signal_word_zh: "警告",
      primary_source: "Alternate SDS",
      primary_report_count: "3",
      selected_classification_index: 1,
      customNote: "Use alternate",
    });
  });
});
