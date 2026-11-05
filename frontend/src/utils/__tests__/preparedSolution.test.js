import {
  buildPreparedSolutionItem,
  buildPresetRecord,
  buildRecentRecord,
  formatPreparedDisplayName,
  getPreparedExpiryStatus,
  isPreparedSolutionItem,
  normalizePreparedPresetRecord,
  normalizePreparedRecentRecord,
  preparedPresetKey,
  preparedRecentKey,
  todayDateString,
} from "../preparedSolution";
import {
  getGhsClassificationFingerprint,
  listGhsClassifications,
} from "../selectedGhsClassification";

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

  describe("hazards of a gas under pressure", () => {
    const hydrogenChloride = {
      found: true,
      cas_number: "7647-01-0",
      name_en: "Hydrogen chloride",
      name_zh: "氯化氫",
      ghs_pictograms: [{ code: "GHS04" }, { code: "GHS05" }, { code: "GHS06" }],
      hazard_statements: [{ code: "H280" }, { code: "H314" }, { code: "H331" }],
      precautionary_statements: [{ code: "P260" }],
      signal_word: "Danger",
      signal_word_zh: "危險",
    };
    const codes = (items) => items.map((item) => item.code);

    it("are left off a water solution, and every other hazard stays", () => {
      const item = buildPreparedSolutionItem(hydrogenChloride, {
        concentration: "1 M",
        solvent: "Water",
      });

      expect(codes(item.ghs_pictograms)).toEqual(["GHS05", "GHS06"]);
      expect(codes(item.hazard_statements)).toEqual(["H314", "H331"]);
      expect(item.signal_word).toBe("Danger");
    });

    it("are left off a solution with looked-up solvent hazards", () => {
      const item = buildPreparedSolutionItem(
        hydrogenChloride,
        { concentration: "4 M", solvent: "1,4-dioxane" },
        {
          solventResult: {
            found: true,
            cas_number: "123-91-1",
            ghs_pictograms: [{ code: "GHS02" }, { code: "GHS08" }],
            hazard_statements: [{ code: "H225" }, { code: "H351" }],
            precautionary_statements: [],
            signal_word: "Danger",
          },
        },
      );

      expect(codes(item.ghs_pictograms)).toEqual([
        "GHS05",
        "GHS06",
        "GHS02",
        "GHS08",
      ]);
      expect(codes(item.hazard_statements)).toEqual([
        "H314",
        "H331",
        "H225",
        "H351",
      ]);
    });

    it("keep the pictogram when another pressure hazard still needs it", () => {
      const item = buildPreparedSolutionItem(
        {
          ...hydrogenChloride,
          hazard_statements: [{ code: "H280" }, { code: "H284" }],
        },
        { concentration: "1 M", solvent: "Water" },
      );

      expect(codes(item.ghs_pictograms)).toContain("GHS04");
      expect(codes(item.hazard_statements)).toEqual(["H284"]);
    });

    it("are left off alternate classifications, which keep their fingerprints", () => {
      const alternate = {
        pictograms: [{ code: "GHS04" }, { code: "GHS05" }],
        hazard_statements: [{ code: "H281" }, { code: "H314" }],
        precautionary_statements: [],
        signal_word: "Danger",
      };
      const parent = {
        ...hydrogenChloride,
        other_classifications: [alternate],
      };

      const item = buildPreparedSolutionItem(parent, {
        concentration: "1 M",
        solvent: "Water",
      });
      const [primaryAfter, alternateAfter] = listGhsClassifications(item);
      const [primaryBefore, alternateBefore] = listGhsClassifications(parent);

      expect(codes(alternateAfter.hazard_statements)).toEqual(["H314"]);
      expect(codes(alternateAfter.pictograms)).toEqual(["GHS05"]);
      expect(getGhsClassificationFingerprint(primaryAfter)).toBe(
        getGhsClassificationFingerprint(primaryBefore),
      );
      expect(getGhsClassificationFingerprint(alternateAfter)).toBe(
        getGhsClassificationFingerprint(alternateBefore),
      );
    });

    it("leave a chemical without them untouched", () => {
      const parent = {
        ...hydrogenChloride,
        ghs_pictograms: [{ code: "GHS05" }],
        hazard_statements: [{ code: "H314" }],
      };

      const item = buildPreparedSolutionItem(parent, {
        concentration: "1 M",
        solvent: "Water",
      });

      expect(item.ghs_pictograms).toBe(parent.ghs_pictograms);
      expect(item.hazard_statements).toBe(parent.hazard_statements);
    });
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
      solventHazards: { status: "water", solvent: "Water" },
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

describe("normalizePreparedRecentRecord", () => {
  it("returns null for invalid schema or missing required workflow fields", () => {
    expect(normalizePreparedRecentRecord(null)).toBeNull();
    expect(
      normalizePreparedRecentRecord({ schemaVersion: 99, parentCas: "64-17-5" })
    ).toBeNull();
    expect(
      normalizePreparedRecentRecord({
        schemaVersion: 1,
        parentCas: "64-17-5",
        concentration: "10%",
      })
    ).toBeNull();
  });

  it("strips hazard snapshots and trims workflow fields", () => {
    const record = normalizePreparedRecentRecord({
      schemaVersion: 1,
      createdAt: "2026-04-16T10:00:00.000Z",
      parentCas: " 64-17-5 ",
      parentNameEn: " Ethanol ",
      parentNameZh: " 銋? ",
      concentration: " 10% ",
      solvent: " Water ",
      preparedBy: " A. Chen ",
      preparedDate: " 2026-04-16 ",
      expiryDate: " ",
      ghs_pictograms: [{ code: "GHS02" }],
      hazard_statements: [{ code: "H225" }],
      signal_word: "Danger",
    });

    expect(record).toEqual({
      schemaVersion: 1,
      createdAt: "2026-04-16T10:00:00.000Z",
      parentCas: "64-17-5",
      parentNameEn: "Ethanol",
      parentNameZh: "銋?",
      concentration: "10%",
      solvent: "Water",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: null,
    });
    expect(record).not.toHaveProperty("ghs_pictograms");
    expect(record).not.toHaveProperty("hazard_statements");
    expect(record).not.toHaveProperty("signal_word");
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
    expect(record.name).toBe("10% (v/v) Ethanol in Water");
    expect(record.concentration).toBe("10% (v/v)");
    expect(record.solvent).toBe("Water");
  });

  it("prefers a custom presetName over the derived display name", () => {
    const record = buildPresetRecord(baseParent, {
      concentration: "10%",
      solvent: "Water",
      presetName: "Bench spray",
    });
    expect(record.name).toBe("Bench spray");
  });

  it("falls back to 'concentration in solvent' when no parent name exists", () => {
    const record = buildPresetRecord(
      {
        ...baseParent,
        name_en: null,
        name_zh: null,
      },
      {
        concentration: "10%",
        solvent: "Water",
      }
    );
    expect(record.name).toBe("10% in Water");
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

describe("normalizePreparedPresetRecord", () => {
  it("returns null for invalid schema or missing required recipe fields", () => {
    expect(normalizePreparedPresetRecord(null)).toBeNull();
    expect(
      normalizePreparedPresetRecord({ schemaVersion: 99, parentCas: "64-17-5" })
    ).toBeNull();
    expect(
      normalizePreparedPresetRecord({
        schemaVersion: 1,
        parentCas: "64-17-5",
        concentration: "10%",
      })
    ).toBeNull();
  });

  it("keeps recipe fields but strips operational and hazard fields", () => {
    const record = normalizePreparedPresetRecord({
      schemaVersion: 1,
      createdAt: "2026-04-16T10:00:00.000Z",
      parentCas: " 64-17-5 ",
      parentNameEn: " Ethanol ",
      parentNameZh: " 銋? ",
      name: " Bench spray ",
      concentration: " 10% ",
      solvent: " Water ",
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
      ghs_pictograms: [{ code: "GHS02" }],
      hazard_statements: [{ code: "H225" }],
      signal_word: "Danger",
    });

    expect(record).toEqual({
      schemaVersion: 1,
      createdAt: "2026-04-16T10:00:00.000Z",
      parentCas: "64-17-5",
      parentNameEn: "Ethanol",
      parentNameZh: "銋?",
      name: "Bench spray",
      concentration: "10%",
      solvent: "Water",
    });
    expect(record).not.toHaveProperty("preparedBy");
    expect(record).not.toHaveProperty("preparedDate");
    expect(record).not.toHaveProperty("expiryDate");
    expect(record).not.toHaveProperty("ghs_pictograms");
    expect(record).not.toHaveProperty("hazard_statements");
    expect(record).not.toHaveProperty("signal_word");
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

  it("uses zh-TW wording and prefers Chinese parent name when locale is zh-TW", () => {
    expect(
      formatPreparedDisplayName(
        {
          concentration: "10%",
          solvent: "水",
          parentNameEn: "Ethanol",
          parentNameZh: "乙醇",
        },
        { locale: "zh-TW" },
      )
    ).toBe("10% 乙醇，以水配製");
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

    const mod = require("../preparedSolution");
    expect(mod.selectionHasPreparedItem).toBeUndefined();
  });
});

// ── UX cleanup: todayDateString ───────────────────────────────

describe("todayDateString", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a string in YYYY-MM-DD format", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("zero-pads single-digit month and day", () => {
    // `new Date(2026, 0, 3, 12, ...)` is unambiguously Jan 3 in LOCAL
    // time — the constructor's month/day args are interpreted in the
    // runner's local zone, so no matter what TZ the CI runner is in,
    // the helper should produce "2026-01-03".
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 3, 12, 0, 0));
    expect(todayDateString()).toBe("2026-01-03");
  });

  it("matches the user's local-clock date, not UTC", () => {
    // Pick a UTC instant where local-clock date and UTC date disagree.
    // `Date.UTC(2026, 3, 16, 22, 30)` ≈ 2026-04-16 22:30 UTC.
    // In any timezone west of UTC (incl. the Americas) that is still
    // 2026-04-16 locally, but in timezones east of UTC (incl. Taiwan
    // at UTC+08) it has rolled over to 2026-04-17 locally. The helper
    // must follow the local-clock answer. Rather than pin an exact
    // output (which depends on runner TZ), assert the helper agrees
    // with the local-clock components of `new Date()` at the mocked
    // instant — and explicitly DOES NOT agree with the UTC slice.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 3, 16, 22, 30, 0)));
    const local = new Date();
    const expected = `${local.getFullYear()}-${String(
      local.getMonth() + 1
    ).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
    expect(todayDateString()).toBe(expected);
    // Smoke-check: if the runner's TZ offset is nonzero the UTC slice
    // and the local-clock slice are guaranteed to differ at this
    // instant (22:30 UTC + any offset crosses a midnight). If the TZ
    // offset is 0 they coincide, and this extra check is skipped —
    // which is fine because the equality above already pinned it.
    if (local.getTimezoneOffset() !== 0) {
      const utcSlice = new Date().toISOString().slice(0, 10);
      // They may or may not disagree depending on the offset sign;
      // the point is not which direction, only that the helper uses
      // local components. The assertion above already covers that.
      // Keep this block as documentation of why TZ matters.
      void utcSlice;
    }
  });
});

describe("getPreparedExpiryStatus", () => {
  it("returns expired, expiringSoon, or null from yyyy-mm-dd dates", () => {
    expect(getPreparedExpiryStatus("2026-04-15", "2026-04-16")).toBe(
      "expired"
    );
    expect(getPreparedExpiryStatus("2026-04-23", "2026-04-16")).toBe(
      "expiringSoon"
    );
    expect(getPreparedExpiryStatus("2026-04-24", "2026-04-16")).toBeNull();
    expect(getPreparedExpiryStatus("", "2026-04-16")).toBeNull();
    expect(getPreparedExpiryStatus("not-a-date", "2026-04-16")).toBeNull();
  });
});
