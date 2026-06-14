import {
  buildInventoryPrintEvidenceCases,
  makeInventoryEvidenceChemical,
} from "@/utils/inventoryPrintEvidence";

const sampleReport = {
  sourceName: "qa/fixtures/organic-inventory-2026-06-14.csv",
  inventorySamples: [
    {
      id: "inventory-first-valid",
      cas: "90-41-5",
      name: "2-Aminobiphenyl",
      reason: "First valid inventory row.",
    },
    {
      id: "inventory-longest-name",
      cas: "127318-97-2",
      name: "4-Ethyl-1,4,7,8-tetrahydro-3H,10H-spiro[pyrano[3,4-f]indolizine-6,2'-[1,3]dioxolane]-3,10-dione",
      reason: "Longest inventory name.",
    },
    {
      id: "inventory-short-name",
      cas: "2537-48-6",
      name: "Dieth",
      reason: "Short name baseline.",
    },
    {
      id: "inventory-duplicate-cas",
      cas: "90-90-4",
      name: "4-Bromobenzophenone",
      reason: "Duplicate CAS row.",
    },
  ],
  syntheticStressCases: [
    {
      id: "qr-small-8-ghs",
      cas: "999998-80-8",
      name: "Eight-pictogram QR stress sample",
      nameZh: "八圖示 QR 壓力測試",
      output: "qrSupplement",
      stockPreset: "brother-62mm-continuous",
      pictogramCount: 8,
    },
    {
      id: "quick-id-9-ghs",
      cas: "999997-90-9",
      name: "Nine-pictogram identification stress sample",
      nameZh: "九圖示識別標籤壓力測試",
      output: "quickId",
      stockPreset: "small-strip",
      pictogramCount: 9,
    },
    {
      id: "qr-small-over-limit-19-ghs",
      cas: "999996-19-0",
      name: "Synthetic QR continuation limit sample",
      nameZh: "QR 續頁上限合成測試",
      output: "qrSupplement",
      stockPreset: "brother-62mm-continuous",
      pictogramCount: 19,
    },
  ],
};

describe("inventory print evidence cases", () => {
  it("turns sampler output into printable cases plus blocked stress cases", () => {
    const result = buildInventoryPrintEvidenceCases(sampleReport);

    expect(result.printableCases.map((testCase) => testCase.id)).toEqual([
      "inventory-first-valid-complete",
      "inventory-longest-name-quick-id",
      "inventory-longest-name-qr",
      "inventory-short-name-quick-id",
      "inventory-sample-batch-quick-id",
      "synthetic-qr-small-8-ghs",
      "synthetic-quick-id-9-ghs",
    ]);
    expect(result.blockedCases).toEqual([
      expect.objectContaining({
        id: "synthetic-qr-small-over-limit-19-ghs",
        expectedPlanState: "small_label_continuation_limit",
      }),
    ]);

    const longQuickId = result.printableCases.find(
      (testCase) => testCase.id === "inventory-longest-name-quick-id",
    );
    expect(longQuickId.labelConfig).toMatchObject({
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "en",
    });
    expect(longQuickId.expectedLabelKind).toBe("quick-id");
    expect(longQuickId.expectedRequiredIdentityTexts).toContain(
      sampleReport.inventorySamples[1].name,
    );
  });

  it("uses synthetic hazard content for layout evidence without approving inventory data", () => {
    const chemical = makeInventoryEvidenceChemical({
      cas: "127318-97-2",
      name: "Very Long Inventory Name",
    });

    expect(chemical).toMatchObject({
      cas_number: "127318-97-2",
      name_en: "Very Long Inventory Name",
      name_zh: "",
      signal_word: "Warning",
    });
    expect(chemical.ghs_pictograms).toEqual([
      { code: "GHS07" },
      { code: "GHS08" },
    ]);
    expect(chemical.hazard_statements[0].text_en).toMatch(/layout QA/i);
  });
});
