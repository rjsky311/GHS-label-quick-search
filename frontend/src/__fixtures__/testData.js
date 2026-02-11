/**
 * Shared test fixtures for Phase 2 component tests.
 */

// Complete chemical with Danger signal word, 2 pictograms, multiple classifications
export const mockFoundResult = {
  cas_number: '64-17-5',
  cid: 702,
  name_en: 'Ethanol',
  name_zh: '乙醇',
  found: true,
  ghs_pictograms: [
    { code: 'GHS02', name_zh: '易燃' },
    { code: 'GHS07', name_zh: '刺激性' },
  ],
  hazard_statements: [
    { code: 'H225', text_zh: '高度易燃液體和蒸氣' },
    { code: 'H319', text_zh: '造成嚴重眼睛刺激' },
  ],
  signal_word: 'Danger',
  signal_word_zh: '危險',
  other_classifications: [
    {
      pictograms: [{ code: 'GHS07', name_zh: '刺激性' }],
      hazard_statements: [{ code: 'H302', text_zh: '吞食有害' }],
      signal_word: 'Warning',
      signal_word_zh: '警告',
      source: 'ECHA C&L Notifications (source 2)',
    },
  ],
  has_multiple_classifications: true,
};

// Not found result
export const mockNotFoundResult = {
  cas_number: '999-99-9',
  found: false,
  error: 'CAS number not found in PubChem',
};

// Found but no GHS hazard (Water)
export const mockNoHazardResult = {
  cas_number: '7732-18-5',
  cid: 962,
  name_en: 'Water',
  name_zh: '水',
  found: true,
  ghs_pictograms: [],
  hazard_statements: [],
  signal_word: null,
  signal_word_zh: null,
  other_classifications: [],
  has_multiple_classifications: false,
};

// Warning-level chemical (Acetone)
export const mockWarningResult = {
  cas_number: '67-64-1',
  cid: 180,
  name_en: 'Acetone',
  name_zh: '丙酮',
  found: true,
  ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
  hazard_statements: [{ code: 'H225', text_zh: '高度易燃液體和蒸氣' }],
  signal_word: 'Warning',
  signal_word_zh: '警告',
  other_classifications: [],
  has_multiple_classifications: false,
};

/**
 * Creates a mock getEffectiveClassification function.
 * Returns classification data from the result object, or null for unfound results.
 */
export function createMockGetEffective(overrides = {}) {
  return jest.fn((result) => {
    if (!result || !result.found) return null;
    return {
      pictograms: result.ghs_pictograms || [],
      hazard_statements: result.hazard_statements || [],
      signal_word: result.signal_word,
      signal_word_zh: result.signal_word_zh,
      isCustom: false,
      customIndex: 0,
      note: '',
      ...overrides,
    };
  });
}
