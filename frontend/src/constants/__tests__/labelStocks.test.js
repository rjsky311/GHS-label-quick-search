import {
  isSmallLabelIdentityLayout,
  normalizePrintLabelConfig,
} from "@/constants/labelStocks";

describe("labelStocks small-label identity helpers", () => {
  it.each([
    [{ labelPurpose: "qrSupplement" }],
    [{ labelPurpose: "quickId" }],
    [{ template: "qrcode" }],
    [{ template: "icon" }],
  ])("recognizes %o as a locked small-label identity layout", (layout) => {
    expect(isSmallLabelIdentityLayout(layout)).toBe(true);
  });

  it("does not lock complete primary labels to small-label identity", () => {
    expect(
      isSmallLabelIdentityLayout({
        labelPurpose: "shipping",
        template: "full",
      }),
    ).toBe(false);
  });

  it("normalizes small-label outputs to CAS plus bilingual identity", () => {
    expect(
      normalizePrintLabelConfig({
        labelPurpose: "quickId",
        template: "icon",
        nameDisplay: "en",
      }),
    ).toEqual(expect.objectContaining({ nameDisplay: "both" }));
  });
});
