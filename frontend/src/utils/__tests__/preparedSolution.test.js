import {
  buildPreparedSolutionItem,
  buildPresetRecord,
  buildRecentRecord,
  formatPreparedDisplayName,
  isPreparedSolutionItem,
  preparedPresetKey,
  preparedRecentKey,
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

// ── Tier 2 PR-2A: buildRecentRecord / preparedRecentKey ──────────

describe("buildRecentRecord", () => {
  it("returns null for non-prepared inputs", () => {
    expect(buildRecentRecord(null)).toBeNull();
    expect(buildRecentRecord(undefined)).toBeNull();
    expect(buildRecentRecord(baseParent)).toBeNull();
    expect(
      buildRecentRecord({ isPreparedSolution: false, preparedSolution: {} })
    ).toBeNull();
  });

  it("returns null when required workflow inputs are missing", () => {
    expect(
      buildRecentRecord({
        isPreparedSolution: true,
        preparedSolution: { solvent: "Water" }, // missing concentration
      })
    ).toBeNull();
    expect(
      buildRecentRecord({
        isPreparedSolution: true,
        preparedSolution: { concentration: "10%" }, // missing solvent
      })
    ).toBeNull();
  });

  it("builds a schemaVersion:1 record with parent identity + workflow inputs", () => {
    const prepared = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
    });
    const record = buildRecentRecord(prepared);
    expect(record.schemaVersion).toBe(1);
    expect(typeof record.createdAt).toBe("string");
    expect(record.parentCas).toBe(baseParent.cas_number);
    expect(record.parentNameEn).toBe(baseParent.name_en);
    expect(record.parentNameZh).toBe(baseParent.name_zh);
    expect(record.concentration).toBe("10%");
    expect(record.solvent).toBe("Water");
    expect(record.preparedBy).toBe("A. Chen");
    expect(record.preparedDate).toBe("2026-04-16");
    expect(record.expiryDate).toBe("2026-10-16");
  });

  it("carries NO GHS / hazard / classification fields on the record", () => {
    // This is the central trust-boundary guarantee for recents.
    // If this ever starts failing, something is leaking GHS data into
    // the workflow-only store.
    const prepared = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    const record = buildRecentRecord(prepared);
    expect(record).not.toHaveProperty("ghs_pictograms");
    expect(record).not.toHaveProperty("hazard_statements");
    expect(record).not.toHaveProperty("precautionary_statements");
    expect(record).not.toHaveProperty("signal_word");
    expect(record).not.toHaveProperty("signal_word_zh");
    expect(record).not.toHaveProperty("other_classifications");
    expect(record).not.toHaveProperty("isPreparedSolution");
    expect(record).not.toHaveProperty("preparedSolution");
  });

  it("normalises unset operational fields to null on the record", () => {
    const prepared = buildPreparedSolutionItem(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    const record = buildRecentRecord(prepared);
    expect(record.preparedBy).toBeNull();
    expect(record.preparedDate).toBeNull();
    expect(record.expiryDate).toBeNull();
  });
});

describe("preparedRecentKey", () => {
  it("returns '' for null / undefined input", () => {
    expect(preparedRecentKey(null)).toBe("");
    expect(preparedRecentKey(undefined)).toBe("");
  });

  it("produces the same key for records with equivalent null/empty optionals", () => {
    const a = {
      parentCas: "64-17-5",
      concentration: "10%",
      solvent: "Water",
      preparedBy: null,
      preparedDate: null,
      expiryDate: null,
    };
    const b = {
      parentCas: "64-17-5",
      concentration: "10%",
      solvent: "Water",
      preparedBy: "",
      preparedDate: "",
      expiryDate: "",
    };
    expect(preparedRecentKey(a)).toBe(preparedRecentKey(b));
  });

  it("produces different keys for different workflow inputs", () => {
    const base = {
      parentCas: "64-17-5",
      concentration: "10%",
      solvent: "Water",
      preparedBy: null,
      preparedDate: null,
      expiryDate: null,
    };
    expect(preparedRecentKey(base)).not.toBe(
      preparedRecentKey({ ...base, concentration: "20%" })
    );
    expect(preparedRecentKey(base)).not.toBe(
      preparedRecentKey({ ...base, solvent: "Methanol" })
    );
    expect(preparedRecentKey(base)).not.toBe(
      preparedRecentKey({ ...base, preparedBy: "A. Chen" })
    );
    expect(preparedRecentKey(base)).not.toBe(
      preparedRecentKey({ ...base, parentCas: "67-56-1" })
    );
  });
});

