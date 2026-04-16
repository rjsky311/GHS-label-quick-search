let mockLanguage = 'en';
jest.mock('@/i18n', () => ({
  get language() {
    return mockLanguage;
  },
}));

import { formatDate, formatRelativeTime } from '../formatDate';

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

describe('formatRelativeTime (v1.8 M1)', () => {
  const now = new Date('2026-04-16T12:00:00Z');

  beforeEach(() => {
    mockLanguage = 'en';
  });

  it('returns empty string for null / undefined input', () => {
    expect(formatRelativeTime(null, now)).toBe('');
    expect(formatRelativeTime(undefined, now)).toBe('');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('not-a-date');
  });

  it('treats sub-minute differences as the minute-0 slot', () => {
    const ts = '2026-04-16T11:59:30Z'; // 30s ago
    const result = formatRelativeTime(ts, now);
    // Intl's numeric=auto renders 0 minutes differently per runtime
    // ("now", "this minute", "0 minutes ago"). All acceptable;
    // just make sure it does NOT show a non-zero minute count.
    expect(result).not.toMatch(/\d+\s*minutes?/i);
  });

  it('formats minute-granularity differences in English', () => {
    const ts = '2026-04-16T11:55:00Z'; // 5 min ago
    expect(formatRelativeTime(ts, now)).toMatch(/5 minutes ago/);
  });

  it('formats hour-granularity differences', () => {
    const ts = '2026-04-16T09:00:00Z'; // 3 hours ago
    expect(formatRelativeTime(ts, now)).toMatch(/3 hours ago/);
  });

  it('formats day-granularity differences', () => {
    const ts = '2026-04-14T12:00:00Z'; // 2 days ago
    expect(formatRelativeTime(ts, now)).toMatch(/2 days ago/);
  });

  it('formats month-granularity differences', () => {
    const ts = '2026-02-01T12:00:00Z'; // ~2.5 months ago
    const result = formatRelativeTime(ts, now);
    expect(result).toMatch(/month/i);
  });

  it('produces localized output in zh-TW', () => {
    mockLanguage = 'zh-TW';
    const ts = '2026-04-16T11:55:00Z'; // 5 min ago
    const result = formatRelativeTime(ts, now);
    // Chinese phrasing contains "分鐘前" (minutes ago)
    expect(result).toMatch(/分鐘前/);
  });

  it('handles future timestamps gracefully (uses "in X" wording)', () => {
    // Unlikely in production, but the helper shouldn't crash
    const ts = '2026-04-16T12:05:00Z'; // 5 min in future
    const result = formatRelativeTime(ts, now);
    expect(result).toMatch(/in 5 minutes|5 minutes/);
  });
});
