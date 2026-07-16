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
    const reorderedPrimary = {
      pictograms: [{ code: "GHS08" }],
      hazard_statements: [{ code: "H373" }],
      precautionary_statements: [{ code: "P260" }],
      signal_word: "Warning",
      signal_word_zh: "警告",
      source: "Third reordered report",
      report_count: "1",
    };
    const reorderedChemical = {
      ...chemical,
      ghs_pictograms: reorderedPrimary.pictograms,
      hazard_statements: reorderedPrimary.hazard_statements,
      precautionary_statements: reorderedPrimary.precautionary_statements,
      signal_word: reorderedPrimary.signal_word,
      signal_word_zh: reorderedPrimary.signal_word_zh,
      primary_source: reorderedPrimary.source,
      primary_report_count: reorderedPrimary.report_count,
      other_classifications: [
        {
          ...classifications[1],
        },
        {
          ...classifications[0],
        },
      ],
    };

    const selected = resolveSelectedGhsClassification(reorderedChemical, {
      "64-17-5": {
        // The stale UI index points at the original primary report (index 2
        // after reorder); the fingerprint target is now at the nonzero index 1.
        selectedIndex: 2,
        classificationFingerprint: alternateFingerprint,
        note: "Use alternate",
      },
    });

    expect(selected).toMatchObject({
      signal_word: "Warning",
      source: "Alternate SDS",
      report_count: "3",
      isCustom: true,
      customIndex: 1,
    });
  });
});
