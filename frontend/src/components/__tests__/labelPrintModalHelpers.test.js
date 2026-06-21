import { buildBatchReviewCsv } from "@/components/label-print/labelPrintModalHelpers";

const tx = (_key, defaultValue) => defaultValue;

describe("buildBatchReviewCsv", () => {
  it("neutralizes formula injection in every browser batch review CSV cell", () => {
    const csv = buildBatchReviewCsv(
      [
        {
          index: 0,
          cas: "=2+2",
          identity: "+cmd",
          category: "@review",
          preferredPurpose: "\tpreferred",
          effectivePurpose: "-effective",
          reason: { type: "unknown" },
        },
      ],
      (key, defaultValue) =>
        key === "label.batchReasonFit" ? "-reason" : tx(key, defaultValue),
    );

    expect(csv).toContain("'=2+2");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@review");
    expect(csv).toContain("'\tpreferred");
    expect(csv).toContain("'-effective");
    expect(csv).toContain("'-reason");
    expect(csv).not.toMatch(/(^|,)"?[=+\-@\t]/m);
  });
});
