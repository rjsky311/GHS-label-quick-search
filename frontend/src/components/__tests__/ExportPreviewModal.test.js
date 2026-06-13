import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportPreviewModal from '../ExportPreviewModal';
import {
  inventoryDataQualityFixtureResults,
} from '../../utils/testFixtures/inventoryDataQualityFixtures';

const results = [
  {
    cas_number: '64-17-5',
    name_en: 'Ethanol',
    name_zh: '乙醇',
    found: true,
    ghs_pictograms: [{ code: 'GHS02', name_en: 'Flame' }],
    hazard_statements: [{ code: 'H225', text_en: 'Highly flammable liquid and vapor.' }],
    precautionary_statements: [{ code: 'P210', text_en: 'Keep away from heat.' }],
    signal_word: 'Danger',
  },
  {
    cas_number: '999-99-9',
    found: false,
    error: 'Not found',
  },
];

function expectNotebookPrimaryControl(element) {
  expect(element).toHaveClass('notebook-control', 'notebook-control-primary');
  expect(element.className).not.toContain('bg-blue-700');
  expect(element.className).not.toContain('hover:bg-blue-800');
  expect(element.className).not.toContain('text-white');
}

function expectNotebookSecondaryControl(element) {
  expect(element).toHaveClass('notebook-control', 'notebook-control-secondary');
  expect(element.className).not.toContain('bg-blue-700');
  expect(element.className).not.toContain('hover:bg-blue-800');
  expect(element.className).not.toContain('text-white');
}

