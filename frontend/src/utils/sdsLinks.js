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
    ? `https://echa.europa.eu/search-for-chemicals/-/search/?q=${encodeURIComponent(cas)}`
    : null;
}
