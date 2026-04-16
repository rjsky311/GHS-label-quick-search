import { hasGhsData, hasRenderableGhsVisual } from "../ghsAvailability";

describe("hasGhsData", () => {
  it("returns false for null / undefined", () => {
    expect(hasGhsData(null)).toBe(false);
    expect(hasGhsData(undefined)).toBe(false);
  });

  it("returns false for an empty classification object", () => {
    expect(hasGhsData({})).toBe(false);
    expect(
      hasGhsData({
        pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
        signal_word: null,
      })
    ).toBe(false);
  });

  it("returns true when only pictograms has an entry", () => {
    expect(hasGhsData({ pictograms: [{ code: "GHS02" }] })).toBe(true);
  });

  it("returns true when only hazard_statements has an entry", () => {
    expect(
      hasGhsData({ hazard_statements: [{ code: "H225", text_zh: "x" }] })
    ).toBe(true);
  });

  it("returns true when only precautionary_statements has an entry", () => {
    expect(
      hasGhsData({
        precautionary_statements: [{ code: "P210", text_zh: "x" }],
      })
    ).toBe(true);
  });

  it("returns true when only signal_word is present", () => {
    expect(hasGhsData({ signal_word: "Danger" })).toBe(true);
    // Explicit empty arrays alongside the signal word — still true
    expect(
      hasGhsData({
        pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
        signal_word: "Warning",
      })
    ).toBe(true);
  });

  it("accepts both shapes (pictograms and ghs_pictograms)", () => {
    // The shape returned by getEffectiveClassification
    expect(hasGhsData({ pictograms: [{ code: "GHS07" }] })).toBe(true);
    // The raw ChemicalResult shape
    expect(hasGhsData({ ghs_pictograms: [{ code: "GHS07" }] })).toBe(true);
  });
});

describe("hasRenderableGhsVisual", () => {
  it("returns false for null / undefined / not-found results", () => {
    expect(hasRenderableGhsVisual(null)).toBe(false);
    expect(hasRenderableGhsVisual(undefined)).toBe(false);
    expect(hasRenderableGhsVisual({ found: false })).toBe(false);
  });

  it("returns false when found but no pictograms and no other_classifications", () => {
    expect(
      hasRenderableGhsVisual({
        found: true,
        ghs_pictograms: [],
        other_classifications: [],
        hazard_statements: [{ code: "H225", text_zh: "x" }],
        signal_word: "Danger",
      })
    ).toBe(false);
  });

  it("returns true when found and has at least one pictogram", () => {
    expect(
      hasRenderableGhsVisual({
        found: true,
        ghs_pictograms: [{ code: "GHS02" }],
      })
    ).toBe(true);
  });

  it("returns true when found and has at least one alternate classification WITH pictograms", () => {
    expect(
      hasRenderableGhsVisual({
        found: true,
        ghs_pictograms: [],
        other_classifications: [
          { pictograms: [{ code: "GHS07" }], hazard_statements: [] },
        ],
      })
    ).toBe(true);
  });

  it("returns false when primary and ALL alternates have no pictograms (regression for Codex PR #10 review)", () => {
    // This is the key case: the result is found, there's genuine GHS
    // data (H-codes and a signal word), but nothing here has any
    // pictogram for the existing visual block to draw. ResultsTable
    // should fall through to its `results.noHazard` branch, not into
    // the pictogram block that would render nothing.
    expect(
      hasRenderableGhsVisual({
        found: true,
        ghs_pictograms: [],
        hazard_statements: [{ code: "H302", text_zh: "x" }],
        signal_word: "Warning",
        other_classifications: [
          {
            pictograms: [],
            hazard_statements: [{ code: "H302", text_zh: "x" }],
            signal_word: "Warning",
          },
        ],
      })
    ).toBe(false);
  });

  it("returns true when ANY one alternate has pictograms even if other alternates do not", () => {
    expect(
      hasRenderableGhsVisual({
        found: true,
        ghs_pictograms: [],
        other_classifications: [
          { pictograms: [], hazard_statements: [{ code: "H302" }] },
          { pictograms: [{ code: "GHS02" }], hazard_statements: [] },
        ],
      })
    ).toBe(true);
  });
});
