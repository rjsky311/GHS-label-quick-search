import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ResultsTable from '../ResultsTable';
import {
  mockFoundResult,
  mockNotFoundResult,
  mockNoHazardResult,
  mockWarningResult,
  createMockGetEffective,
} from '../../__fixtures__/testData';

// Mock GHSImage to a simple span
jest.mock('../GHSImage', () => {
  return function MockGHSImage(props) {
    return <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>;
  };
});

// Mock sdsLinks with deterministic URLs
jest.mock('@/utils/sdsLinks', () => ({
  getPubChemSDSUrl: jest.fn((cid) => (cid ? `https://pubchem.example.com/${cid}` : null)),
}));

const defaultProps = {
  results: [mockFoundResult],
  totalCount: 1,
  resultFilter: 'all',
  onSetResultFilter: jest.fn(),
  advancedFilter: { minPictograms: 0, hCodeSearch: '' },
  onSetAdvancedFilter: jest.fn(),
  sortConfig: { key: null, direction: null },
  onRequestSort: jest.fn(),
  selectedForLabel: [],
  expandedOtherClassifications: {},
  onOpenLabelModal: jest.fn(),
  onExportToExcel: jest.fn(),
  onExportToCSV: jest.fn(),
  onSelectAllForLabel: jest.fn(),
  onClearLabelSelection: jest.fn(),
  onToggleSelectForLabel: jest.fn(),
  isSelectedForLabel: jest.fn(() => false),
  onToggleFavorite: jest.fn(),
  isFavorited: jest.fn(() => false),
  getEffectiveClassification: createMockGetEffective(),
  onToggleOtherClassifications: jest.fn(),
  onSetCustomClassification: jest.fn(),
  onClearCustomClassification: jest.fn(),
  onViewDetail: jest.fn(),
  onOpenComparison: jest.fn(),
};

// Re-import the mock module to restore its mock implementation after clearAllMocks
const sdsLinks = require('@/utils/sdsLinks');

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default mock implementations after clearAllMocks
  defaultProps.isSelectedForLabel = jest.fn(() => false);
  defaultProps.isFavorited = jest.fn(() => false);
  defaultProps.getEffectiveClassification = createMockGetEffective();
  // Restore sdsLinks mock implementation
  sdsLinks.getPubChemSDSUrl.mockImplementation((cid) => (cid ? `https://pubchem.example.com/${cid}` : null));
});

