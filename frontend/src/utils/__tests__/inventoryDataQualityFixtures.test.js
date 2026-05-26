import { getDataQualityIssues } from "@/utils/dataQuality";
import { parseBatchSearchInput } from "@/utils/batchSearchInput";
import {
  inventoryBatchPasteFixture,
  inventoryChineseHeaderPasteFixture,
  inventoryDataQualityFixtureResults,
  inventoryRosterEvidenceSummary,
  inventoryTabularPasteFixture,
} from "@/utils/testFixtures/inventoryDataQualityFixtures";

const issueTypesFor = (result) =>
  getDataQualityIssues(result).map((issue) => issue.type);

describe("inventory data-quality fixtures", () => {
  it("captures spreadsheet paste cleanup found in real inventory files", () => {
    const summary = parseBatchSearchInput(inventoryBatchPasteFixture);

    expect(summary.queries).toEqual(["67-64-1", "90-41-5"]);
    expect(summary.rehyphenatedCount).toBe(1);
    expect(summary.duplicateCount).toBe(1);
    expect(summary.invalidItems).toEqual([
      expect.objectContaining({ raw: "344-04-07", reason: "format" }),
      expect.objectContaining({ raw: "67-64-2", reason: "checksum" }),
    ]);
  });

  it("extracts the CAS column from real-inventory style tabular pastes", () => {
    const summary = parseBatchSearchInput(inventoryTabularPasteFixture);

    expect(summary.queries).toEqual(["67-64-1", "90-41-5", "1003-09-4"]);
    expect(summary.inputCount).toBe(3);
    expect(summary.rehyphenatedCount).toBe(2);
    expect(summary.invalidItems).toEqual([]);
  });

  it("covers Chinese headers and Excel-shaped CAS cells from inventory files", () => {
    const summary = parseBatchSearchInput(inventoryChineseHeaderPasteFixture);

    expect(summary.queries).toEqual(["7719-09-7", "73183-34-3"]);
    expect(summary.inputCount).toBe(4);
    expect(summary.rehyphenatedItems).toEqual([
      expect.objectContaining({ raw: "73183343.0", normalized: "73183-34-3" }),
    ]);
    expect(summary.invalidItems).toEqual([
      expect.objectContaining({ raw: "#VALUE!", reason: "format" }),
      expect.objectContaining({
        raw: "7440-05-03 00:00:00",
        reason: "format",
      }),
    ]);
  });

  it("documents real-roster evidence without importing the whole workbook", () => {
    expect(inventoryRosterEvidenceSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ example: "CAS編號" }),
        expect.objectContaining({ example: "73183343.0" }),
        expect.objectContaining({ example: "7719-09-7." }),
      ]),
    );
  });

  it("keeps batch review buckets separate for lab-manager triage", () => {
    const issueMap = Object.fromEntries(
      inventoryDataQualityFixtureResults.map((result) => [
        result.cas_number,
        issueTypesFor(result),
      ]),
    );

    expect(issueMap["67-64-1"]).toEqual([]);
    expect(issueMap["90-41-5"]).toContain("multiple-classifications");
    expect(issueMap["84-65-1"]).toContain("missing-chinese-name");
    expect(issueMap["50-00-0"]).toContain("ghs-text-no-pictograms");
    expect(issueMap["100-00-5"]).toContain("source-conflict");
    expect(issueMap["57-13-6"]).toContain("no-ghs-data");
    expect(issueMap["75-21-8"]).toEqual(["upstream-error"]);
    expect(issueMap["9999-99-9"]).toContain("unresolved-search");
  });
});
