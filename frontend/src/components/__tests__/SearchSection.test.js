import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchSection from '../SearchSection';

// Mock SearchAutocomplete to a simple input to isolate SearchSection logic
jest.mock('../SearchAutocomplete', () => {
  return function MockSearchAutocomplete({ value, onChange, onSearch }) {
    return (
      <input
        data-testid="single-cas-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
        }}
      />
    );
  };
});

const defaultProps = {
  activeTab: 'single',
  singleCas: '',
  batchCas: '',
  loading: false,
  error: null,
  batchCount: 0,
  searchInputRef: React.createRef(),
  onSetActiveTab: jest.fn(),
  onSetSingleCas: jest.fn(),
  onSetBatchCas: jest.fn(),
  onSearchSingle: jest.fn(),
  onSearchBatch: jest.fn(),
  history: [],
  favorites: [],
  batchProgress: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SearchSection', () => {
  describe('Tab switching', () => {
    it('renders both tab buttons with data-testid', () => {
      render(<SearchSection {...defaultProps} />);
      expect(screen.getByTestId('single-search-tab')).toBeInTheDocument();
      expect(screen.getByTestId('batch-search-tab')).toBeInTheDocument();
    });

    it('single tab has highlighted styling when activeTab=single', () => {
      render(<SearchSection {...defaultProps} activeTab="single" />);
      const singleTab = screen.getByTestId('single-search-tab');
      expect(singleTab.className).toContain('text-blue-700');
    });

    it('clicking batch tab calls onSetActiveTab("batch")', () => {
      render(<SearchSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId('batch-search-tab'));
      expect(defaultProps.onSetActiveTab).toHaveBeenCalledWith('batch');
    });

    it('clicking single tab calls onSetActiveTab("single")', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" />);
      fireEvent.click(screen.getByTestId('single-search-tab'));
      expect(defaultProps.onSetActiveTab).toHaveBeenCalledWith('single');
    });
  });

  describe('Single search tab', () => {
    it('renders search button with data-testid', () => {
      render(<SearchSection {...defaultProps} activeTab="single" />);
      expect(screen.getByTestId('single-search-btn')).toBeInTheDocument();
    });

    it('clicking search button calls onSearchSingle without forwarding the click event', () => {
      render(<SearchSection {...defaultProps} activeTab="single" />);
      fireEvent.click(screen.getByTestId('single-search-btn'));
      expect(defaultProps.onSearchSingle).toHaveBeenCalledWith();
    });

    it('shows loading text when loading=true', () => {
      render(<SearchSection {...defaultProps} activeTab="single" loading={true} />);
      expect(screen.getByText('search.searching')).toBeInTheDocument();
    });

    it('search button is disabled when loading=true', () => {
      render(<SearchSection {...defaultProps} activeTab="single" loading={true} />);
      expect(screen.getByTestId('single-search-btn')).toBeDisabled();
    });
  });

  describe('Batch search tab', () => {
    it('renders textarea with data-testid', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" />);
      expect(screen.getByTestId('batch-cas-input')).toBeInTheDocument();
    });

    it('shows batch count when batchCount > 0', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchCount={5} />);
      // i18n mock returns key as-is: "search.batchDetected"
      expect(screen.getByText('search.batchDetected')).toBeInTheDocument();
    });

    it('shows red warning text when batchCount > 100', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchCount={150} />);
      const warning = screen.getByText('search.batchOverLimit');
      expect(warning.className).toContain('text-red-600');
    });

    it('batch search button disabled when batchCount > 100', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchCount={150} />);
      expect(screen.getByTestId('batch-search-btn')).toBeDisabled();
    });

    it('batch search button disabled when loading=true', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" loading={true} batchCount={5} />);
      expect(screen.getByTestId('batch-search-btn')).toBeDisabled();
    });

    it('clicking clear button calls onSetBatchCas with empty string', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" />);
      fireEvent.click(screen.getByTestId('clear-batch-btn'));
      expect(defaultProps.onSetBatchCas).toHaveBeenCalledWith('');
    });

    it('shows detailed over-limit alert when batchCount exceeds the limit', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchCount={150} />);
      const alert = screen.getByTestId('batch-over-limit-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('role', 'alert');
      // i18n mock returns keys as-is
      expect(alert.textContent).toContain('search.batchOverLimitDetail');
    });

    it('does not show over-limit alert when batchCount is at the limit', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchCount={100} />);
      expect(screen.queryByTestId('batch-over-limit-alert')).not.toBeInTheDocument();
    });

    it('over-limit disables the submit button AND clicking it must not call onSearchBatch', () => {
      const onSearchBatch = jest.fn();
      render(
        <SearchSection
          {...defaultProps}
          activeTab="batch"
          batchCount={150}
          onSearchBatch={onSearchBatch}
        />
      );
      const btn = screen.getByTestId('batch-search-btn');
      expect(btn).toBeDisabled();
      // Even if someone forces a click through, the native disabled
      // attribute is the guard the browser enforces. Attempting a click
      // on a disabled button should not invoke the handler.
      fireEvent.click(btn);
      expect(onSearchBatch).not.toHaveBeenCalled();
    });
  });

  describe('Batch progress bar', () => {
    it('does not render progress bar when batchProgress is null', () => {
      render(<SearchSection {...defaultProps} activeTab="batch" batchProgress={null} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('renders progress bar when batchProgress is provided', () => {
      render(
        <SearchSection
          {...defaultProps}
          activeTab="batch"
          batchProgress={{ current: 3, total: 10 }}
        />
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('uses the real completion percentage for progress width', () => {
      render(
        <SearchSection
          {...defaultProps}
          activeTab="batch"
          batchProgress={{ current: 3, total: 10 }}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '30%' });
      expect(progressbar).toHaveAttribute('aria-valuetext', '30%');
    });

    it('shows done text when current equals total', () => {
      render(
        <SearchSection
          {...defaultProps}
          activeTab="batch"
          batchProgress={{ current: 10, total: 10 }}
        />
      );
      expect(screen.getByText(/search\.progressDone/)).toBeInTheDocument();
    });
  });

  describe('Error display', () => {
    it('does not render error when error is null', () => {
      render(<SearchSection {...defaultProps} error={null} />);
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('renders error message when error string is provided', () => {
      render(<SearchSection {...defaultProps} error="Something went wrong" />);
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
