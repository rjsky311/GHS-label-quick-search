import { buildPreparedSolutionItem } from "../preparedSolution";
import {
  SOLVENT_HAZARD_STATUS,
  getRecordedSolventHazards,
  getSolventLookupQuery,
  isUsableSolventLookupResult,
  isWaterSolvent,
  strongerSignalWord,
} from "../preparedSolventHazards";
import {
  applySelectedGhsClassification,
  getGhsClassificationFingerprint,
  listGhsClassifications,
} from "../selectedGhsClassification";

const codesOf = (items = []) => items.map((item) => item.code);

// Parent "X": a harmful-if-swallowed solid with one alternate report.
const parentX = Object.freeze({
  cas_number: "7647-14-5",
  name_en: "Compound X",
  name_zh: "化合物 X",
  found: true,
  cid: 5234,
  primary_source: "ECHA C&L Notifications Summary",
  primary_report_count: 120,
  ghs_pictograms: [{ code: "GHS07", name_zh: "驚嘆號" }],
  hazard_statements: [
    { code: "H302", text_en: "Harmful if swallowed" },
    { code: "H319", text_en: "Causes serious eye irritation" },
  ],
  precautionary_statements: [{ code: "P264" }, { code: "P305+P351+P338" }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  other_classifications: [
    {
      pictograms: [{ code: "GHS05" }],
      hazard_statements: [{ code: "H318", text_en: "Causes serious eye damage" }],
      precautionary_statements: [{ code: "P280" }],
      signal_word: "Danger",
      signal_word_zh: "危險",
      source: "ECHA C&L Notifications Summary",
      report_count: 12,
    },
  ],
});

// Methanol as returned by /search-single (PubChem GHS, ECHA C&L summary).
const methanolResult = Object.freeze({
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
  precautionary_statements: [{ code: "P210" }, { code: "P264" }, { code: "P280" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
});

const form = (solvent) => ({ concentration: "10 mM", solvent });

describe("isWaterSolvent", () => {
  it.each([
    "Water",
    " water ",
    "H2O",
    "H₂O",
    "水",
    "DI water",
    "Deionized water",
    "Milli-Q",
    "ddH2O",
    "去離子水",
    "蒸餾水",
    "7732-18-5",
  ])("treats %p as water", (solvent) => {
    expect(isWaterSolvent(solvent)).toBe(true);
    expect(getSolventLookupQuery(solvent)).toBe("");
  });

  it.each(["Methanol", "PBS", "Water/MeOH (1:1)", "saline", "DMSO", "甲醇"])(
    "does not treat %p as water",
    (solvent) => {
      expect(isWaterSolvent(solvent)).toBe(false);
      expect(getSolventLookupQuery(solvent)).toBe(String(solvent).trim());
    },
  );

  it("needs no lookup for a blank solvent", () => {
    expect(isWaterSolvent("")).toBe(false);
    expect(getSolventLookupQuery("  ")).toBe("");
  });
});

describe("strongerSignalWord", () => {
  it("prefers Danger over Warning over none", () => {
    expect(strongerSignalWord("Warning", "Danger")).toBe("Danger");
    expect(strongerSignalWord("Danger", "Warning")).toBe("Danger");
    expect(strongerSignalWord(null, "Warning")).toBe("Warning");
    expect(strongerSignalWord("Warning", null)).toBe("Warning");
    expect(strongerSignalWord(null, null)).toBe(null);
  });
});

describe("merging statements that have no code", () => {
  const parent = {
    cas_number: "7647-14-5",
    name_en: "Compound X",
    found: true,
    ghs_pictograms: [{ code: "GHS07" }],
    hazard_statements: [{ code: "", text_en: "Parent hazard with no code" }],
    precautionary_statements: [],
    signal_word: "Warning",
    other_classifications: [],
  };
  const solvent = {
    found: true,
    ghs_pictograms: [{ code: "GHS06" }],
    hazard_statements: [
      { code: "", text_en: "Solvent hazard with no code" },
      { code: "", text_en: "Parent hazard with no code" },
      { code: "H301", text_en: "Toxic if swallowed" },
    ],
    precautionary_statements: [],
    signal_word: "危險",
  };

  it("keeps each one once instead of dropping it", () => {
    const item = buildPreparedSolutionItem(
      parent,
      { concentration: "1 M", solvent: "Solvent Y" },
      { solventResult: solvent },
    );
    expect(item.hazard_statements.map((s) => s.text_en)).toEqual([
      "Parent hazard with no code",
      "Solvent hazard with no code",
      "Toxic if swallowed",
    ]);
  });

  it("recognises a Chinese signal word as the stronger one", () => {
    const item = buildPreparedSolutionItem(
      parent,
      { concentration: "1 M", solvent: "Solvent Y" },
      { solventResult: solvent },
    );
    expect(item.signal_word).toBe("危險");
    expect(item.signal_word_zh).toBe("危險");
  });
});

describe("prepared solution: X in methanol", () => {
  const item = buildPreparedSolutionItem(parentX, form("Methanol"), {
    solventResult: methanolResult,
  });

  it("adds methanol's pictograms, H and P statements by union", () => {
    expect(codesOf(item.ghs_pictograms)).toEqual([
      "GHS07",
      "GHS02",
      "GHS06",
      "GHS08",
    ]);
    expect(codesOf(item.hazard_statements)).toEqual([
      "H302",
      "H319",
      "H225",
      "H301",
      "H311",
      "H331",
      "H370",
    ]);
    expect(codesOf(item.precautionary_statements)).toEqual([
      "P264",
      "P305+P351+P338",
      "P210",
      "P280",
    ]);
  });

  it("keeps the stronger signal word (Danger)", () => {
    expect(item.signal_word).toBe("Danger");
    expect(item.signal_word_zh).toBe("危險");
  });

  it("never drops a parent code and keeps the parent CAS and names", () => {
    codesOf(parentX.hazard_statements).forEach((code) =>
      expect(codesOf(item.hazard_statements)).toContain(code),
    );
    expect(item.cas_number).toBe("7647-14-5");
    expect(item.name_en).toBe("Compound X");
    expect(item.preparedSolution.parentCas).toBe("7647-14-5");
    expect(item.preparedSolution.concentration).toBe("10 mM");
  });

  it("records the solvent as included", () => {
    expect(item.preparedSolution.solventHazards).toEqual({
      status: SOLVENT_HAZARD_STATUS.INCLUDED,
      solvent: "Methanol",
      solventCas: "67-56-1",
      solventNameEn: "Methanol",
      solventNameZh: "甲醇",
    });
    expect(getRecordedSolventHazards(item).status).toBe("included");
  });

  it("merges the solvent into every alternate classification too", () => {
    const [alternate] = item.other_classifications;
    expect(codesOf(alternate.pictograms)).toEqual([
      "GHS05",
      "GHS02",
      "GHS06",
      "GHS08",
    ]);
    expect(codesOf(alternate.hazard_statements)).toEqual(
      expect.arrayContaining(["H318", "H225", "H301", "H370"]),
    );
    expect(alternate.signal_word).toBe("Danger");
  });

  it("keeps the parent's classification identity, so a saved choice still applies", () => {
    const parentAlternateFingerprint = getGhsClassificationFingerprint(
      parentX.other_classifications[0],
    );
    expect(
      listGhsClassifications(item).map(getGhsClassificationFingerprint),
    ).toEqual(listGhsClassifications(parentX).map(getGhsClassificationFingerprint));

    const applied = applySelectedGhsClassification(item, {
      [parentX.cas_number]: {
        selectedIndex: 1,
        classificationFingerprint: parentAlternateFingerprint,
      },
    });
    expect(applied.selected_classification_fingerprint).toBe(
      parentAlternateFingerprint,
    );
    // The user's chosen report, still carrying methanol's hazards.
    expect(codesOf(applied.ghs_pictograms)).toEqual([
      "GHS05",
      "GHS02",
      "GHS06",
      "GHS08",
    ]);
    expect(codesOf(applied.hazard_statements)).toContain("H370");
  });

  it("does not touch the parent object", () => {
    expect(codesOf(parentX.ghs_pictograms)).toEqual(["GHS07"]);
    expect(parentX.signal_word).toBe("Warning");
  });
});

describe("prepared solution: X in water", () => {
  it("is unchanged from the parent and needs no lookup", () => {
    const item = buildPreparedSolutionItem(parentX, form("Water"));
    expect(item.ghs_pictograms).toEqual(parentX.ghs_pictograms);
    expect(item.hazard_statements).toEqual(parentX.hazard_statements);
    expect(item.precautionary_statements).toEqual(parentX.precautionary_statements);
    expect(item.signal_word).toBe("Warning");
    expect(item.other_classifications).toEqual(parentX.other_classifications);
    expect(item.preparedSolution.solventHazards).toEqual({
      status: SOLVENT_HAZARD_STATUS.WATER,
      solvent: "Water",
    });
  });

  it("ignores a solvent result passed for water", () => {
    const item = buildPreparedSolutionItem(parentX, form("水"), {
      solventResult: methanolResult,
    });
    expect(codesOf(item.ghs_pictograms)).toEqual(["GHS07"]);
    expect(item.preparedSolution.solventHazards.status).toBe("water");
  });
});

describe("prepared solution: solvent that cannot be confirmed", () => {
  it.each([
    ["no lookup", null],
    ["not found", { found: false, cas_number: "Methanol" }],
    ["upstream error", { ...methanolResult, upstream_error: true }],
    ["lookup error text", { ...methanolResult, error: "PubChem timeout" }],
    [
      "GHS text without pictograms",
      { ...methanolResult, ghs_pictograms: [] },
    ],
    [
      "found but no GHS data",
      {
        cas_number: "67-56-1",
        found: true,
        ghs_pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
      },
    ],
  ])("%s keeps the parent data and records 'not included'", (_label, result) => {
    expect(isUsableSolventLookupResult(result)).toBe(false);
    const item = buildPreparedSolutionItem(parentX, form("Methanol"), {
      solventResult: result,
    });
    expect(codesOf(item.ghs_pictograms)).toEqual(["GHS07"]);
    expect(item.preparedSolution.solventHazards).toEqual({
      status: SOLVENT_HAZARD_STATUS.NOT_INCLUDED,
      solvent: "Methanol",
    });
  });

  it("treats a legacy prepared item without a status as not included unless the solvent is water", () => {
    expect(
      getRecordedSolventHazards({
        isPreparedSolution: true,
        preparedSolution: { solvent: "Ethanol" },
      }),
    ).toEqual({ status: "not_included", solvent: "Ethanol" });
    expect(
      getRecordedSolventHazards({
        isPreparedSolution: true,
        preparedSolution: { solvent: "Water" },
      }).status,
    ).toBe("water");
  });
});

describe("a parent with no hazard data of its own", () => {
  const noDataParent = Object.freeze({
    cas_number: "7732-18-5",
    name_en: "Compound Y",
    found: true,
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: null,
  });

  it("does not take the solvent's hazards", () => {
    const item = buildPreparedSolutionItem(noDataParent, form("Methanol"), {
      solventResult: methanolResult,
    });
    expect(item.ghs_pictograms).toEqual([]);
    expect(item.hazard_statements).toEqual([]);
    expect(item.preparedSolution.solventHazards.status).toBe(
      SOLVENT_HAZARD_STATUS.NOT_INCLUDED,
    );
  });

  it("treats a signal word alone as no data", () => {
    const item = buildPreparedSolutionItem(
      { ...noDataParent, signal_word: "Warning" },
      form("Methanol"),
      { solventResult: methanolResult },
    );
    expect(item.ghs_pictograms).toEqual([]);
  });

  it("does not merge into a parent whose own lookup failed upstream", () => {
    const item = buildPreparedSolutionItem(
      { ...noDataParent, upstream_error: true },
      form("Methanol"),
      { solventResult: methanolResult },
    );
    expect(item.ghs_pictograms).toEqual([]);
  });

  it("still merges into a parent with hazard statements and no pictogram", () => {
    const item = buildPreparedSolutionItem(
      { ...noDataParent, hazard_statements: [{ code: "H413" }] },
      form("Methanol"),
      { solventResult: methanolResult },
    );
    expect(codesOf(item.ghs_pictograms)).toEqual(["GHS02", "GHS06", "GHS08"]);
    expect(codesOf(item.hazard_statements)).toContain("H413");
    expect(item.preparedSolution.solventHazards.status).toBe(
      SOLVENT_HAZARD_STATUS.INCLUDED,
    );
  });

  it("still merges when only an alternate classification has data", () => {
    const item = buildPreparedSolutionItem(
      {
        ...noDataParent,
        other_classifications: [
          { pictograms: [{ code: "GHS07" }], hazard_statements: [{ code: "H302" }] },
        ],
      },
      form("Methanol"),
      { solventResult: methanolResult },
    );
    expect(item.preparedSolution.solventHazards.status).toBe(
      SOLVENT_HAZARD_STATUS.INCLUDED,
    );
  });
});
