/**
 * SDS (Safety Data Sheet) link utilities
 * Generates external URLs for PubChem / ECHA fallback links and
 * merges them with backend-enriched reference links when available.
 */

const REFERENCE_LINK_TYPES = new Set([
  "sds",
  "regulatory",
  "occupational",
  "reference",
]);

const QR_TARGET_TYPE_PRIORITY = ["sds", "regulatory", "occupational", "reference"];
const REFERENCE_LINK_TYPE_RANK = new Map(
  QR_TARGET_TYPE_PRIORITY.map((linkType, index) => [linkType, index])
);

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

function isSafeReferenceUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeReferenceLinkType(raw) {
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return REFERENCE_LINK_TYPES.has(normalized) ? normalized : "reference";
}

export function normalizeReferenceLink(raw) {
  if (!raw || typeof raw !== "object") return null;
  const label =
    typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : "";
  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : "";
  if (!label || !url || !isSafeReferenceUrl(url)) return null;
  return {
    label,
    url,
    linkType: normalizeReferenceLinkType(raw.linkType ?? raw.link_type),
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

function linkTypeRank(link) {
  return REFERENCE_LINK_TYPE_RANK.get(link?.linkType) ?? 99;
}

function preferredDuplicateLink(current, candidate) {
  const currentRank = linkTypeRank(current);
  const candidateRank = linkTypeRank(candidate);
  if (candidateRank !== currentRank) {
    return candidateRank < currentRank ? candidate : current;
  }
  if (candidate.priority !== current.priority) {
    return candidate.priority < current.priority ? candidate : current;
  }
  return candidate.label.localeCompare(current.label) < 0 ? candidate : current;
}

function dedupeAndSortLinks(links) {
  const byUrl = new Map();
  links
    .map(normalizeReferenceLink)
    .filter(Boolean)
    .forEach((link) => {
      const current = byUrl.get(link.url);
      byUrl.set(link.url, current ? preferredDuplicateLink(current, link) : link);
    });

  return [...byUrl.values()].sort(
    (a, b) =>
      linkTypeRank(a) - linkTypeRank(b) ||
      a.priority - b.priority ||
      a.label.localeCompare(b.label)
  );
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
  const preferred = QR_TARGET_TYPE_PRIORITY.map((linkType) =>
    normalizedLinks.find((link) => link.linkType === linkType)
  ).find(Boolean);
  return (
    preferred?.url ||
    (cid
      ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      : cas
        ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
        : null)
  );
}
