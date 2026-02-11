import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

jest.mock('axios');
jest.mock('file-saver');
jest.mock('xlsx', () => {
  const mockWb = { SheetNames: [], Sheets: {} };
  return {
    __esModule: true,
    utils: {
      aoa_to_sheet: jest.fn(() => ({})),
      book_new: jest.fn(() => mockWb),
      book_append_sheet: jest.fn(),
      sheet_to_csv: jest.fn(() => 'csv,data'),
    },
    writeFile: jest.fn(),
  };
});
jest.mock('@/i18n', () => ({
  t: (key) => key,
  language: 'en',
}));
jest.mock('@/constants/ghs', () => ({
  API: 'http://test-api',
}));

import { exportToExcel, exportToCSV } from '../exportData';

const mockResult = {
  cas_number: '64-17-5',
  name_en: 'Ethanol',
  name_zh: '乙醇',
  ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
  hazard_statements: [{ code: 'H225', text_zh: '高度易燃液體和蒸氣' }],
  signal_word: 'Danger',
  signal_word_zh: '危險',
};

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

  it('falls back to client-side XLSX on server error', async () => {
    axios.post.mockRejectedValueOnce(new Error('Server error'));

    await exportToExcel([mockResult]);

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    expect(XLSX.writeFile.mock.calls[0][1]).toBe('ghs_results.xlsx');
  });

  it('handles result with missing optional fields in fallback', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const sparse = { cas_number: '123-45-6', found: true };

    await exportToExcel([sparse]);

    const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    // Header row + 1 data row
    expect(sheetData).toHaveLength(2);
    // Data row should have empty strings for missing fields
    expect(sheetData[1][1]).toBe(''); // name_en
    expect(sheetData[1][2]).toBe(''); // name_zh
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
  });

  it('falls back to client-side CSV with BOM on server error', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));

    await exportToCSV([mockResult]);

    expect(XLSX.utils.sheet_to_csv).toHaveBeenCalled();
    const blobArg = saveAs.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/csv;charset=utf-8');
  });

  it('handles result with null ghs_pictograms in fallback', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'));
    const noGhs = { cas_number: '999-99-9', ghs_pictograms: null, hazard_statements: null };

    await exportToCSV([noGhs]);

    const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    expect(sheetData).toHaveLength(2);
    // GHS column should have i18n key for "none"
    expect(sheetData[1][3]).toBe('export.none');
    // Hazard column should have i18n key for "noHazard"
    expect(sheetData[1][5]).toBe('export.noHazard');
  });
});
