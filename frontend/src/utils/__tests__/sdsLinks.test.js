import {
  getECHASearchUrl,
  getFallbackReferenceLinks,
  getPreferredQrTargetInfo,
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

  it("rejects unsafe or non-web URL schemes", () => {
    expect(
      normalizeReferenceLink({
        label: "Unsafe",
        url: "javascript:alert(1)",
      })
    ).toBeNull();
    expect(
      normalizeReferenceLink({
        label: "Data URL",
        url: "data:text/html,<script>alert(1)</script>",
      })
    ).toBeNull();
    expect(
      normalizeReferenceLink({
        label: "Relative",
        url: "/local/sds",
      })
    ).toBeNull();
  });

  it("normalizes known link types before rendering or QR reuse", () => {
    expect(
      normalizeReferenceLink({
        label: "Uppercase SDS",
        url: "https://example.com/sds",
        link_type: " SDS ",
      })?.linkType
    ).toBe("sds");
  });

  it("downgrades unknown link types to a safe reference role", () => {
    expect(
      normalizeReferenceLink({
        label: "Unknown Role",
        url: "https://example.com/reference",
        link_type: "javascript",
      })?.linkType
    ).toBe("reference");
  });
});

describe("getFallbackReferenceLinks", () => {
  it("includes PubChem, ECHA, and NIOSH fallback links", () => {
    const links = getFallbackReferenceLinks(702, "64-17-5");
    expect(links.map((link) => link.label)).toEqual([
      "PubChem Safety & Hazards",
      "ECHA Substance Search",
      "NIOSH Pocket Guide",
      "PubChem Compound Overview",
    ]);
    expect(links.find((link) => link.label === "NIOSH Pocket Guide").url).toBe(
      getNioshPocketGuideUrl()
    );
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

  it("drops unsafe backend-enriched links while keeping fallbacks", () => {
    const links = getReferenceLinks({
      cid: 702,
      cas_number: "64-17-5",
      reference_links: [
        {
          label: "Unsafe SDS",
          url: "javascript:alert(1)",
          link_type: "sds",
          priority: 1,
        },
      ],
    });

    expect(links.some((link) => link.label === "Unsafe SDS")).toBe(false);
    expect(links[0].label).toBe("PubChem Safety & Hazards");
  });

  it("keeps the strongest role when duplicate URLs have different link types", () => {
    const pubchemSds = getPubChemSDSUrl(702);
    const links = getReferenceLinks({
      cid: 702,
      cas_number: "64-17-5",
      reference_links: [
        {
          label: "Generic mirror of PubChem safety",
          url: pubchemSds,
          link_type: "reference",
          priority: 1,
        },
      ],
    });
    const safetyLink = links.find((link) => link.url === pubchemSds);

    expect(safetyLink).toMatchObject({
      label: "PubChem Safety & Hazards",
      linkType: "sds",
    });
  });

  it("orders visible links by authority role before numeric priority", () => {
    const links = getReferenceLinks({
      cid: 702,
      cas_number: "64-17-5",
      reference_links: [
        {
          label: "Generic internal note",
          url: "https://example.com/internal-note",
          link_type: "reference",
          priority: 1,
        },
        {
          label: "Supplier SDS",
          url: "https://example.com/supplier-sds",
          link_type: "sds",
          priority: 50,
        },
      ],
    });

    expect(links.map((link) => link.linkType)).toEqual([
      "sds",
      "sds",
      "regulatory",
      "occupational",
      "reference",
      "reference",
    ]);
    expect(links[0]).toMatchObject({
      label: "PubChem Safety & Hazards",
      linkType: "sds",
    });
    expect(links[1]).toMatchObject({
      label: "Supplier SDS",
      linkType: "sds",
    });
    expect(links[4]).toMatchObject({
      label: "Generic internal note",
      linkType: "reference",
    });
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

  it("does not prefer unsafe QR targets", () => {
    expect(
      getPreferredQrTarget(702, "64-17-5", [
        {
          label: "Unsafe SDS",
          url: "javascript:alert(1)",
          link_type: "sds",
          priority: 1,
        },
      ])
    ).toBe(getPubChemSDSUrl(702));
  });

  it("prefers SDS or regulatory targets over generic references even when references have higher priority", () => {
    expect(
      getPreferredQrTarget(702, "64-17-5", [
        {
          label: "Generic internal note",
          url: "https://example.com/internal-note",
          link_type: "reference",
          priority: 1,
        },
      ])
    ).toBe(getPubChemSDSUrl(702));
  });

  it("does not let a duplicate generic reference downgrade an SDS QR target", () => {
    const pubchemSds = getPubChemSDSUrl(702);

    expect(
      getPreferredQrTarget(702, "64-17-5", [
        {
          label: "Generic mirror of PubChem safety",
          url: pubchemSds,
          link_type: "reference",
          priority: 1,
        },
      ])
    ).toBe(pubchemSds);
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

describe("getPreferredQrTargetInfo", () => {
  it("returns role/source metadata for the chosen QR target", () => {
    expect(
      getPreferredQrTargetInfo(702, "64-17-5", [
        {
          label: "Manual supplier SDS",
          url: "https://example.com/manual-sds",
          link_type: "sds",
          source: "manual",
          priority: 1,
        },
      ])
    ).toMatchObject({
      label: "Manual supplier SDS",
      url: "https://example.com/manual-sds",
      linkType: "sds",
      source: "manual",
      isFallback: false,
    });
  });

  it("marks local PubChem/ECHA targets as fallbacks", () => {
    expect(getPreferredQrTargetInfo(702, "64-17-5")).toMatchObject({
      label: "PubChem Safety & Hazards",
      linkType: "sds",
      source: "pubchem",
      isFallback: true,
    });
    expect(getPreferredQrTargetInfo(null, "64-17-5")).toMatchObject({
      label: "ECHA Substance Search",
      linkType: "regulatory",
      source: "echa",
      isFallback: true,
    });
  });
});
