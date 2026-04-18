/**
 * SDS (Safety Data Sheet) link utilities
 * Generates external URLs for PubChem / ECHA fallback links and
 * merges them with backend-enriched reference links when available.
 */

export function getPubChemSDSUrl(cid) {
  return cid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`
    : null;
}

export function getECHASearchUrl(cas) {
  return cas
    ? `https://chem.echa.europa.eu/substance-search?searchText=${encodeURIComponent(cas)}`
    : null;
}

export function getNioshPocketGuideUrl() {
  return "https://www.cdc.gov/niosh/npg/default.html";
}

export function normalizeReferenceLink(raw) {
  if (!raw || typeof raw !== "object") return null;
  const label =
    typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : "";
  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : "";
  if (!label || !url) return null;
  return {
    label,
    url,
    linkType:
      typeof raw.linkType === "string" && raw.linkType.trim()
        ? raw.linkType.trim()
        : typeof raw.link_type === "string" && raw.link_type.trim()
          ? raw.link_type.trim()
          : "reference",
    source:
      typeof raw.source === "string" && raw.source.trim()
        ? raw.source.trim()
        : "manual",
    priority:
      Number.isFinite(Number(raw.priority)) && Number(raw.priority) >= 0
        ? Number(raw.priority)
        : 50,
  };
}

function dedupeAndSortLinks(links) {
  const seen = new Set();
  return links
    .map(normalizeReferenceLink)
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
    .filter((link) => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    });
}

export function getFallbackReferenceLinks(cid, cas) {
  const fallback = [];
  if (cid) {
    fallback.push({
      label: "PubChem Safety & Hazards",
      url: getPubChemSDSUrl(cid),
      linkType: "sds",
      source: "pubchem",
      priority: 10,
    });
    fallback.push({
      label: "PubChem Compound Overview",
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      linkType: "reference",
      source: "pubchem",
      priority: 40,
    });
  }
  if (cas) {
    fallback.push({
      label: "ECHA Substance Search",
      url: getECHASearchUrl(cas),
      linkType: "regulatory",
      source: "echa",
      priority: 20,
    });
  }
  if (cid || cas) {
    fallback.push({
      label: "NIOSH Pocket Guide",
      url: getNioshPocketGuideUrl(),
      linkType: "occupational",
      source: "niosh",
      priority: 60,
    });
  }
  return dedupeAndSortLinks(fallback);
}

export function getReferenceLinks(result) {
  const backendLinks = Array.isArray(result?.reference_links)
    ? result.reference_links
    : [];
  return dedupeAndSortLinks([
    ...backendLinks,
    ...getFallbackReferenceLinks(result?.cid, result?.cas_number),
  ]);
}

export function getPreferredQrTarget(cid, cas, referenceLinks = []) {
  const normalizedLinks = dedupeAndSortLinks([
    ...referenceLinks,
    ...getFallbackReferenceLinks(cid, cas),
  ]);
  const preferred = normalizedLinks.find((link) =>
    ["sds", "regulatory", "occupational", "reference"].includes(link.linkType)
  );
  return (
    preferred?.url ||
    (cid
      ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      : cas
        ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
        : null)
  );
}
