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
