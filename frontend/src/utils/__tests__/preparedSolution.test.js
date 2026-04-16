import {
  buildPreparedSolutionItem,
  isPreparedSolutionItem,
  selectionHasPreparedItem,
} from "../preparedSolution";

const baseParent = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02", name_zh: "易燃" }],
  hazard_statements: [{ code: "H225", text_zh: "高度易燃液體和蒸氣" }],
  precautionary_statements: [
    { code: "P210", text_en: "Keep away from heat.", text_zh: "遠離熱源。" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  other_classifications: [],
};

describe("buildPreparedSolutionItem", () => {
  it("returns null when parent is null / undefined", () => {
    expect(
      buildPreparedSolutionItem(null, { concentration: "10%", solvent: "Water" })
    ).toBeNull();
    expect(
      buildPreparedSolutionItem(undefined, {
        concentration: "10%",
        solvent: "Water",
      })
    ).toBeNull();
  });

  it("returns null when parent.found is false (defensive)", () => {
    const notFound = { ...baseParent, found: false };
    expect(
      buildPreparedSolutionItem(notFound, {
        concentration: "10%",
        solvent: "Water",
      })
    ).toBeNull();
  });

  it("returns null when concentration is missing or blank", () => {
    expect(
      buildPreparedSolutionItem(baseParent, { solvent: "Water" })
    ).toBeNull();
    expect(
      buildPreparedSolutionItem(baseParent, {
        concentration: "",
        solvent: "Water",
      })
    ).toBeNull();
    expect(
      buildPreparedSolutionItem(baseParent, {
        concentration: "   ",
        solvent: "Water",
      })
    ).toBeNull();
  });

  it("returns null when solvent is missing or blank", () => {
    expect(
      buildPreparedSolutionItem(baseParent, { concentration: "10%" })
    ).toBeNull();
    expect(
      buildPreparedSolutionItem(baseParent, {
        concentration: "10%",
        solvent: "",
      })
    ).toBeNull();
    expect(
      buildPreparedSolutionItem(baseParent, {
        concentration: "10%",
        solvent: " ",
      })
    ).toBeNull();
  });

  it("builds a prepared item with parent fields copied verbatim", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(item.cas_number).toBe(baseParent.cas_number);
    expect(item.name_en).toBe(baseParent.name_en);
    expect(item.name_zh).toBe(baseParent.name_zh);
    expect(item.ghs_pictograms).toEqual(baseParent.ghs_pictograms);
    expect(item.hazard_statements).toEqual(baseParent.hazard_statements);
    expect(item.precautionary_statements).toEqual(
      baseParent.precautionary_statements
    );
    expect(item.signal_word).toBe(baseParent.signal_word);
    expect(item.signal_word_zh).toBe(baseParent.signal_word_zh);
  });

  it("sets isPreparedSolution true", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(item.isPreparedSolution).toBe(true);
  });

  it("attaches a preparedSolution metadata block with trimmed values", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "  10% (v/v)  ",
      solvent: "  Water  ",
    });
    // Tier 1 required fields are trimmed; Tier 2 optional operational
    // fields are present on the shape and normalised to null when no
    // values were supplied (so consumers can destructure without
    // undefined checks).
    expect(item.preparedSolution).toEqual({
      concentration: "10% (v/v)",
      solvent: "Water",
      parentCas: baseParent.cas_number,
      parentNameEn: baseParent.name_en,
      parentNameZh: baseParent.name_zh,
      preparedBy: null,
      preparedDate: null,
      expiryDate: null,
    });
  });

  it("preserves parent other_classifications (for custom-override print path)", () => {
    const parentWithAlts = {
      ...baseParent,
      other_classifications: [
        {
          pictograms: [{ code: "GHS07" }],
          hazard_statements: [{ code: "H302", text_zh: "x" }],
          signal_word: "Warning",
        },
      ],
    };
    const item = buildPreparedSolutionItem(parentWithAlts, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(item.other_classifications).toEqual(
      parentWithAlts.other_classifications
    );
  });

  it("does not synthesize a fake CAS number", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    // Same CAS as the parent — downstream code keying on cas_number
    // continues to work; tests and type assumptions are unchanged.
    expect(item.cas_number).toBe("64-17-5");
  });

  it("future parent fields flow through (spread, not whitelist)", () => {
    const parentWithNewField = {
      ...baseParent,
      primary_source: "ECHA",
      retrieved_at: "2026-04-16T00:00:00Z",
      cache_hit: false,
      some_future_field: "future",
    };
    const item = buildPreparedSolutionItem(parentWithNewField, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(item.primary_source).toBe("ECHA");
    expect(item.retrieved_at).toBe("2026-04-16T00:00:00Z");
    expect(item.cache_hit).toBe(false);
    expect(item.some_future_field).toBe("future");
  });

  // ── Tier 2 PR-1: optional operational metadata ────────────────

  it("captures optional operational fields (preparedBy / preparedDate / expiryDate)", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
    });
    expect(item.preparedSolution.preparedBy).toBe("A. Chen");
    expect(item.preparedSolution.preparedDate).toBe("2026-04-16");
    expect(item.preparedSolution.expiryDate).toBe("2026-10-16");
  });

  it("trims optional operational fields and normalises blank → null", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
      preparedBy: "   A. Chen   ",
      preparedDate: "",
      expiryDate: "   ",
    });
    expect(item.preparedSolution.preparedBy).toBe("A. Chen");
    expect(item.preparedSolution.preparedDate).toBeNull();
    expect(item.preparedSolution.expiryDate).toBeNull();
  });

  it("blank operational fields never block the build (unlike concentration/solvent)", () => {
    // No operational fields supplied at all — still a valid prepared item.
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(item).not.toBeNull();
    expect(item.preparedSolution.preparedBy).toBeNull();
    expect(item.preparedSolution.preparedDate).toBeNull();
    expect(item.preparedSolution.expiryDate).toBeNull();
  });

  it("returns null when concentration is missing even if operational fields are filled (required > optional)", () => {
    // Operational fields must not compensate for a missing required
    // input. This pins that the build rule ordering didn't slip when
    // the helper grew new optional fields.
    expect(
      buildPreparedSolutionItem(baseParent, {
        solvent: "Water",
        preparedBy: "A. Chen",
        preparedDate: "2026-04-16",
        expiryDate: "2026-10-16",
      })
    ).toBeNull();
  });
});

