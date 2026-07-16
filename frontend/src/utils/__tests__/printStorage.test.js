import {
  PRINT_JOB_REQUERY_POLICY,
  PRINT_JOB_SNAPSHOT_KIND,
  buildPrintJobRecord,
  rehydrateHistoricalPrintItems,
} from "@/utils/printStorage";
import { getGhsClassificationFingerprint } from "@/utils/selectedGhsClassification";

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
