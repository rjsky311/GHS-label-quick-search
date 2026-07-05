import {
  BATCH_SEARCH_CHUNK_SIZE,
  BATCH_SEARCH_LIMIT,
  GHS_IMAGES,
} from "@/constants/ghs";

describe("batch search constants", () => {
  it("keeps frontend batch submissions within the backend public limit", () => {
    expect(BATCH_SEARCH_LIMIT).toBe(100);
    expect(BATCH_SEARCH_CHUNK_SIZE).toBe(20);
    expect(BATCH_SEARCH_LIMIT / BATCH_SEARCH_CHUNK_SIZE).toBeLessThanOrEqual(5);
  });
});

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