describe('ExportPreviewModal', () => {
  it('renders a preview of the current export scope', () => {
    render(
      <ExportPreviewModal
        results={results}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByTestId('export-preview-modal')).toBeInTheDocument();
    expect(screen.getByText('exportPreview.title')).toBeInTheDocument();
    expect(screen.getAllByTestId('export-preview-row')).toHaveLength(2);
    expect(screen.getByTestId('export-preview-scope-visible')).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-scope-ready')).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-scope-needs-review')).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-scope-unresolved')).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-summary-ready')).toHaveTextContent(
      'exportPreview.readyCount',
    );
    expect(screen.getByTestId('export-preview-summary-review')).toHaveTextContent(
      'exportPreview.reviewCount',
    );
    expect(screen.getByTestId('export-preview-summary-unresolved')).toHaveTextContent(
      'exportPreview.unresolvedCount',
    );
    expect(screen.getByText('64-17-5')).toBeInTheDocument();
    expect(screen.getByText('999-99-9')).toBeInTheDocument();
    expect(screen.getByText('export.dataState')).toBeInTheDocument();
    expect(screen.getByText('export.primarySource')).toBeInTheDocument();
    expect(screen.getByText('export.classificationSelection')).toBeInTheDocument();
    expect(screen.getByTestId('export-preview-workbook-layout')).toHaveTextContent(
      'exportPreview.workbookLayoutTitle',
    );
    expect(screen.getByTestId('export-preview-review-action-columns')).toHaveTextContent(
      'exportPreview.reviewActionColumnsTitle',
    );
  });

  it('uses notebook controls for export choices and footer actions', () => {
    render(
      <ExportPreviewModal
        results={results}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expectNotebookPrimaryControl(screen.getByTestId('export-preview-scope-visible'));
    expectNotebookSecondaryControl(screen.getByTestId('export-preview-scope-ready'));
    expectNotebookPrimaryControl(screen.getByTestId('export-preview-format-xlsx'));
    expectNotebookSecondaryControl(screen.getByTestId('export-preview-format-csv'));
    expectNotebookSecondaryControl(screen.getByTestId('export-preview-cancel'));
    expectNotebookPrimaryControl(screen.getByTestId('export-preview-confirm'));
    expect(screen.getByTestId('export-preview-safety-note')).toHaveClass(
      'notebook-note',
    );
    expect(screen.getByTestId('export-preview-safety-note').className).not.toContain(
      'bg-blue-50',
    );
  });

  it('confirms the initial xlsx format', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={results}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        results,
        expect.objectContaining({
          scopeKey: 'visible',
          count: 2,
          totalCount: 2,
          visibleCount: 2,
        }),
      );
    });
  });

  it('allows switching to CSV before confirming', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={results}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-format-csv'));
    expect(screen.queryByTestId('export-preview-workbook-layout')).not.toBeInTheDocument();
    expect(screen.getByTestId('export-preview-review-action-columns')).toHaveTextContent(
      'exportPreview.reviewActionColumnsTitle',
    );
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'csv',
        results,
        expect.objectContaining({
          scopeKey: 'visible',
          count: 2,
          totalCount: 2,
          visibleCount: 2,
        }),
      );
    });
  });

  it('exports only the selected scope', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={[results[0]]}
        allResults={results}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-scope-unresolved'));
    expect(screen.getByTestId('export-preview-summary-unresolved')).toHaveTextContent(
      'exportPreview.unresolvedCount',
    );
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [results[1]],
        expect.objectContaining({
          scopeKey: 'unresolved',
          count: 1,
          totalCount: 2,
          visibleCount: 1,
        }),
      );
    });
  });

  it('routes upstream failures to needs-review instead of unresolved export scope', async () => {
    const upstreamRow = {
      cas_number: '777-77-7',
      found: false,
      upstream_error: true,
      error: 'PubChem temporarily unavailable',
    };
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={[results[0], results[1], upstreamRow]}
        allResults={[results[0], results[1], upstreamRow]}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-scope-needs-review'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [upstreamRow],
        expect.objectContaining({
          scopeKey: 'needs-review',
          count: 1,
          totalCount: 3,
          visibleCount: 3,
        }),
      );
    });

    onConfirm.mockClear();
    fireEvent.click(screen.getByTestId('export-preview-scope-unresolved'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [results[1]],
        expect.objectContaining({
          scopeKey: 'unresolved',
          count: 1,
          totalCount: 3,
          visibleCount: 3,
        }),
      );
    });
  });

  it('keeps the ready export scope free of review and unresolved rows', async () => {
    const reviewRow = {
      ...results[0],
      cas_number: '67-64-1',
      name_en: 'Acetone',
      name_zh: '',
      has_multiple_classifications: true,
      other_classifications: [{ signal_word: 'Warning', pictograms: [] }],
    };
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={[results[0], reviewRow, results[1]]}
        allResults={[results[0], reviewRow, results[1]]}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-scope-ready'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [results[0]],
        expect.objectContaining({
          scopeKey: 'ready',
          count: 1,
          totalCount: 3,
          visibleCount: 3,
        }),
      );
    });
  });

  it('keeps real-roster export scopes separated before download', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ExportPreviewModal
        results={inventoryDataQualityFixtureResults.slice(0, 3)}
        allResults={inventoryDataQualityFixtureResults}
        initialFormat="xlsx"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-scope-ready'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [
          expect.objectContaining({
            cas_number: '67-64-1',
          }),
        ],
        expect.objectContaining({
          scopeKey: 'ready',
          count: 1,
          totalCount: 8,
          visibleCount: 3,
        }),
      );
    });

    onConfirm.mockClear();
    fireEvent.click(screen.getByTestId('export-preview-scope-needs-review'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        expect.arrayContaining([
          expect.objectContaining({ cas_number: '90-41-5' }),
          expect.objectContaining({ cas_number: '75-21-8' }),
        ]),
        expect.objectContaining({
          scopeKey: 'needs-review',
          count: 6,
          totalCount: 8,
          visibleCount: 3,
        }),
      );
    });

    onConfirm.mockClear();
    fireEvent.click(screen.getByTestId('export-preview-scope-unresolved'));
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'xlsx',
        [
          expect.objectContaining({
            cas_number: '9999-99-9',
          }),
        ],
        expect.objectContaining({
          scopeKey: 'unresolved',
          count: 1,
          totalCount: 8,
          visibleCount: 3,
        }),
      );
    });
  });

  it('closes from the cancel button', () => {
    const onClose = jest.fn();
    render(
      <ExportPreviewModal
        results={results}
        initialFormat="csv"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('export-preview-cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