// ── Tier 2 PR-2B: buildPresetRecord / preparedPresetKey ──────────

describe("buildPresetRecord", () => {
  it("returns null when parent is null / missing cas_number", () => {
    expect(
      buildPresetRecord(null, { concentration: "10%", solvent: "Water" })
    ).toBeNull();
    expect(
      buildPresetRecord({}, { concentration: "10%", solvent: "Water" })
    ).toBeNull();
    expect(
      buildPresetRecord(
        { cas_number: "" },
        { concentration: "10%", solvent: "Water" }
      )
    ).toBeNull();
  });

  it("returns null when required inputs are missing or blank", () => {
    expect(buildPresetRecord(baseParent, { solvent: "Water" })).toBeNull();
    expect(
      buildPresetRecord(baseParent, { concentration: "", solvent: "Water" })
    ).toBeNull();
    expect(
      buildPresetRecord(baseParent, { concentration: "   ", solvent: "Water" })
    ).toBeNull();
    expect(buildPresetRecord(baseParent, { concentration: "10%" })).toBeNull();
    expect(
      buildPresetRecord(baseParent, { concentration: "10%", solvent: "   " })
    ).toBeNull();
  });

  it("builds a schemaVersion:1 record with parent identity + concentration + solvent", () => {
    const record = buildPresetRecord(baseParent, {
      concentration: "  10% (v/v)  ",
      solvent: "  Water  ",
    });
    expect(record.schemaVersion).toBe(1);
    expect(typeof record.createdAt).toBe("string");
    expect(record.parentCas).toBe(baseParent.cas_number);
    expect(record.parentNameEn).toBe(baseParent.name_en);
    expect(record.parentNameZh).toBe(baseParent.name_zh);
    expect(record.concentration).toBe("10% (v/v)");
    expect(record.solvent).toBe("Water");
  });

  it("does NOT carry operational fields even if they are passed in formValues", () => {
    // This is the central PR-2B contract: operational fields
    // (preparedBy / preparedDate / expiryDate) must never land in a
    // preset record, because stale session data would silently bleed
    // onto future labels. Even if a caller accidentally hands them in,
    // the helper must drop them on the floor.
    const record = buildPresetRecord(baseParent, {
      concentration: "10%",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
    });
    expect(record).not.toHaveProperty("preparedBy");
    expect(record).not.toHaveProperty("preparedDate");
    expect(record).not.toHaveProperty("expiryDate");
  });

  it("does NOT carry GHS / hazard / classification data", () => {
    const record = buildPresetRecord(baseParent, {
      concentration: "10%",
      solvent: "Water",
    });
    expect(record).not.toHaveProperty("ghs_pictograms");
    expect(record).not.toHaveProperty("hazard_statements");
    expect(record).not.toHaveProperty("precautionary_statements");
    expect(record).not.toHaveProperty("signal_word");
    expect(record).not.toHaveProperty("signal_word_zh");
    expect(record).not.toHaveProperty("other_classifications");
    expect(record).not.toHaveProperty("isPreparedSolution");
    expect(record).not.toHaveProperty("preparedSolution");
  });
});

describe("preparedPresetKey", () => {
  it("returns '' for null / undefined input", () => {
    expect(preparedPresetKey(null)).toBe("");
    expect(preparedPresetKey(undefined)).toBe("");
  });

  it("depends only on parentCas + concentration + solvent", () => {
    const base = {
      parentCas: "64-17-5",
      concentration: "10%",
      solvent: "Water",
    };
    // Same recipe + extraneous fields → same key
    expect(preparedPresetKey(base)).toBe(
      preparedPresetKey({
        ...base,
        parentNameEn: "Ethanol",
        createdAt: "whatever",
      })
    );
    // Different recipe → different key
    expect(preparedPresetKey(base)).not.toBe(
      preparedPresetKey({ ...base, concentration: "20%" })
    );
    expect(preparedPresetKey(base)).not.toBe(
      preparedPresetKey({ ...base, solvent: "Methanol" })
    );
    expect(preparedPresetKey(base)).not.toBe(
      preparedPresetKey({ ...base, parentCas: "67-56-1" })
    );
  });

  it("preset key differs from recent key because operational fields are excluded", () => {
    // A recent has a wider dedup footprint (6 fields) than a preset
    // (3 fields). For the same concentration/solvent, two records
    // that differ only on preparedBy collapse in the preset dedup
    // but NOT in the recent dedup.
    const commonRecipe = {
      parentCas: "64-17-5",
      concentration: "10%",
      solvent: "Water",
    };
    const presetA = preparedPresetKey({ ...commonRecipe });
    const presetB = preparedPresetKey({ ...commonRecipe });
    expect(presetA).toBe(presetB);

    const recentA = preparedRecentKey({
      ...commonRecipe,
      preparedBy: "A. Chen",
      preparedDate: null,
      expiryDate: null,
    });
    const recentB = preparedRecentKey({
      ...commonRecipe,
      preparedBy: "B. Liu",
      preparedDate: null,
      expiryDate: null,
    });
    expect(recentA).not.toBe(recentB);
  });
});

