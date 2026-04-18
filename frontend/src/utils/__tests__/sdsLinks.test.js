import {
  getECHASearchUrl,
  getFallbackReferenceLinks,
  getNioshPocketGuideUrl,
  getPreferredQrTarget,
  getPubChemSDSUrl,
  getReferenceLinks,
  normalizeReferenceLink,
} from "../sdsLinks";

describe("getPubChemSDSUrl", () => {
  it("returns correct URL for a valid CID", () => {
    expect(getPubChemSDSUrl(702)).toBe(
      "https://pubchem.ncbi.nlm.nih.gov/compound/702#section=Safety-and-Hazards"
    );
  });

  it("returns null for falsy CID", () => {
    expect(getPubChemSDSUrl(null)).toBeNull();
    expect(getPubChemSDSUrl(undefined)).toBeNull();
    expect(getPubChemSDSUrl(0)).toBeNull();
  });
});

describe("getECHASearchUrl", () => {
  it("returns correct URL for a valid CAS number", () => {
    expect(getECHASearchUrl("64-17-5")).toBe(
      "https://chem.echa.europa.eu/substance-search?searchText=64-17-5"
    );
  });

  it("returns null for empty input", () => {
    expect(getECHASearchUrl("")).toBeNull();
  });

  it("encodes special characters in the query", () => {
    expect(getECHASearchUrl("test&value=1")).toContain(
      encodeURIComponent("test&value=1")
    );
  });
});

describe("normalizeReferenceLink", () => {
  it("accepts snake_case backend payloads", () => {
    expect(
      normalizeReferenceLink({
        label: "Custom SDS",
        url: "https://example.com/sds",
        link_type: "sds",
        priority: 5,
      })
    ).toEqual({
      label: "Custom SDS",
      url: "https://example.com/sds",
      linkType: "sds",
      source: "manual",
      priority: 5,
    });
  });
});

describe("getFallbackReferenceLinks", () => {
  it("includes PubChem, ECHA, and NIOSH fallback links", () => {
    const links = getFallbackReferenceLinks(702, "64-17-5");
    expect(links.map((link) => link.label)).toEqual([
      "PubChem Safety & Hazards",
      "ECHA Substance Search",
      "PubChem Compound Overview",
      "NIOSH Pocket Guide",
    ]);
    expect(links.at(-1).url).toBe(getNioshPocketGuideUrl());
  });
});

describe("getReferenceLinks", () => {
  it("merges backend-enriched links with local fallbacks", () => {
    const links = getReferenceLinks({
      cid: 702,
      cas_number: "64-17-5",
      reference_links: [
        {
          label: "Manual SDS",
          url: "https://example.com/manual-sds",
          link_type: "sds",
          priority: 1,
        },
      ],
    });

    expect(links[0]).toMatchObject({
      label: "Manual SDS",
      linkType: "sds",
    });
    expect(links.some((link) => link.label === "ECHA Substance Search")).toBe(
      true
    );
    expect(links.some((link) => link.label === "NIOSH Pocket Guide")).toBe(
      true
    );
  });
});

describe("getPreferredQrTarget", () => {
  it("prefers backend-enriched SDS links when present", () => {
    expect(
      getPreferredQrTarget(702, "64-17-5", [
        {
          label: "Manual SDS",
          url: "https://example.com/manual-sds",
          link_type: "sds",
          priority: 1,
        },
      ])
    ).toBe("https://example.com/manual-sds");
  });

  it("falls back to PubChem SDS when no custom links exist", () => {
    expect(getPreferredQrTarget(702, "64-17-5")).toBe(getPubChemSDSUrl(702));
  });

  it("falls back to ECHA when CID is missing but CAS exists", () => {
    expect(getPreferredQrTarget(null, "64-17-5")).toBe(
      getECHASearchUrl("64-17-5")
    );
  });

  it("returns null when both CID and CAS are missing", () => {
    expect(getPreferredQrTarget(null, null)).toBeNull();
  });
});
