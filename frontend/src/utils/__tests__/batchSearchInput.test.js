import {
  buildBatchSearchTelemetryMeta,
  hasValidCasChecksum,
  normalizeCasToken,
  normalizeCasTokenDetailed,
  parseBatchSearchInput,
  rehyphenateCasDigits,
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

  it("splits CAS values that users paste on one line with spaces", () => {
    expect(
      splitBatchSearchInput(
        "90-41-5 84-65-1 CAS No. 462-08-8 CAS: 123-30-8",
      ),
    ).toEqual(["90-41-5", "84-65-1", "CAS No. 462-08-8", "CAS: 123-30-8"]);
  });

  it("does not split spaces that belong to a single CAS token", () => {
    expect(splitBatchSearchInput("CAS No. 62 \u2013 53 \u2013 3")).toEqual([
      "CAS No. 62 \u2013 53 \u2013 3",
    ]);
  });

  it("normalizes CAS prefixes, full-width characters, spaces, and dash variants", () => {
    expect(normalizeCasToken(" CAS\uFF1A\uFF16\uFF17\uFF0D\uFF16\uFF14\uFF0D\uFF11 ")).toBe(
      "67-64-1",
    );
    expect(normalizeCasToken("CAS # 90\u201190\u20104")).toBe("90-90-4");
    expect(normalizeCasToken("CAS No. 62 \u2013 53 \u2013 3")).toBe("62-53-3");
  });

  it("rehyphenates numeric CAS values copied from spreadsheets", () => {
    expect(rehyphenateCasDigits("67641")).toBe("67-64-1");
    expect(rehyphenateCasDigits("902084")).toBe("902-08-4");
    expect(normalizeCasToken("CAS 67641")).toBe("67-64-1");
    expect(normalizeCasTokenDetailed("67641")).toEqual({
      rawNormalized: "67641",
      normalized: "67-64-1",
      wasRehyphenated: true,
    });
  });

  it("extracts only the CAS column from tabular spreadsheet pastes with a header", () => {
    const summary = parseBatchSearchInput(
      [
        "登入日期\tCAS No.\t品名\t供應商統編",
        "20200813\t67641\tAcetone\t23282972",
        "20200814\t90-41-5\t2-Aminobiphenyl\t299250050",
        "20200815\t1003094\t2-Bromothiophene\t75989",
      ].join("\n"),
    );

    expect(summary.queries).toEqual(["67-64-1", "90-41-5", "1003-09-4"]);
    expect(summary.inputCount).toBe(3);
    expect(summary.rehyphenatedItems).toEqual([
      expect.objectContaining({ raw: "67641", normalized: "67-64-1" }),
      expect.objectContaining({ raw: "1003094", normalized: "1003-09-4" }),
    ]);
    expect(summary.invalidItems).toEqual([]);
  });

  it("does not rehyphenate unrelated numeric cells from headerless tabular rows", () => {
    const summary = parseBatchSearchInput(
      [
        "Acetone\t20200813\tCAS 67-64-1\t23282972",
        "2-Aminobiphenyl\t299250050\t90-41-5\t75989",
        "Supplier row\t20201231\t23282972",
      ].join("\n"),
    );

    expect(summary.queries).toEqual(["67-64-1", "90-41-5"]);
    expect(summary.inputCount).toBe(2);
    expect(summary.rehyphenatedCount).toBe(0);
    expect(summary.invalidItems).toEqual([]);
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
        "67641",
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
    expect(summary.inputCount).toBe(8);
    expect(summary.acceptedCount).toBe(4);
    expect(summary.duplicateItems).toEqual([
      expect.objectContaining({ normalized: "90-90-4", reason: "duplicate" }),
      expect.objectContaining({ normalized: "67-64-1", reason: "duplicate" }),
    ]);
    expect(summary.rehyphenatedItems).toEqual([
      expect.objectContaining({
        raw: "67641",
        normalized: "67-64-1",
        reason: "numeric-cas",
      }),
    ]);
    expect(summary.invalidItems).toEqual([
      expect.objectContaining({ normalized: "344-04-07", reason: "format" }),
      expect.objectContaining({ normalized: "67-64-2", reason: "checksum" }),
    ]);
  });

  it("accepts messy same-line pasted CAS lists without forwarding duplicates or invalid values", () => {
    const summary = parseBatchSearchInput(
      [
        "90-41-5 84-65-1 CAS No. 462-08-8 CAS: 123-30-8",
        "90-41-5",
        "344-04-07",
        "CAS No. 62 \u2013 53 \u2013 3",
      ].join("\n"),
    );

    expect(summary.queries).toEqual([
      "90-41-5",
      "84-65-1",
      "462-08-8",
      "123-30-8",
      "62-53-3",
    ]);
    expect(summary.inputCount).toBe(7);
    expect(summary.duplicateItems).toEqual([
      expect.objectContaining({ normalized: "90-41-5", reason: "duplicate" }),
    ]);
    expect(summary.invalidItems).toEqual([
      expect.objectContaining({ normalized: "344-04-07", reason: "format" }),
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
        "67641",
        "CAS\uFF1A\uFF16\uFF17\uFF0D\uFF16\uFF14\uFF0D\uFF11",
      ].join("\n"),
    );

    expect(buildBatchSearchTelemetryMeta(summary, { previewLimit: 1 })).toEqual({
      inputCount: 5,
      acceptedCount: 2,
      duplicateCount: 2,
      invalidCount: 1,
      rehyphenatedCount: 1,
      overLimit: false,
      excess: 0,
      sentCasPreview: ["90-90-4"],
      sentCasOverflow: 1,
    });
  });
});