// ── Tier 2 PR-3: formatPreparedDisplayName ────────────────────

describe("formatPreparedDisplayName", () => {
  it("returns '' for null / undefined / empty input", () => {
    expect(formatPreparedDisplayName(null)).toBe("");
    expect(formatPreparedDisplayName(undefined)).toBe("");
    expect(formatPreparedDisplayName({})).toBe("");
  });

  it("returns '' when required concentration or solvent is missing", () => {
    expect(
      formatPreparedDisplayName({ concentration: "10%" })
    ).toBe("");
    expect(
      formatPreparedDisplayName({ solvent: "Water" })
    ).toBe("");
    expect(
      formatPreparedDisplayName({ concentration: "   ", solvent: "Water" })
    ).toBe("");
    expect(
      formatPreparedDisplayName({ concentration: "10%", solvent: "   " })
    ).toBe("");
  });

  it("works on a bare record shape (recent / preset) with parentNameEn", () => {
    expect(
      formatPreparedDisplayName({
        concentration: "10%",
        solvent: "Water",
        parentNameEn: "Ethanol",
      })
    ).toBe("10% Ethanol in Water");
  });

  it("falls back to parentNameZh when parentNameEn is missing", () => {
    expect(
      formatPreparedDisplayName({
        concentration: "0.1 N",
        solvent: "Water",
        parentNameZh: "乙醇",
      })
    ).toBe("0.1 N 乙醇 in Water");
  });

  it("works on a prepared item (reads nested preparedSolution + top-level names)", () => {
    const preparedItem = buildPreparedSolutionItem(baseParent, {
      concentration: "10% (v/v)",
      solvent: "Water",
    });
    // baseParent.name_en === "Ethanol"; nested preparedSolution sets
    // parentNameEn to the same. Either source is acceptable.
    expect(formatPreparedDisplayName(preparedItem)).toBe(
      "10% (v/v) Ethanol in Water"
    );
  });

  it("prefers nested preparedSolution over top-level names when both exist", () => {
    // A prepared item whose preparedSolution.parentNameEn differs from
    // its top-level name_en — the nested value should win, because it
    // is the snapshot we took at the moment of preparing.
    const item = {
      name_en: "TOP_LEVEL_NAME",
      preparedSolution: {
        concentration: "5%",
        solvent: "Water",
        parentNameEn: "SNAPSHOT_NAME",
      },
    };
    expect(formatPreparedDisplayName(item)).toBe("5% SNAPSHOT_NAME in Water");
  });

  it("degrades gracefully to 'X in Y' when no parent name is available", () => {
    // Rare shape but valid — still want something useful rather than "".
    expect(
      formatPreparedDisplayName({ concentration: "10%", solvent: "Water" })
    ).toBe("10% in Water");
  });

  it("trims whitespace from concentration / solvent / parent name", () => {
    expect(
      formatPreparedDisplayName({
        concentration: "  10%  ",
        solvent: "  Water  ",
        parentNameEn: "  Ethanol  ",
      })
    ).toBe("10% Ethanol in Water");
  });
});

// Guard against regressing the cleanup that removed `selectionHasPreparedItem`
// when App.js stopped using it (PR #14 replaced its caller with the
// `preparedFlowActive` session flag). If someone re-exports it without
// a callsite, this test fails — which is the signal to either restore
// a real consumer or drop it again.
describe("dead-export guard", () => {
  it("selectionHasPreparedItem is NOT exported (dead helper removed)", () => {
    // Import via require so the test reads the current module surface
    // rather than relying on the test-file import list (which is a
    // statically declared thing at the top of this file).
    // eslint-disable-next-line global-require
    const mod = require("../preparedSolution");
    expect(mod.selectionHasPreparedItem).toBeUndefined();
  });
});
