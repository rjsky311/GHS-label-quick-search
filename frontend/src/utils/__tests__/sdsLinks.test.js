import {
  getPubChemSDSUrl,
  getECHASearchUrl,
  getPreferredQrTarget,
} from '../sdsLinks';

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
      'https://chem.echa.europa.eu/substance-search?searchText=64-17-5'
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

describe('getPreferredQrTarget', () => {
  it('prefers PubChem SDS when a CID is present', () => {
    expect(getPreferredQrTarget(702, '64-17-5')).toBe(
      getPubChemSDSUrl(702)
    );
  });

  it('falls back to ECHA search when CID is missing but CAS exists', () => {
    expect(getPreferredQrTarget(null, '64-17-5')).toBe(
      getECHASearchUrl('64-17-5')
    );
  });

  it('still uses the PubChem SDS target when only CID exists', () => {
    expect(getPreferredQrTarget(702, '')).toBe(
      'https://pubchem.ncbi.nlm.nih.gov/compound/702#section=Safety-and-Hazards'
    );
  });

  it('returns null when both CID and CAS are missing', () => {
    expect(getPreferredQrTarget(null, null)).toBeNull();
  });
});