describe('ResultsTable', () => {
  describe('Header action buttons', () => {
    it('renders print label button with data-testid', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByTestId('print-label-btn')).toBeInTheDocument();
    });

    it('renders export Excel button', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByTestId('export-xlsx-btn')).toBeInTheDocument();
    });

    it('renders export CSV button', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument();
    });

    it('clicking print label button calls onOpenLabelModal', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByTestId('print-label-btn'));
      expect(defaultProps.onOpenLabelModal).toHaveBeenCalled();
    });

    it('clicking export Excel button calls onExportToExcel', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByTestId('export-xlsx-btn'));
      expect(defaultProps.onExportToExcel).toHaveBeenCalled();
    });

    it('clicking export CSV button calls onExportToCSV', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByTestId('export-csv-btn'));
      expect(defaultProps.onExportToCSV).toHaveBeenCalled();
    });

    it('print label button shows selection count badge when items selected', () => {
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={[mockFoundResult, mockWarningResult]}
        />
      );
      const printBtn = screen.getByTestId('print-label-btn');
      expect(within(printBtn).getByText('2')).toBeInTheDocument();
    });
  });

  describe('Selection controls', () => {
    it('renders select all / deselect all when found results exist', () => {
      render(<ResultsTable {...defaultProps} results={[mockFoundResult]} />);
      expect(screen.getByText('results.selectAll')).toBeInTheDocument();
      expect(screen.getByText('results.deselectAll')).toBeInTheDocument();
    });

    it('does not render selection controls when no found results', () => {
      render(<ResultsTable {...defaultProps} results={[mockNotFoundResult]} />);
      expect(screen.queryByText('results.selectAll')).not.toBeInTheDocument();
    });

    it('clicking select all calls onSelectAllForLabel', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByText('results.selectAll'));
      expect(defaultProps.onSelectAllForLabel).toHaveBeenCalled();
    });
  });

  describe('Filter toolbar', () => {
    const renderMultiResults = () => {
      return render(
        <ResultsTable
          {...defaultProps}
          results={[mockFoundResult, mockWarningResult]}
          totalCount={2}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
    };

    it('renders filter buttons when totalCount > 1', () => {
      renderMultiResults();
      expect(screen.getByText('filter.all')).toBeInTheDocument();
      expect(screen.getByText('filter.danger')).toBeInTheDocument();
      expect(screen.getByText('filter.warning')).toBeInTheDocument();
    });

    it('does not render filter toolbar when totalCount <= 1', () => {
      render(<ResultsTable {...defaultProps} totalCount={1} />);
      expect(screen.queryByText('filter.danger')).not.toBeInTheDocument();
    });

    it('clicking danger filter calls onSetResultFilter("danger")', () => {
      renderMultiResults();
      fireEvent.click(screen.getByText('filter.danger'));
      expect(defaultProps.onSetResultFilter).toHaveBeenCalledWith('danger');
    });

    it('renders H-code search input', () => {
      renderMultiResults();
      const hCodeInput = screen.getByPlaceholderText('filter.hCodePlaceholder');
      expect(hCodeInput).toBeInTheDocument();
    });
  });

  describe('Found result rows', () => {
    it('renders CAS number', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByText('64-17-5')).toBeInTheDocument();
    });

    it('renders English name', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByText('Ethanol')).toBeInTheDocument();
    });

    it('renders Chinese name when present', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByText('乙醇')).toBeInTheDocument();
    });

    it('renders GHS pictograms via mocked GHSImage', () => {
      render(<ResultsTable {...defaultProps} />);
      expect(screen.getByTestId('ghs-img-GHS02')).toBeInTheDocument();
      expect(screen.getByTestId('ghs-img-GHS07')).toBeInTheDocument();
    });

    it('renders detail button that calls onViewDetail', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByTestId('detail-btn-0'));
      expect(defaultProps.onViewDetail).toHaveBeenCalledWith(mockFoundResult);
    });

    it('renders SDS link when cid is present', () => {
      render(
        <ResultsTable
          {...defaultProps}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      expect(screen.getByTestId('sds-btn-0')).toBeInTheDocument();
    });

    it('checkbox calls onToggleSelectForLabel when clicked', () => {
      render(
        <ResultsTable
          {...defaultProps}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(defaultProps.onToggleSelectForLabel).toHaveBeenCalledWith(mockFoundResult);
    });

    it('favorite button calls onToggleFavorite when clicked', () => {
      render(<ResultsTable {...defaultProps} />);
      fireEvent.click(screen.getByTestId('favorite-btn-0'));
      expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockFoundResult);
    });
  });

  describe('Not-found result rows', () => {
    it('renders error text for not-found result', () => {
      render(<ResultsTable {...defaultProps} results={[mockNotFoundResult]} />);
      expect(screen.getByText('CAS number not found in PubChem')).toBeInTheDocument();
    });

    it('does not render checkbox for not-found result', () => {
      render(<ResultsTable {...defaultProps} results={[mockNotFoundResult]} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('does not render detail button for not-found result', () => {
      render(<ResultsTable {...defaultProps} results={[mockNotFoundResult]} />);
      expect(screen.queryByTestId('detail-btn-0')).not.toBeInTheDocument();
    });
  });

  describe('GHS data availability (v1.8 M2)', () => {
    // mockNoHazardResult has no pictograms, no H-codes, no P-codes, no signal word.
    // Per M2 contract, that is "PubChem has no GHS classification data for this
    // CAS" rather than "this chemical is safe" — so we show the new warning
    // instead of the misleading "No hazard label" string.
    it('renders "no GHS classification" warning when no GHS data at all', () => {
      render(
        <ResultsTable
          {...defaultProps}
          results={[mockNoHazardResult]}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      expect(screen.getByText('results.noGhsDataAvailable')).toBeInTheDocument();
      expect(screen.getByText('results.noGhsDataHint')).toBeInTheDocument();
      expect(
        screen.getByTestId(`no-ghs-data-${mockNoHazardResult.cas_number}`)
      ).toBeInTheDocument();
    });

    it('does NOT render the new warning when the classification has any signal (regression against over-eager warning)', () => {
      // Has H-codes and signal word but no pictogram — this is a real GHS record
      // that the pictogram visual can't render. The new warning must NOT fire;
      // the UI falls back to the existing `results.noHazard` text.
      const signalOnly = {
        ...mockNoHazardResult,
        cas_number: '100-00-1',
        hazard_statements: [{ code: 'H225', text_zh: 'x' }],
        signal_word: 'Danger',
        signal_word_zh: '危險',
      };
      render(
        <ResultsTable
          {...defaultProps}
          results={[signalOnly]}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      expect(screen.queryByText('results.noGhsDataAvailable')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`no-ghs-data-${signalOnly.cas_number}`)
      ).not.toBeInTheDocument();
      // Falls back to existing `results.noHazard` — must not be blank
      expect(screen.getByText('results.noHazard')).toBeInTheDocument();
    });

    it('shows results.noHazard (not the visual block) when H/P/signal exist but NOTHING has pictograms (Codex PR #10 regression)', () => {
      // Codex caught that hasRenderableGhsVisual was treating
      // `other_classifications.length > 0` as renderable even when
      // those alternate classifications had no pictograms.
      //
      // Scenario:
      //   - found = true
      //   - primary has no pictograms
      //   - other_classifications has entries, but none have pictograms
      //   - there ARE hazard_statements + signal_word
      //
      // Expected: no "no GHS data" warning (there IS GHS data), AND
      // no empty pictogram block, AND the existing `results.noHazard`
      // fallback text is shown.
      const noPicsAnywhere = {
        ...mockNoHazardResult,
        cas_number: '300-00-3',
        ghs_pictograms: [],
        hazard_statements: [{ code: 'H302', text_zh: 'x' }],
        signal_word: 'Warning',
        signal_word_zh: '警告',
        other_classifications: [
          {
            pictograms: [],
            hazard_statements: [{ code: 'H302', text_zh: 'x' }],
            signal_word: 'Warning',
          },
        ],
      };
      render(
        <ResultsTable
          {...defaultProps}
          results={[noPicsAnywhere]}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      // Not the "no GHS data" warning — there IS GHS data
      expect(screen.queryByText('results.noGhsDataAvailable')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`no-ghs-data-${noPicsAnywhere.cas_number}`)
      ).not.toBeInTheDocument();
      // And not the visual pictogram block either (nothing to draw)
      // We verify this indirectly: the `noHazard` fallback text is present.
      expect(screen.getByText('results.noHazard')).toBeInTheDocument();
    });

    it('custom override that selects an alternate classification with H-codes suppresses the warning', () => {
      // Raw result has no GHS data. But the custom override points at an
      // alternate classification that DOES have H-codes. The warning must
      // follow the effective classification, not the raw one.
      const emptyRaw = {
        ...mockNoHazardResult,
        cas_number: '200-00-2',
        other_classifications: [
          {
            pictograms: [],
            hazard_statements: [{ code: 'H302', text_zh: 'x' }],
            signal_word: 'Warning',
          },
        ],
      };
      // Override getEffectiveClassification to return the alternate shape
      const overrideEffective = jest.fn(() => ({
        pictograms: [],
        hazard_statements: [{ code: 'H302', text_zh: 'x' }],
        precautionary_statements: [],
        signal_word: 'Warning',
        isCustom: true,
        customIndex: 1,
      }));
      render(
        <ResultsTable
          {...defaultProps}
          results={[emptyRaw]}
          getEffectiveClassification={overrideEffective}
        />
      );
      expect(screen.queryByText('results.noGhsDataAvailable')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`no-ghs-data-${emptyRaw.cas_number}`)
      ).not.toBeInTheDocument();
    });

    it('custom override that selects an empty classification DOES show the warning (regression: effective really drives it)', () => {
      // Raw result has pictograms (so without custom override, normal
      // visual would render). Custom override points at an empty classification.
      // The warning must follow the override, proving the helper runs on
      // effective rather than raw.
      const overrideEffective = jest.fn(() => ({
        pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
        signal_word: null,
        isCustom: true,
        customIndex: 2,
      }));
      render(
        <ResultsTable
          {...defaultProps}
          results={[mockFoundResult]}
          getEffectiveClassification={overrideEffective}
        />
      );
      expect(screen.getByText('results.noGhsDataAvailable')).toBeInTheDocument();
      expect(
        screen.getByTestId(`no-ghs-data-${mockFoundResult.cas_number}`)
      ).toBeInTheDocument();
    });

    it('cache tooltip uses the with-age key when retrieved_at is present', () => {
      const cached = {
        ...mockFoundResult,
        cache_hit: true,
        retrieved_at: '2026-04-16T11:55:00Z',
      };
      render(<ResultsTable {...defaultProps} results={[cached]} />);
      // i18n mock returns keys verbatim — assert which key was selected.
      const cacheBadge = screen.getByText('results.cacheBadge').closest('span');
      expect(cacheBadge.getAttribute('title')).toBe(
        'detail.provenanceCacheTooltipWithAge'
      );
    });

    it('cache tooltip falls back to static key when retrieved_at is absent', () => {
      const cached = {
        ...mockFoundResult,
        cache_hit: true,
        retrieved_at: null,
      };
      render(<ResultsTable {...defaultProps} results={[cached]} />);
      const cacheBadge = screen.getByText('results.cacheBadge').closest('span');
      expect(cacheBadge.getAttribute('title')).toBe(
        'detail.provenanceCacheTooltip'
      );
    });
  });

  describe('Sort columns', () => {
    it('clicking CAS column header calls onRequestSort("cas_number")', () => {
      render(<ResultsTable {...defaultProps} />);
      const casHeader = screen.getByText('results.colCAS');
      fireEvent.click(casHeader.closest('th'));
      expect(defaultProps.onRequestSort).toHaveBeenCalledWith('cas_number');
    });

    it('clicking Name column header calls onRequestSort("name")', () => {
      render(<ResultsTable {...defaultProps} />);
      const nameHeader = screen.getByText('results.colName');
      fireEvent.click(nameHeader.closest('th'));
      expect(defaultProps.onRequestSort).toHaveBeenCalledWith('name');
    });

    it('clicking Signal Word header calls onRequestSort("signal_word")', () => {
      render(<ResultsTable {...defaultProps} />);
      const swHeader = screen.getByText('results.colSignalWord');
      fireEvent.click(swHeader.closest('th'));
      expect(defaultProps.onRequestSort).toHaveBeenCalledWith('signal_word');
    });
  });

  describe('Other classifications toggle', () => {
    it('shows toggle button when result has multiple classifications', () => {
      render(<ResultsTable {...defaultProps} results={[mockFoundResult]} />);
      expect(screen.getByText(/results\.otherClassifications/)).toBeInTheDocument();
    });

    it('does not show toggle when result has no other classifications', () => {
      render(<ResultsTable {...defaultProps} results={[mockWarningResult]} />);
      expect(screen.queryByText(/results\.otherClassifications/)).not.toBeInTheDocument();
    });
  });

  describe('Compare button', () => {
    it('renders compare button when 2+ found chemicals with pictograms are selected', () => {
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={[mockFoundResult, mockWarningResult]}
        />
      );
      expect(screen.getByTestId('compare-btn')).toBeInTheDocument();
    });

    it('does not render compare button when fewer than 2 comparable chemicals selected', () => {
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={[mockFoundResult]}
        />
      );
      expect(screen.queryByTestId('compare-btn')).not.toBeInTheDocument();
    });

    it('disables compare button when more than 5 comparable chemicals selected', () => {
      const manyChemicals = Array.from({ length: 6 }, (_, i) => ({
        ...mockFoundResult,
        cas_number: `64-17-${i}`,
      }));
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={manyChemicals}
        />
      );
      const btn = screen.getByTestId('compare-btn');
      expect(btn).toBeDisabled();
    });

    it('clicking compare button calls onOpenComparison', () => {
      const onOpenComparison = jest.fn();
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={[mockFoundResult, mockWarningResult]}
          onOpenComparison={onOpenComparison}
        />
      );
      fireEvent.click(screen.getByTestId('compare-btn'));
      expect(onOpenComparison).toHaveBeenCalled();
    });

    it('does not count chemicals without pictograms as comparable', () => {
      // mockNoHazardResult has empty pictograms — should not count
      render(
        <ResultsTable
          {...defaultProps}
          selectedForLabel={[mockFoundResult, mockNoHazardResult]}
        />
      );
      expect(screen.queryByTestId('compare-btn')).not.toBeInTheDocument();
    });
  });

  describe('Provenance chips (v1.8 M1)', () => {
    it('renders the ECHA source badge when primary_source contains "ECHA"', () => {
      render(<ResultsTable {...defaultProps} results={[mockFoundResult]} />);
      expect(
        screen.getByTestId(`source-badge-echa-${mockFoundResult.cas_number}`)
      ).toBeInTheDocument();
    });

    it('renders the report-count badge when primary_report_count is present', () => {
      render(<ResultsTable {...defaultProps} results={[mockFoundResult]} />);
      expect(screen.getByText('results.reportCountBadge')).toBeInTheDocument();
    });

    it('does NOT render the cache badge when cache_hit is false', () => {
      render(<ResultsTable {...defaultProps} results={[mockFoundResult]} />);
      expect(screen.queryByText('results.cacheBadge')).not.toBeInTheDocument();
    });

    it('renders the cache badge when cache_hit is true', () => {
      const cached = { ...mockFoundResult, cache_hit: true };
      render(<ResultsTable {...defaultProps} results={[cached]} />);
      expect(screen.getByText('results.cacheBadge')).toBeInTheDocument();
    });

    it('does NOT render the ECHA badge for non-ECHA sources', () => {
      const vendor = { ...mockFoundResult, primary_source: 'Some SDS vendor notification' };
      render(<ResultsTable {...defaultProps} results={[vendor]} />);
      expect(
        screen.queryByTestId(`source-badge-echa-${vendor.cas_number}`)
      ).not.toBeInTheDocument();
    });

    it('omits all provenance chips when backend did not supply them', () => {
      const bare = {
        ...mockFoundResult,
        primary_source: null,
        primary_report_count: null,
        cache_hit: false,
      };
      render(<ResultsTable {...defaultProps} results={[bare]} />);
      expect(
        screen.queryByTestId(`source-badge-echa-${bare.cas_number}`)
      ).not.toBeInTheDocument();
      expect(screen.queryByText('results.reportCountBadge')).not.toBeInTheDocument();
      expect(screen.queryByText('results.cacheBadge')).not.toBeInTheDocument();
    });
  });
});
