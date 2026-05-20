import {
  buildBatchSearchTelemetryMeta,
  hasValidCasChecksum,
  normalizeCasToken,
  parseBatchSearchInput,
  splitBatchSearchInput,
} from "@/utils/batchSearchInput";

describe("batchSearchInput", () => {
  it("splits pasted CAS values from common spreadsheet separators", () => {
    expect(
      splitBatchSearchInput(
        "64-17-5\n67-64-1\t90-90-4;62-53-3\uFF0C84-65-1",
      ),
    ).toEqual(["64-17-5", "67-64-1", "90-90-4", "62-53-3", "84-65-1"]);
  });

  it("normalizes CAS prefixes, full-width characters, spaces, and dash variants", () => {
    expect(normalizeCasToken(" CAS\uFF1A\uFF16\uFF17\uFF0D\uFF16\uFF14\uFF0D\uFF11 ")).toBe(
      "67-64-1",
    );
    expect(normalizeCasToken("CAS # 90\u201190\u20104")).toBe("90-90-4");
    expect(normalizeCasToken("CAS No. 62 \u2013 53 \u2013 3")).toBe("62-53-3");
  });

  it("validates CAS checksums", () => {
    expect(hasValidCasChecksum("67-64-1")).toBe(true);
    expect(hasValidCasChecksum("90-90-4")).toBe(true);
    expect(hasValidCasChecksum("67-64-2")).toBe(false);
    expect(hasValidCasChecksum("344-04-07")).toBe(false);
  });

  it("deduplicates valid CAS values and reports invalid entries before search", () => {
    const summary = parseBatchSearchInput(
      [
        "90-41-5",
        "84-65-1",
        "90-90-4",
        "90-90-4",
        "CAS\uFF1A\uFF16\uFF17\uFF0D\uFF16\uFF14\uFF0D\uFF11",
        "344-04-07",
        "67-64-2",
      ].join("\n"),
    );

    expect(summary.queries).toEqual([
      "90-41-5",
      "84-65-1",
      "90-90-4",
      "67-64-1",
    ]);
    expect(summary.inputCount).toBe(7);
    expect(summary.acceptedCount).toBe(4);
    expect(summary.duplicateItems).toEqual([
      expect.objectContaining({ normalized: "90-90-4", reason: "duplicate" }),
    ]);
    expect(summary.invalidItems).toEqual([
      expect.objectContaining({ normalized: "344-04-07", reason: "format" }),
      expect.objectContaining({ normalized: "67-64-2", reason: "checksum" }),
    ]);
  });

  it("applies the search limit to unique valid CAS values instead of raw pasted lines", () => {
    const duplicatedInput = Array.from({ length: 150 }, () => "64-17-5").join(
      "\n",
    );
    const summary = parseBatchSearchInput(duplicatedInput, { limit: 100 });

    expect(summary.inputCount).toBe(150);
    expect(summary.acceptedCount).toBe(1);
    expect(summary.duplicateCount).toBe(149);
    expect(summary.overLimit).toBe(false);
  });

  it("builds bounded telemetry from normalized CAS only", () => {
    const summary = parseBatchSearchInput(
      [
        "90-90-4",
        "90-90-4",
        "344-04-07",
        "CAS\uFF1A\uFF16\uFF17\uFF0D\uFF16\uFF14\uFF0D\uFF11",
      ].join("\n"),
    );

    expect(buildBatchSearchTelemetryMeta(summary, { previewLimit: 1 })).toEqual({
      inputCount: 4,
      acceptedCount: 2,
      duplicateCount: 1,
      invalidCount: 1,
      overLimit: false,
      excess: 0,
      sentCasPreview: ["90-90-4"],
      sentCasOverflow: 1,
    });
  });
});
