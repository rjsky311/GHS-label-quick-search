import axios from 'axios';
import { saveAs } from 'file-saver';

jest.mock('axios');
jest.mock('file-saver');

// `sonner`'s toast is called for the user-facing error / info paths.
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));
import { toast } from 'sonner';

jest.mock('@/i18n', () => ({
  t: (key) => key,
  language: 'en',
}));
jest.mock('@/constants/ghs', () => ({
  API: 'http://test-api',
}));

import { exportToExcel, exportToCSV, escapeCsvCell } from '../exportData';

const mockResult = {
  cas_number: '64-17-5',
  name_en: 'Ethanol',
  name_zh: '乙醇',
  ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
  hazard_statements: [{ code: 'H225', text_zh: '高度易燃液體和蒸氣' }],
  precautionary_statements: [
    { code: 'P210', text_zh: '遠離熱源。' },
    { code: 'P301+P310', text_zh: '如誤吞食：立即呼叫毒物中心。' },
  ],
  signal_word: 'Danger',
  signal_word_zh: '危險',
};

// Silence expected console.error/warn from the error paths.
let originalError, originalWarn;
beforeEach(() => {
  originalError = console.error;
  originalWarn = console.warn;
  console.error = jest.fn();
  console.warn = jest.fn();
});
afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

describe('escapeCsvCell', () => {
  it('returns empty string for null / undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('leaves safe values unchanged', () => {
    expect(escapeCsvCell('Ethanol')).toBe('Ethanol');
    expect(escapeCsvCell('64-17-5')).toBe('64-17-5'); // leading digit is safe
  });

  it('neutralizes formula-trigger prefixes', () => {
    expect(escapeCsvCell('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
    expect(escapeCsvCell('+cmd|calc')).toBe(`'+cmd|calc`);
    expect(escapeCsvCell('-1+1')).toBe(`'-1+1`);
    expect(escapeCsvCell('@SUM(A1:A10)')).toBe(`'@SUM(A1:A10)`);
    // Tab leads with an apostrophe but does not need RFC 4180 quoting
    // (tab is not a CSV delimiter in our build — commas, quotes, CR,
    // and LF are the only characters that force quoting).
    expect(escapeCsvCell('\tmalicious')).toBe(`'\tmalicious`);
  });

  it('wraps values containing comma, quote, CR, or LF in quotes', () => {
    expect(escapeCsvCell('a, b')).toBe(`"a, b"`);
    expect(escapeCsvCell('a "b" c')).toBe(`"a ""b"" c"`);
    expect(escapeCsvCell('line1\nline2')).toBe(`"line1\nline2"`);
  });

  it('coerces non-string values to string', () => {
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(true)).toBe('true');
  });
});

describe('exportToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately for empty results', async () => {
    await exportToExcel([]);
    expect(axios.post).not.toHaveBeenCalled();
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('calls server endpoint and saves blob on success', async () => {
    const blob = new Blob(['test']);
    axios.post.mockResolvedValueOnce({ data: blob });

    await exportToExcel([mockResult]);

    expect(axios.post).toHaveBeenCalledWith(
      'http://test-api/export/xlsx',
      expect.objectContaining({ results: [mockResult], format: 'xlsx' }),
      { responseType: 'blob' }
    );
    expect(saveAs).toHaveBeenCalledWith(blob, 'ghs_results.xlsx');
  });

  it('shows a toast error on server failure and does NOT emit a client-side file', async () => {
    axios.post.mockRejectedValueOnce(new Error('Server error'));

    await exportToExcel([mockResult]);

    // No client-side fallback: saveAs must not be called, and no
    // unsanitized xlsx is emitted. Only a user-facing error surfaces.
    expect(saveAs).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('export.errorXlsx');
  });
});

