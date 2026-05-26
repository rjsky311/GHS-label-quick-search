import { getDataQualityIssues } from "@/utils/dataQuality";
import { parseBatchSearchInput } from "@/utils/batchSearchInput";
import {
  inventoryBatchPasteFixture,
  inventoryDataQualityFixtureResults,
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

  it("keeps batch review buckets separate for lab-manager triage", () => {
    const issueMap = Object.fromEntries(
      inventoryDataQualityFixtureResults.map((result) => [
        result.cas_number,
        issueTypesFor(result),
      ]),
    );

    expect(issueMap["90-41-5"]).toContain("multiple-classifications");
    expect(issueMap["84-65-1"]).toContain("missing-chinese-name");
    expect(issueMap["57-13-6"]).toContain("no-ghs-data");
    expect(issueMap["75-21-8"]).toEqual(["upstream-error"]);
    expect(issueMap["9999-99-9"]).toContain("unresolved-search");
  });
});
