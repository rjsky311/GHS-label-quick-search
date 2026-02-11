import { getPubChemSDSUrl, getECHASearchUrl } from '../sdsLinks';

describe('getPubChemSDSUrl', () => {
  it('returns correct URL for a valid CID', () => {
    expect(getPubChemSDSUrl(702)).toBe(
      'https://pubchem.ncbi.nlm.nih.gov/compound/702#section=Safety-and-Hazards'
    );
  });

  it('returns null for null input', () => {
    expect(getPubChemSDSUrl(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getPubChemSDSUrl(undefined)).toBeNull();
  });

  it('returns null for 0 (falsy)', () => {
    expect(getPubChemSDSUrl(0)).toBeNull();
  });
});

describe('getECHASearchUrl', () => {
  it('returns correct URL for a valid CAS number', () => {
    const url = getECHASearchUrl('64-17-5');
    expect(url).toBe(
      'https://echa.europa.eu/search-for-chemicals/-/search/?q=64-17-5'
    );
  });

  it('returns null for empty string', () => {
    expect(getECHASearchUrl('')).toBeNull();
  });

  it('encodes special characters in CAS number', () => {
    const url = getECHASearchUrl('test&value=1');
    expect(url).toContain(encodeURIComponent('test&value=1'));
  });
});