describe('exportToCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately for empty results', async () => {
    await exportToCSV([]);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('calls server endpoint and saves blob on success', async () => {
    const blob = new Blob(['csv']);
    axios.post.mockResolvedValueOnce({ data: blob });

    await exportToCSV([mockResult]);

    expect(axios.post).toHaveBeenCalledWith(
      'http://test-api/export/csv',
      expect.objectContaining({ format: 'csv' }),
      { responseType: 'blob' }
    );
    expect(saveAs).toHaveBeenCalledWith(blob, 'ghs_results.csv');
    // Happy path should not show a toast
    expect(toast.info).not.toHaveBeenCalled();
  });

  // Helper: capture the string content passed into `new Blob(...)`.
  // jsdom's Blob doesn't expose `.text()` synchronously, so we spy on
  // the constructor and collect the joined content from its first arg.
  function captureBlobContents() {
    let captured = null;
    const original = global.Blob;
    global.Blob = jest.fn(function (parts, opts) {
      const joined = Array.isArray(parts) ? parts.join('') : String(parts || '');
      captured = { content: joined, type: opts?.type || '' };
      // Return an object that passes the `instanceof Blob` check for
      // saveAs by reporting the type; real tests just check content.
      return { type: opts?.type || '', __mocked: true };
    });
    return {
      restore() {
        global.Blob = original;
      },
      get content() {
        return captured?.content ?? '';
      },
      get type() {
        return captured?.type ?? '';
      },
    };
  }

  it('falls back to a native CSV build on server error', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const capture = captureBlobContents();
    try {
      await exportToCSV([mockResult]);
    } finally {
      capture.restore();
    }

    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0][1]).toBe('ghs_results.csv');
    expect(capture.type).toBe('text/csv;charset=utf-8');
    expect(toast.info).toHaveBeenCalledWith('export.csvFallbackHint');
  });

  it('client-side CSV fallback neutralizes formula injection in cells', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const hostile = {
      cas_number: '64-17-5',
      name_en: '=HYPERLINK("http://bad","click")',
      name_zh: '+cmd',
      ghs_pictograms: null,
      hazard_statements: null,
    };

    const capture = captureBlobContents();
    try {
      await exportToCSV([hostile]);
    } finally {
      capture.restore();
    }

    const text = capture.content;
    // Dangerous prefixes must be neutralized. `=HYPERLINK(...)` also
    // gets CSV-quoted because it contains commas.
    expect(text).toContain("'=HYPERLINK");
    expect(text).toContain("'+cmd");
    // BOM so Excel opens as UTF-8.
    expect(text.charCodeAt(0)).toBe(0xfeff);
  });

  it('handles result with null ghs_pictograms in fallback', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const noGhs = {
      cas_number: '999-99-9',
      ghs_pictograms: null,
      hazard_statements: null,
    };

    const capture = captureBlobContents();
    try {
      await exportToCSV([noGhs]);
    } finally {
      capture.restore();
    }

    const text = capture.content;
    expect(text).toContain('export.none');
    expect(text).toContain('export.noHazard');
  });

  // ── Precautionary statements column (v1.8 M0 PR-C) ──
  it('client-side CSV fallback includes precautionary statements column', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));

    const capture = captureBlobContents();
    try {
      await exportToCSV([mockResult]);
    } finally {
      capture.restore();
    }

    const text = capture.content;
    // Header key for the new column (i18n mock returns keys as-is)
    expect(text).toContain('export.precautionaryStatements');
    // P-code values present
    expect(text).toContain('P210');
    expect(text).toContain('P301+P310');
  });

  it('client-side CSV fallback uses export.noPrecautionary when P-codes missing', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const noP = {
      cas_number: '7732-18-5',
      name_en: 'Water',
      name_zh: '水',
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [],
    };

    const capture = captureBlobContents();
    try {
      await exportToCSV([noP]);
    } finally {
      capture.restore();
    }

    const text = capture.content;
    expect(text).toContain('export.noPrecautionary');
  });

  it('client-side CSV fallback neutralizes formula injection inside P-code text', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const hostile = {
      cas_number: '64-17-5',
      name_en: 'x',
      name_zh: 'x',
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [
        // Whole cell value will be "P999: =HYPERLINK(...)" which does
        // NOT start with =, but ensures CSV escape handles the quote
        // character correctly.
        { code: 'P999', text_zh: '=HYPERLINK("http://bad")' },
      ],
    };

    const capture = captureBlobContents();
    try {
      await exportToCSV([hostile]);
    } finally {
      capture.restore();
    }

    const text = capture.content;
    // No raw unescaped HYPERLINK formula at the start of a cell
    expect(text).not.toMatch(/,=HYPERLINK/);
    expect(text).not.toMatch(/"=HYPERLINK/);
  });
});
