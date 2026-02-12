import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DetailModal from '../DetailModal';
import {
  mockFoundResult,
  mockNoHazardResult,
  createMockGetEffective,
} from '../../__fixtures__/testData';

// Mock GHSImage
jest.mock('../GHSImage', () => {
  return function MockGHSImage(props) {
    return <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>;
  };
});

// Mock ClassificationComparisonTable
jest.mock('../ClassificationComparisonTable', () => {
  return function MockComparisonTable(props) {
    return (
      <div data-testid="comparison-table" data-mode={props.mode}>
        {props.columns.map((col, i) => (
          <div key={i} data-testid={`comparison-col-${i}`}>
            {col.label}
            {col.classification?.signal_word_zh && (
              <span data-testid={`comparison-signal-${i}`}>{col.classification.signal_word_zh}</span>
            )}
            {(col.classification?.pictograms || []).map((p) => (
              <span key={p.code} data-testid={`ghs-img-${p.code}`}>{p.code}</span>
            ))}
          </div>
        ))}
        {props.selectedIndex != null && (
          <span data-testid="comparison-selected">{props.selectedIndex}</span>
        )}
      </div>
    );
  };
});

// Mock sdsLinks
jest.mock('@/utils/sdsLinks', () => ({
  getPubChemSDSUrl: jest.fn((cid) => (cid ? `https://pubchem.example.com/${cid}` : null)),
  getECHASearchUrl: jest.fn((cas) => (cas ? `https://echa.example.com/${cas}` : null)),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const defaultProps = {
  result: mockFoundResult,
  onClose: jest.fn(),
  onToggleFavorite: jest.fn(),
  isFavorited: jest.fn(() => false),
  getEffectiveClassification: createMockGetEffective(),
  customGHSSettings: {},
  onSetCustomClassification: jest.fn(),
  hasCustomClassification: jest.fn(() => false),
  onClearCustomClassification: jest.fn(),
  onPrintLabel: jest.fn(),
};

// Re-import mocked modules to restore implementations after clearAllMocks
const sdsLinks = require('@/utils/sdsLinks');
const { toast } = require('sonner');

beforeEach(() => {
  jest.clearAllMocks();
  // Reset function props after clearAllMocks
  defaultProps.isFavorited = jest.fn(() => false);
  defaultProps.getEffectiveClassification = createMockGetEffective();
  defaultProps.hasCustomClassification = jest.fn(() => false);
  // Restore sdsLinks mock implementations
  sdsLinks.getPubChemSDSUrl.mockImplementation((cid) => (cid ? `https://pubchem.example.com/${cid}` : null));
  sdsLinks.getECHASearchUrl.mockImplementation((cas) => (cas ? `https://echa.example.com/${cas}` : null));

  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  });
});

describe('DetailModal', () => {
  describe('Rendering', () => {
    it('renders dialog with role="dialog" and aria-modal', () => {
      render(<DetailModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('renders English name as title', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText('Ethanol')).toBeInTheDocument();
    });

    it('renders Chinese name when present', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText('乙醇')).toBeInTheDocument();
    });

    it('renders CAS number', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText(/64-17-5/)).toBeInTheDocument();
    });

    it('renders signal word with Danger styling', () => {
      // Use single-classification result so standalone signal word section shows
      const singleClassResult = {
        ...mockFoundResult,
        has_multiple_classifications: false,
        other_classifications: [],
      };
      render(
        <DetailModal {...defaultProps} result={singleClassResult} />
      );
      const dangerElements = screen.getAllByText('危險');
      expect(dangerElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders GHS pictograms via mocked GHSImage', () => {
      // Use single-classification result so simple pictogram display shows
      const singleClassResult = {
        ...mockFoundResult,
        has_multiple_classifications: false,
        other_classifications: [],
      };
      render(
        <DetailModal {...defaultProps} result={singleClassResult} />
      );
      // Default classification has GHS02 and GHS07
      expect(screen.getAllByTestId(/ghs-img-GHS/).length).toBeGreaterThanOrEqual(2);
    });

    it('renders hazard statements with code and Chinese text', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText('H225')).toBeInTheDocument();
      expect(screen.getByText('高度易燃液體和蒸氣')).toBeInTheDocument();
    });

    it('renders PubChem SDS link when cid is present', () => {
      render(<DetailModal {...defaultProps} />);
      // Link text is split by SVG icon, so search for the link by href
      const links = screen.getAllByRole('link');
      const pubchemSDS = links.find((l) => l.href.includes('pubchem.example.com'));
      expect(pubchemSDS).toBeTruthy();
    });

    it('renders ECHA search link when cas_number is present', () => {
      render(<DetailModal {...defaultProps} />);
      const links = screen.getAllByRole('link');
      const echaLink = links.find((l) => l.href.includes('echa.example.com'));
      expect(echaLink).toBeTruthy();
    });

    it('renders print label button', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText('detail.printLabel')).toBeInTheDocument();
    });

    it('renders PubChem compound link when cid exists', () => {
      render(<DetailModal {...defaultProps} />);
      expect(screen.getByText('detail.viewPubChem')).toBeInTheDocument();
    });
  });

  describe('Closing behavior', () => {
    it('clicking overlay calls onClose', () => {
      const onClose = jest.fn();
      render(<DetailModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).toHaveBeenCalled();
    });

    it('clicking inner dialog content does NOT call onClose', () => {
      const onClose = jest.fn();
      render(<DetailModal {...defaultProps} onClose={onClose} />);
      // Click the inner content (title area) which has stopPropagation
      const title = screen.getByText('Ethanol');
      fireEvent.click(title);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('pressing Escape key calls onClose', () => {
      const onClose = jest.fn();
      render(<DetailModal {...defaultProps} onClose={onClose} />);
      // DetailModal listens on window for keydown
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('clicking close button (X) calls onClose', () => {
      const onClose = jest.fn();
      render(<DetailModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('close-modal-btn'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('User interactions', () => {
    it('clicking copy CAS button calls clipboard.writeText', async () => {
      render(<DetailModal {...defaultProps} />);
      // Find the copy button by its title attribute
      const copyBtn = screen.getByTitle(/detail\.copyCAS/);
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('64-17-5');
    });

    it('successful copy shows toast.success', async () => {
      render(<DetailModal {...defaultProps} />);
      const copyBtn = screen.getByTitle(/detail\.copyCAS/);
      fireEvent.click(copyBtn);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('clicking favorite button calls onToggleFavorite with result', () => {
      const onToggleFavorite = jest.fn();
      render(<DetailModal {...defaultProps} onToggleFavorite={onToggleFavorite} />);
      // Find star button by its title
      const favBtn = screen.getByTitle('favorites.addFavorite');
      fireEvent.click(favBtn);
      expect(onToggleFavorite).toHaveBeenCalledWith(mockFoundResult);
    });

    it('clicking print label button calls onPrintLabel with result', () => {
      const onPrintLabel = jest.fn();
      render(<DetailModal {...defaultProps} onPrintLabel={onPrintLabel} />);
      fireEvent.click(screen.getByText('detail.printLabel'));
      expect(onPrintLabel).toHaveBeenCalledWith(mockFoundResult);
    });
  });

  describe('Multiple classifications', () => {
    it('shows custom settings section when has_multiple_classifications is true', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      expect(screen.getByText('detail.customSettings')).toBeInTheDocument();
    });

    it('does not show custom settings section when has_multiple_classifications is false', () => {
      const singleClassResult = {
        ...mockFoundResult,
        has_multiple_classifications: false,
        other_classifications: [],
      };
      render(<DetailModal {...defaultProps} result={singleClassResult} />);
      expect(screen.queryByText('detail.customSettings')).not.toBeInTheDocument();
    });

    it('shows classification count when multiple classifications exist', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // "detail.classificationCount" should be shown
      expect(screen.getByText(/detail\.classificationCount/)).toBeInTheDocument();
    });

    it('shows restore default button when hasCustomClassification returns true', () => {
      render(
        <DetailModal
          {...defaultProps}
          hasCustomClassification={jest.fn(() => true)}
        />
      );
      expect(screen.getByText('detail.restoreDefault')).toBeInTheDocument();
    });

    it('clicking restore default calls onClearCustomClassification', () => {
      const onClear = jest.fn();
      render(
        <DetailModal
          {...defaultProps}
          hasCustomClassification={jest.fn(() => true)}
          onClearCustomClassification={onClear}
        />
      );
      fireEvent.click(screen.getByText('detail.restoreDefault'));
      expect(onClear).toHaveBeenCalledWith('64-17-5');
    });

    it('renders ClassificationComparisonTable in same-chemical mode when multiple classifications', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      const table = screen.getByTestId('comparison-table');
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute('data-mode', 'same-chemical');
    });

    it('does not render comparison table for single classification', () => {
      const singleClassResult = {
        ...mockFoundResult,
        has_multiple_classifications: false,
        other_classifications: [],
      };
      render(<DetailModal {...defaultProps} result={singleClassResult} />);
      expect(screen.queryByTestId('comparison-table')).not.toBeInTheDocument();
    });

    it('hides standalone signal word when multiple classifications exist', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // The standalone signal word section uses detail.signalWord as label
      expect(screen.queryByText('detail.signalWord')).not.toBeInTheDocument();
    });

    it('uses wider modal (max-w-3xl) for multiple classifications', () => {
      const { container } = render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // The inner content div should have max-w-3xl
      const innerDiv = container.querySelector('.max-w-3xl');
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles result with no ghs_pictograms (empty array)', () => {
      render(
        <DetailModal
          {...defaultProps}
          result={mockNoHazardResult}
          getEffectiveClassification={createMockGetEffective()}
        />
      );
      expect(screen.getByText('Water')).toBeInTheDocument();
    });
  });
});
