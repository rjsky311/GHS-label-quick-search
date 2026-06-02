import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import App from '@/App';
import { printLabels } from '@/utils/printLabels';
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

jest.mock('@/utils/printLabels', () => ({
  buildPrintPreviewDocument: jest.fn(() => ({
    html: '<html><body>preview</body></html>',
  })),
  printLabels: jest.fn(),
  resolveEffectiveChemicalForPrint: jest.fn((chemical) => chemical),
  getQRCodeUrl: jest.fn(() => 'http://qr.test'),
}));

jest.mock('@/utils/sdsLinks', () => ({
  getPubChemSDSUrl: jest.fn(() => 'http://sds.test'),
  getECHASearchUrl: jest.fn(() => 'http://echa.test'),
  getPreferredQrTargetInfo: jest.fn((cid, cas) =>
    cid
      ? {
          label: 'PubChem Safety & Hazards',
          url: 'http://sds.test',
          linkType: 'sds',
          source: 'pubchem',
          isFallback: true,
        }
      : cas
        ? {
            label: 'ECHA Substance Search',
            url: 'http://echa.test',
            linkType: 'regulatory',
            source: 'echa',
            isFallback: true,
          }
        : null,
  ),
  getReferenceLinks: jest.fn((result) => {
    const links = [];
    if (result?.cid) {
      links.push({
        label: 'PubChem Safety & Hazards',
        url: 'http://sds.test',
        linkType: 'sds',
      });
    }
    if (result?.cas_number) {
      links.push({
        label: 'ECHA Substance Search',
        url: 'http://echa.test',
        linkType: 'regulatory',
      });
    }
    return links;
  }),
}));

jest.mock('@/components/GHSImage', () => (props) => (
  <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>
));

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
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

describe('persona gate: lab graduate student batch print', () => {
  it('guides a mixed batch from review summary to one of the three label outputs', async () => {
    render(<App />);

    await runBatchSearch({
      casInputs: inventoryDataQualityFixtureResults.map(
        (result) => result.cas_number
      ),
      mockResponses: inventoryDataQualityFixtureResults,
    });

    expect(screen.getByTestId('results-workflow-summary')).toBeInTheDocument();
    expect(
      screen.getByTestId('results-workflow-summary-found-value')
    ).toHaveTextContent('6/8');
    expect(
      screen.getByTestId('results-workflow-summary-unresolved-value')
    ).toHaveTextContent('1');
    expect(
      screen.getByTestId('results-workflow-summary-label-ready-value')
    ).toHaveTextContent('1');
    expect(
      screen.getByTestId('results-workflow-summary-needs-review-value')
    ).toHaveTextContent('7');
    expect(
      screen.getByTestId('results-workflow-lane-ready-value')
    ).toHaveTextContent('1');
    expect(
      screen.getByTestId('results-workflow-lane-review-value')
    ).toHaveTextContent('4');
    expect(
      screen.getByTestId('results-workflow-lane-blocked-value')
    ).toHaveTextContent('3');
    expect(
      screen.getByTestId('results-workflow-action-plan-multiple-ghs')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('results-workflow-action-plan-missing-chinese-name')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('results-workflow-action-plan-blocked-output')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('results-workflow-action-plan-ready-output')
    ).toBeInTheDocument();

    [
      'multiple-classifications',
      'missing-chinese-name',
      'source-conflict',
      'ghs-text-no-pictograms',
      'no-ghs-data',
      'upstream-error',
      'unresolved-search',
    ].forEach((issueType) => {
      expect(
        screen.getByTestId(`results-workflow-review-action-${issueType}`)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('results-multiple-ghs-review-callout')
    ).toBeInTheDocument();

    const printAllWithGhs = await screen.findByTestId('print-all-with-ghs-btn');
    expect(printAllWithGhs).toHaveTextContent('5');

    await act(async () => {
      fireEvent.click(printAllWithGhs);
    });

    await waitFor(() =>
      expect(screen.getAllByText('label.title').length).toBeGreaterThan(0)
    );

    const dialog = screen.getByRole('dialog', { name: /label\.title/i });
    expect(screen.getByTestId('label-purpose-complete')).toBeInTheDocument();
    expect(screen.getByTestId('label-purpose-qrSupplement')).toBeInTheDocument();
    expect(screen.getByTestId('label-purpose-quickId')).toBeInTheDocument();

    const selectedCas = Array.from(
      dialog.querySelectorAll('[data-testid="selected-label-cas"]')
    ).map((node) => node.textContent);
    expect(selectedCas).toEqual([
      '67-64-1',
      '90-41-5',
      '84-65-1',
      '50-00-0',
      '100-00-5',
    ]);
    expect(selectedCas).not.toContain('57-13-6');
    expect(selectedCas).not.toContain('75-21-8');
    expect(selectedCas).not.toContain('9999-99-9');

    await act(async () => {
      fireEvent.click(screen.getByTestId('label-purpose-qrSupplement'));
    });

    const printButton = screen.getByTestId('print-label-action');
    expect(printButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(printButton);
    });

    expect(printLabels).toHaveBeenCalled();
    const [printedChemicals, printConfig] = printLabels.mock.calls.at(-1);
    expect(printedChemicals.map((chemical) => chemical.cas_number)).toEqual(
      selectedCas
    );
    expect(printConfig).toEqual(
      expect.objectContaining({
        labelPurpose: 'qrSupplement',
        template: 'qrcode',
        stockPreset: 'brother-62mm-continuous',
      })
    );
  });
});
