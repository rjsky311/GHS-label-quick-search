import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
      expect(screen.getByText('2')).toBeInTheDocument();
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

  describe('No hazard result', () => {
    it('renders "no hazard" text for found result with empty pictograms', () => {
      render(
        <ResultsTable
          {...defaultProps}
          results={[mockNoHazardResult]}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      expect(screen.getByText('results.noHazard')).toBeInTheDocument();
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
});
