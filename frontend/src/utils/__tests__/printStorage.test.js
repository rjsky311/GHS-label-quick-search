import {
  PRINT_JOB_REQUERY_POLICY,
  PRINT_JOB_SNAPSHOT_KIND,
  buildPrintJobRecord,
  rehydrateHistoricalPrintItems,
} from "@/utils/printStorage";
import { getGhsClassificationFingerprint } from "@/utils/selectedGhsClassification";
import { buildPreparedSolutionItem } from "@/utils/preparedSolution";

const historicalChemical = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  signal_word: "Danger",
  primary_source: "PubChem snapshot",
  retrieved_at: "2026-07-15T01:02:03Z",
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225", text_en: "Historical wording" }],
  precautionary_statements: [{ code: "P210", text_en: "Historical precaution" }],
};

const buildRecord = () =>
  buildPrintJobRecord({
    items: [historicalChemical],
    labelConfig: { stockPreset: "a4-primary" },
    customLabelFields: {},
    labelQuantities: { "64-17-5": 1 },
    labProfile: {
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
    },
  });

describe("printStorage historical print jobs", () => {
  it("marks snapshots as historical and preserves retrieval/source/fingerprint provenance", () => {
    const record = buildRecord();

    expect(record).toMatchObject({
      snapshotKind: PRINT_JOB_SNAPSHOT_KIND,
      requeryPolicy: PRINT_JOB_REQUERY_POLICY,
    });
    expect(record.items[0]).toMatchObject({
      retrieved_at: "2026-07-15T01:02:03Z",
      primary_source: "PubChem snapshot",
      classification_fingerprint: getGhsClassificationFingerprint({
        pictograms: historicalChemical.ghs_pictograms,
        hazard_statements: historicalChemical.hazard_statements,
        precautionary_statements: historicalChemical.precautionary_statements,
        signal_word: historicalChemical.signal_word,
        source: historicalChemical.primary_source,
      }),
    });
  });

  it("rehydrates from current lookup data instead of returning stored hazard snapshots", () => {
    const record = buildRecord();
    const current = {
      ...historicalChemical,
      primary_source: "PubChem live",
      retrieved_at: "2026-07-16T01:02:03Z",
      hazard_statements: [{ code: "H225", text_en: "Current wording" }],
    };
    const currentFingerprint = getGhsClassificationFingerprint({
      pictograms: current.ghs_pictograms,
      hazard_statements: current.hazard_statements,
      precautionary_statements: current.precautionary_statements,
      signal_word: current.signal_word,
      source: current.primary_source,
    });
    record.items[0].classification_fingerprint = currentFingerprint;

    const refreshed = rehydrateHistoricalPrintItems(record, [current]);

    expect(refreshed.issues).toEqual([]);
    expect(refreshed.items[0].hazard_statements[0].text_en).toBe(
      "Current wording",
    );
    expect(refreshed.items[0].hazard_statements[0].text_en).not.toBe(
      "Historical wording",
    );
    expect(refreshed.classificationSelections[0]).toMatchObject({
      casNumber: "64-17-5",
      selectedIndex: 0,
      classificationFingerprint: currentFingerprint,
    });
  });

  it("fails closed when the snapshotted classification no longer exists", () => {
    const record = buildRecord();
    const changed = {
      ...historicalChemical,
      primary_source: "Different source",
      ghs_pictograms: [{ code: "GHS07" }],
      hazard_statements: [{ code: "H302", text_en: "Changed" }],
    };

    const refreshed = rehydrateHistoricalPrintItems(record, [changed]);

    expect(refreshed.items).toEqual([]);
    expect(refreshed.issues).toEqual([
      expect.objectContaining({
        type: "historical-classification-changed",
        cas: "64-17-5",
      }),
    ]);
  });
});

describe("printStorage prepared solutions with a non-water solvent", () => {
  const parent = {
    cas_number: "64-17-5",
    name_en: "Ethanol",
    found: true,
    signal_word: "Danger",
    primary_source: "PubChem",
    ghs_pictograms: [{ code: "GHS02" }],
    hazard_statements: [{ code: "H225" }],
    precautionary_statements: [{ code: "P210" }],
    other_classifications: [],
  };
  const methanol = {
    cas_number: "67-56-1",
    name_en: "Methanol",
    found: true,
    signal_word: "Danger",
    ghs_pictograms: [{ code: "GHS02" }, { code: "GHS06" }, { code: "GHS08" }],
    hazard_statements: [{ code: "H225" }, { code: "H301" }, { code: "H370" }],
    precautionary_statements: [{ code: "P210" }],
  };
  const prepared = buildPreparedSolutionItem(
    parent,
    { concentration: "10 mM", solvent: "Methanol" },
    { solventResult: methanol },
  );
  const record = buildPrintJobRecord({
    items: [prepared],
    labelConfig: { stockPreset: "a4-primary" },
    customLabelFields: {},
    labelQuantities: { "64-17-5": 1 },
    labProfile: {},
  });

  it("stores the parent's classification identity and the solvent CAS, not solvent hazard data", () => {
    const [snapshot] = record.items;
    expect(snapshot.classification_fingerprint).toBe(
      getGhsClassificationFingerprint({
        pictograms: parent.ghs_pictograms,
        hazard_statements: parent.hazard_statements,
        precautionary_statements: parent.precautionary_statements,
        signal_word: parent.signal_word,
        source: parent.primary_source,
      }),
    );
    expect(snapshot.preparedSolution.solventCas).toBe("67-56-1");
    expect(snapshot.preparedSolution).not.toHaveProperty("solventHazards");
  });

  it("re-merges a freshly looked-up solvent on reprint", () => {
    const refreshed = rehydrateHistoricalPrintItems(record, [parent, methanol]);
    expect(refreshed.issues).toEqual([]);
    const [item] = refreshed.items;
    expect(item.ghs_pictograms.map((p) => p.code)).toEqual([
      "GHS02",
      "GHS06",
      "GHS08",
    ]);
    expect(item.preparedSolution.solventHazards.status).toBe("included");
  });

  it("falls back to 'not included' when the solvent cannot be looked up again", () => {
    const refreshed = rehydrateHistoricalPrintItems(record, [parent]);
    expect(refreshed.issues).toEqual([]);
    const [item] = refreshed.items;
    expect(item.ghs_pictograms.map((p) => p.code)).toEqual(["GHS02"]);
    expect(item.preparedSolution.solventHazards).toEqual({
      status: "not_included",
      solvent: "Methanol",
    });
  });
});
