import {
  PRINT_OUTPUT_IDS,
  SMALL_LABEL_CONTINUATION_POLICY,
  getSmallLabelContinuationPolicy,
  getCompactPictogramCapacity,
  getQrSmallLabelPictogramGrid,
  requiresSmallLabelRecovery,
  validateSmallLabelContinuationSet,
} from "@/utils/printOutputContract";

const pictograms = (count) =>
  Array.from({ length: count }, (_, index) => ({ code: `GHS0${index + 1}` }));

describe("printOutputContract", () => {
  it("pins the three public output ids", () => {
    expect(Object.values(PRINT_OUTPUT_IDS)).toEqual([
      "complete",
      "qrSupplement",
      "quickId",
    ]);
  });

  it("pins strict small-label continuation limits and first-label pressure caps", () => {
    expect(SMALL_LABEL_CONTINUATION_POLICY.qrSupplement).toMatchObject({
      targetLabels: 1,
      maxLabels: 2,
      comfortablePictogramTarget: 6,
      firstLabelPictogramTarget: 9,
    });
    expect(SMALL_LABEL_CONTINUATION_POLICY.quickId).toMatchObject({
      targetLabels: 1,
      maxLabels: 2,
      comfortablePictogramTarget: 6,
      firstLabelPictogramTarget: 9,
    });
  });

  it("uses nine pictograms as the compact first-label pressure cap", () => {
    expect(
      getCompactPictogramCapacity(
        { stockPreset: "brother-62mm-continuous", labelPurpose: "qrSupplement" },
        "qrcode",
        0,
      ),
    ).toBe(9);
    expect(
      getCompactPictogramCapacity(
        { stockPreset: "small-strip", labelPurpose: "quickId" },
        "icon",
        0,
      ),
    ).toBe(9);
  });

  it("selects QR small-label pictogram grids from the usable lower area", () => {
    expect(getQrSmallLabelPictogramGrid(6)).toEqual({
      columns: 3,
      rows: 2,
      pressure: false,
    });
    expect(getQrSmallLabelPictogramGrid(8)).toEqual({
      columns: 4,
      rows: 2,
      pressure: false,
    });
    expect(getQrSmallLabelPictogramGrid(9)).toEqual({
      columns: 3,
      rows: 3,
      pressure: true,
    });
  });

  it("marks third small-label pages as recovery instead of a normal path", () => {
    expect(requiresSmallLabelRecovery("qrSupplement", 1)).toBe(false);
    expect(requiresSmallLabelRecovery("qrSupplement", 2)).toBe(false);
    expect(requiresSmallLabelRecovery("qrSupplement", 3)).toBe(true);
    expect(requiresSmallLabelRecovery("quickId", 3)).toBe(true);
  });

  it("validates that small labels never omit pictograms within the accepted set", () => {
    const result = validateSmallLabelContinuationSet({
      outputId: "qrSupplement",
      sourcePictograms: pictograms(7),
      pages: [pictograms(6), [pictograms(7)[6]]],
    });

    expect(result).toEqual({
      ok: true,
      pageCount: 2,
      missingCodes: [],
      overLimit: false,
    });
  });

  it("reports missing pictograms and over-limit continuation sets", () => {
    const result = validateSmallLabelContinuationSet({
      outputId: "quickId",
      sourcePictograms: pictograms(7),
      pages: [
        [{ code: "GHS01" }, { code: "GHS02" }, { code: "GHS03" }],
        [{ code: "GHS05" }, { code: "GHS06" }],
        [{ code: "GHS01" }],
      ],
    });

    expect(result).toEqual({
      ok: false,
      pageCount: 3,
      missingCodes: ["GHS04", "GHS07"],
      overLimit: true,
    });
  });

  it("returns no small-label policy for complete labels", () => {
    expect(getSmallLabelContinuationPolicy("complete")).toBeNull();
  });
});
