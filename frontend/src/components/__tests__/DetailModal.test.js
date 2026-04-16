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

  describe('Precautionary Statements', () => {
    it('renders P-codes section with code and Chinese text', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // The section header (i18n mock returns key as-is)
      expect(screen.getByText('detail.precautionaryStatements')).toBeInTheDocument();
      // P-code values from the fixture
      expect(screen.getByText('P210')).toBeInTheDocument();
      expect(screen.getByText('P301+P310')).toBeInTheDocument();
    });

    it('does not render P-codes section when precautionary_statements is empty', () => {
      render(<DetailModal {...defaultProps} result={mockNoHazardResult} />);
      expect(screen.queryByText('detail.precautionaryStatements')).not.toBeInTheDocument();
    });

    it('renders combined P-codes intact (not split)', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // P301+P310 should appear as one code, not as P301 and P310 separately
      expect(screen.getByText('P301+P310')).toBeInTheDocument();
    });
  });

  describe('Data Provenance (v1.8 M1)', () => {
    it('renders the provenance section header when source or retrieved_at present', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      // i18n mock returns keys verbatim
      expect(screen.getByText('detail.provenance')).toBeInTheDocument();
    });

    it('shows the primary source string from the backend', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      expect(screen.getByText('ECHA C&L Notifications Summary')).toBeInTheDocument();
    });

    it('renders the report count badge with count interpolated', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      const badge = screen.getByTestId('provenance-report-count');
      // i18n mock returns the key, so count does not interpolate — just verify
      // the badge element rendered and carries a tooltip with the count.
      expect(badge).toBeInTheDocument();
      expect(badge.getAttribute('title')).toContain('detail.provenanceReportCountTooltip');
    });

    it('renders the retrieved-at relative time with an absolute tooltip', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      const retrieved = screen.getByTestId('provenance-retrieved-at');
      // Tooltip falls back to the raw ISO-8601 timestamp so the full
      // value is always accessible for users who need precision.
      expect(retrieved.getAttribute('title')).toBe('2026-04-16T11:55:00Z');
    });

    it('does NOT render the cache badge when cache_hit is false', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      expect(screen.queryByTestId('provenance-cache-badge')).not.toBeInTheDocument();
    });

    it('renders the cache badge when cache_hit is true', () => {
      const cachedResult = { ...mockFoundResult, cache_hit: true };
      render(<DetailModal {...defaultProps} result={cachedResult} />);
      expect(screen.getByTestId('provenance-cache-badge')).toBeInTheDocument();
    });

    it('omits the entire provenance section when backend did not supply it', () => {
      const noProvenance = {
        ...mockFoundResult,
        primary_source: null,
        primary_report_count: null,
        retrieved_at: null,
        cache_hit: false,
      };
      render(<DetailModal {...defaultProps} result={noProvenance} />);
      expect(screen.queryByText('detail.provenance')).not.toBeInTheDocument();
    });

    it('renders provenance even when only retrieved_at is present (no source)', () => {
      const onlyTimestamp = {
        ...mockFoundResult,
        primary_source: null,
        primary_report_count: null,
        retrieved_at: '2026-04-16T11:55:00Z',
      };
      render(<DetailModal {...defaultProps} result={onlyTimestamp} />);
      expect(screen.getByText('detail.provenance')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-retrieved-at')).toBeInTheDocument();
    });
  });

  describe('Authoritative-source disclaimer (v1.8 M1 PR-C)', () => {
    it('renders the disclaimer when result.found is true', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      expect(
        screen.getByTestId('authoritative-source-note-detail')
      ).toBeInTheDocument();
    });

    it('does NOT render the disclaimer for not-found results', () => {
      const notFound = { cas_number: '999-99-9', found: false, error: 'unknown' };
      render(<DetailModal {...defaultProps} result={notFound} />);
      expect(
        screen.queryByTestId('authoritative-source-note-detail')
      ).not.toBeInTheDocument();
    });
  });

  describe('No GHS data banner + cache tooltip (v1.8 M2 PR-A)', () => {
    it('renders the no-GHS banner when effective classification is empty', () => {
      // Override getEffectiveClassification to return empty everything
      const overrideEffective = jest.fn(() => ({
        pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
        signal_word: null,
        isCustom: false,
        customIndex: 0,
      }));
      render(
        <DetailModal
          {...defaultProps}
          result={{ ...mockFoundResult, ghs_pictograms: [], hazard_statements: [], precautionary_statements: [], signal_word: null, other_classifications: [] }}
          getEffectiveClassification={overrideEffective}
        />
      );
      expect(screen.getByTestId('detail-no-ghs-data-banner')).toBeInTheDocument();
    });

    it('does NOT render the no-GHS banner when any GHS signal is present', () => {
      render(<DetailModal {...defaultProps} result={mockFoundResult} />);
      expect(
        screen.queryByTestId('detail-no-ghs-data-banner')
      ).not.toBeInTheDocument();
    });

    it('cache badge uses the with-age key when retrieved_at is present', () => {
      const cached = {
        ...mockFoundResult,
        cache_hit: true,
        retrieved_at: '2026-04-16T11:55:00Z',
      };
      render(<DetailModal {...defaultProps} result={cached} />);
      const badge = screen.getByTestId('provenance-cache-badge');
      // i18n mock returns keys verbatim — assert the key the component chose.
      expect(badge.getAttribute('title')).toBe(
        'detail.provenanceCacheTooltipWithAge'
      );
    });

    // NOTE: the static-fallback ("retrieved_at absent") branch is not
    // reachable from DetailModal because the cache badge lives INSIDE
    // the `{result.retrieved_at && (...)}` wrapper — no timestamp means
    // the whole retrieval row is hidden. That's a correct UI rule (don't
    // show "Retrieved: …" without a time). The static fallback code path
    // still runs in production for defensive programming but cannot
    // realistically fire here.
    //
    // The static-fallback key selection IS covered in ResultsTable.test.js
    // where cache chip visibility is NOT nested under retrieved_at.
  });

  // ── Debt cleanup: `suppressed` prop (stacked-modal a11y) ─────
  //
  // When PrepareSolutionModal stacks on top of DetailModal the app
  // passes `suppressed={true}`. This should:
  //   1. drop `aria-modal` so screen readers announce only the
  //      topmost modal as the active dialog
  //   2. set `aria-hidden="true"` as a fallback for older AT
  //   3. set the `inert` attribute so modern browsers block focus +
  //      pointer interaction inside this layer
  //   4. suppress the Escape handler so pressing Esc inside the
  //      stacked modal doesn't *also* fire this modal's onClose
  //   5. suppress the backdrop-click close handler for the same reason
  describe("suppressed prop (stacked-modal a11y)", () => {
    it("is NOT suppressed by default — aria-modal=true, no inert, no aria-hidden", () => {
      render(<DetailModal {...defaultProps} />);
      const backdrop = screen.getByTestId("detail-modal");
      expect(backdrop).toHaveAttribute("aria-modal", "true");
      expect(backdrop).not.toHaveAttribute("aria-hidden");
      expect(backdrop).not.toHaveAttribute("inert");
    });

    it("when suppressed, drops aria-modal, sets aria-hidden + inert", () => {
      render(<DetailModal {...defaultProps} suppressed />);
      const backdrop = screen.getByTestId("detail-modal");
      expect(backdrop).not.toHaveAttribute("aria-modal");
      expect(backdrop).toHaveAttribute("aria-hidden", "true");
      expect(backdrop).toHaveAttribute("inert");
    });

    it("when suppressed, backdrop click does NOT fire onClose", () => {
      const onClose = jest.fn();
      render(
        <DetailModal {...defaultProps} onClose={onClose} suppressed />
      );
      fireEvent.click(screen.getByTestId("detail-modal"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("when suppressed, Escape does NOT fire onClose (listener gated)", () => {
      const onClose = jest.fn();
      render(
        <DetailModal {...defaultProps} onClose={onClose} suppressed />
      );
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("when not suppressed, Escape still fires onClose (no regression on Tier 1 behaviour)", () => {
      const onClose = jest.fn();
      render(<DetailModal {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
