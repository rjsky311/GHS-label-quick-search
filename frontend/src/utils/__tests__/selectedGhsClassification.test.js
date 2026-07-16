import {
  applySelectedGhsClassification,
  getGhsClassificationFingerprint,
  listGhsClassifications,
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

  it("uses a stable classification fingerprint when reports reorder", () => {
    const classifications = listGhsClassifications(chemical);
    const alternateFingerprint = getGhsClassificationFingerprint(
      classifications[1],
    );
    const reorderedChemical = {
      ...chemical,
      ghs_pictograms: classifications[1].pictograms,
      hazard_statements: classifications[1].hazard_statements,
      precautionary_statements: classifications[1].precautionary_statements,
      signal_word: classifications[1].signal_word,
      signal_word_zh: classifications[1].signal_word_zh,
      primary_source: classifications[1].source,
      primary_report_count: classifications[1].report_count,
      other_classifications: [
        {
          pictograms: classifications[0].pictograms,
          hazard_statements: classifications[0].hazard_statements,
          precautionary_statements: classifications[0].precautionary_statements,
          signal_word: classifications[0].signal_word,
          signal_word_zh: classifications[0].signal_word_zh,
          source: classifications[0].source,
          report_count: classifications[0].report_count,
        },
      ],
    };

    const selected = resolveSelectedGhsClassification(reorderedChemical, {
      "64-17-5": {
        selectedIndex: 1,
        classificationFingerprint: alternateFingerprint,
        note: "Use alternate",
      },
    });

    expect(selected).toMatchObject({
      signal_word: "Warning",
      source: "Alternate SDS",
      report_count: "3",
      isCustom: true,
      customIndex: 0,
    });
  });
});