describe("isPreparedSolutionItem", () => {
  it("is false for null / undefined / plain object", () => {
    expect(isPreparedSolutionItem(null)).toBe(false);
    expect(isPreparedSolutionItem(undefined)).toBe(false);
    expect(isPreparedSolutionItem({})).toBe(false);
  });

  it("is false for a normal chemical result", () => {
    expect(isPreparedSolutionItem(baseParent)).toBe(false);
  });

  it("is true for a prepared item", () => {
    const item = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(isPreparedSolutionItem(item)).toBe(true);
  });

  it("is false when isPreparedSolution is explicitly false", () => {
    expect(isPreparedSolutionItem({ isPreparedSolution: false })).toBe(false);
  });
});

describe("selectionHasPreparedItem", () => {
  it("is false for non-array input", () => {
    expect(selectionHasPreparedItem(null)).toBe(false);
    expect(selectionHasPreparedItem(undefined)).toBe(false);
    expect(selectionHasPreparedItem("not-an-array")).toBe(false);
  });

  it("is false for an empty selection", () => {
    expect(selectionHasPreparedItem([])).toBe(false);
  });

  it("is false for a selection of normal chemicals", () => {
    expect(selectionHasPreparedItem([baseParent, baseParent])).toBe(false);
  });

  it("is true when any item in the selection is prepared", () => {
    const prepared = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(selectionHasPreparedItem([baseParent, prepared])).toBe(true);
    expect(selectionHasPreparedItem([prepared])).toBe(true);
  });
});
