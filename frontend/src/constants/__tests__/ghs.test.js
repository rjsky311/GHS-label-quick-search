import { GHS_IMAGES } from "@/constants/ghs";

describe("GHS_IMAGES", () => {
  it("uses stable public asset paths for all official pictograms", () => {
    expect(Object.keys(GHS_IMAGES).sort()).toEqual([
      "GHS01",
      "GHS02",
      "GHS03",
      "GHS04",
      "GHS05",
      "GHS06",
      "GHS07",
      "GHS08",
      "GHS09",
    ]);

    Object.entries(GHS_IMAGES).forEach(([code, path]) => {
      expect(path).toBe(`/ghs/${code}.svg`);
    });
  });
});
