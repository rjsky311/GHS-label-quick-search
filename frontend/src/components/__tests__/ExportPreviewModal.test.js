import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportPreviewModal from '../ExportPreviewModal';

const results = [
  {
    cas_number: '64-17-5',
    name_en: 'Ethanol',
    name_zh: 'Ethanol ZH',
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
    expect(screen.getByText('64-17-5')).toBeInTheDocument();
    expect(screen.getByText('999-99-9')).toBeInTheDocument();
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
      expect(onConfirm).toHaveBeenCalledWith('xlsx');
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
    fireEvent.click(screen.getByTestId('export-preview-confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('csv');
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
