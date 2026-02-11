let mockLanguage = 'en';
jest.mock('@/i18n', () => ({
  get language() {
    return mockLanguage;
  },
}));

import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('formats date in English locale', () => {
    mockLanguage = 'en';
    const result = formatDate('2024-06-15T10:30:00Z');
    // en-US short month format should contain "Jun" and "15"
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/15/);
  });

  it('formats date in zh-TW locale', () => {
    mockLanguage = 'zh-TW';
    const result = formatDate('2024-06-15T10:30:00Z');
    // zh-TW format should contain Chinese month/day characters
    expect(result).toMatch(/6月/);
    expect(result).toMatch(/15/);
  });

  it('produces different output for different languages', () => {
    mockLanguage = 'en';
    const enResult = formatDate('2024-12-25T08:00:00Z');

    mockLanguage = 'zh-TW';
    const zhResult = formatDate('2024-12-25T08:00:00Z');

    expect(enResult).not.toBe(zhResult);
  });

  it('handles midnight time (00:00 UTC)', () => {
    mockLanguage = 'en';
    const result = formatDate('2024-01-01T00:00:00Z');
    // Should produce a valid date string containing "Jan" and "1"
    expect(result).toMatch(/Jan/);
  });

  it('handles end-of-year date', () => {
    mockLanguage = 'en';
    const result = formatDate('2024-12-31T23:59:00Z');
    expect(result).toMatch(/Dec|Jan/); // Dec 31 or Jan 1 depending on timezone
  });
});
