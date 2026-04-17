/**
 * SDS (Safety Data Sheet) link utilities
 * Generates external URLs for PubChem Safety & ECHA chemical search
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

export function getPreferredQrTarget(cid, cas) {
  return (
    getPubChemSDSUrl(cid) ||
    getECHASearchUrl(cas) ||
    (cid
      ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      : cas
        ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
        : null)
  );
}
