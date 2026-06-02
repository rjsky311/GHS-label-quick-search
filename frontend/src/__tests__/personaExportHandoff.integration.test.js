import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import App from '@/App';
import { exportToExcel } from '@/utils/exportData';
import { inventoryDataQualityFixtureResults } from '@/utils/testFixtures/inventoryDataQualityFixtures';

jest.mock('axios');

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock('@/utils/exportData', () => {
  const actual = jest.requireActual('@/utils/exportData');
  return {
    ...actual,
    exportToCSV: jest.fn(),
    exportToExcel: jest.fn(),
  };
});

jest.mock('@/components/GHSImage', () => (props) => (
  <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>
));

jest.setTimeout(15000);

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  exportToExcel.mockResolvedValue(undefined);
});

async function runBatchSearch({ casInputs, mockResponses }) {
  axios.post.mockImplementation(async (url) => {
    if (url.endsWith('/api/search')) {
      return { data: mockResponses };
    }
    return { data: {} };
  });
  axios.get.mockResolvedValue({ data: { results: [] } });

  await act(async () => {
    fireEvent.click(screen.getByTestId('batch-search-tab'));
  });

  await act(async () => {
    fireEvent.change(screen.getByTestId('batch-cas-input'), {
      target: { value: casInputs.join('\n') },
    });
  });

  await act(async () => {
    fireEvent.click(screen.getByTestId('batch-search-btn'));
  });

  await waitFor(() =>
    expect(screen.getByText('results.title')).toBeInTheDocument()
  );
}

async function confirmScope(scopeKey) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`export-preview-scope-${scopeKey}`));
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId('export-preview-confirm'));
  });
}

describe('persona gate: lab manager export handoff', () => {
  it('separates ready, needs-review, and unresolved scopes before download', async () => {
    render(<App />);

    await runBatchSearch({
      casInputs: inventoryDataQualityFixtureResults.map(
        (result) => result.cas_number
      ),
      mockResponses: inventoryDataQualityFixtureResults,
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('export-xlsx-btn'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('export-preview-modal')).toBeInTheDocument()
    );
    expect(screen.getByTestId('export-preview-scope-ready')).toBeInTheDocument();
    expect(
      screen.getByTestId('export-preview-scope-needs-review')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('export-preview-scope-unresolved')
    ).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-workbook-layout')).toHaveTextContent(
      'exportPreview.workbookLayoutTitle'
    );
    expect(
      screen.getByTestId('export-preview-review-action-columns')
    ).toHaveTextContent('exportPreview.reviewActionColumnsTitle');

    await confirmScope('ready');

    await waitFor(() => expect(exportToExcel).toHaveBeenCalledTimes(1));
    expect(exportToExcel).toHaveBeenLastCalledWith(
      [expect.objectContaining({ cas_number: '67-64-1' })],
      expect.objectContaining({
        scopeKey: 'ready',
        count: 1,
        totalCount: 8,
        visibleCount: 8,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('export-xlsx-btn'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('export-preview-modal')).toBeInTheDocument()
    );
    await confirmScope('needs-review');

    await waitFor(() => expect(exportToExcel).toHaveBeenCalledTimes(2));
    const [needsReviewRows, needsReviewMeta] = exportToExcel.mock.calls.at(-1);
    expect(needsReviewRows.map((result) => result.cas_number)).toEqual([
      '90-41-5',
      '84-65-1',
      '50-00-0',
      '100-00-5',
      '57-13-6',
      '75-21-8',
    ]);
    expect(needsReviewMeta).toEqual(
      expect.objectContaining({
        scopeKey: 'needs-review',
        count: 6,
        totalCount: 8,
        visibleCount: 8,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('export-xlsx-btn'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('export-preview-modal')).toBeInTheDocument()
    );
    await confirmScope('unresolved');

    await waitFor(() => expect(exportToExcel).toHaveBeenCalledTimes(3));
    expect(exportToExcel).toHaveBeenLastCalledWith(
      [expect.objectContaining({ cas_number: '9999-99-9' })],
      expect.objectContaining({
        scopeKey: 'unresolved',
        count: 1,
        totalCount: 8,
        visibleCount: 8,
      })
    );
  });
});
