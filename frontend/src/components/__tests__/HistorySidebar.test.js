import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HistorySidebar from '../HistorySidebar';

// formatDate takes a timestamp and returns a locale string. Stub to
// return a deterministic value so tests don't depend on timezone.
jest.mock('@/utils/formatDate', () => ({
  formatDate: (ts) => `ts:${ts}`,
}));

const makeItem = (overrides = {}) => ({
  cas_number: '64-17-5',
  name_en: 'Ethanol',
  name_zh: '乙醇',
  timestamp: 1700000000000,
  ...overrides,
});

const defaultProps = {
  history: [],
  onClose: jest.fn(),
  onClearHistory: jest.fn(),
  onSelectHistoryItem: jest.fn(),
};

describe('HistorySidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with role=dialog and aria-modal=true', () => {
    render(<HistorySidebar {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('shows empty state when history is empty', () => {
    render(<HistorySidebar {...defaultProps} history={[]} />);
    expect(screen.getByText('history.empty')).toBeInTheDocument();
  });

  it('renders each history item with CAS, name, and formatted timestamp', () => {
    const items = [
      makeItem({ cas_number: '64-17-5', name_en: 'Ethanol' }),
      makeItem({ cas_number: '67-56-1', name_en: 'Methanol', timestamp: 1800000000000 }),
    ];
    render(<HistorySidebar {...defaultProps} history={items} />);
    expect(screen.getByText('64-17-5')).toBeInTheDocument();
    expect(screen.getByText('67-56-1')).toBeInTheDocument();
    expect(screen.getByText('Ethanol')).toBeInTheDocument();
    expect(screen.getByText('Methanol')).toBeInTheDocument();
    expect(screen.getByText('ts:1700000000000')).toBeInTheDocument();
    expect(screen.getByText('ts:1800000000000')).toBeInTheDocument();
  });

  it('clicking a history item calls onSelectHistoryItem with the CAS', () => {
    const onSelectHistoryItem = jest.fn();
    const items = [makeItem({ cas_number: '64-17-5' })];
    render(
      <HistorySidebar
        {...defaultProps}
        history={items}
        onSelectHistoryItem={onSelectHistoryItem}
      />
    );
    fireEvent.click(screen.getByTestId('history-item-0'));
    expect(onSelectHistoryItem).toHaveBeenCalledWith('64-17-5');
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = jest.fn();
    render(<HistorySidebar {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel does not call onClose', () => {
    const onClose = jest.fn();
    render(
      <HistorySidebar
        {...defaultProps}
        onClose={onClose}
        history={[makeItem()]}
      />
    );
    fireEvent.click(screen.getByText('Ethanol'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose (via focus trap hook)', () => {
    const onClose = jest.fn();
    render(<HistorySidebar {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves initial focus into the panel on open', () => {
    render(<HistorySidebar {...defaultProps} history={[makeItem()]} />);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.tagName).toBe('BUTTON');
  });

  it('shows the clear-all button only when history is non-empty', () => {
    const { rerender } = render(<HistorySidebar {...defaultProps} history={[]} />);
    expect(screen.queryByTestId('clear-history-btn')).not.toBeInTheDocument();

    rerender(<HistorySidebar {...defaultProps} history={[makeItem()]} />);
    expect(screen.getByTestId('clear-history-btn')).toBeInTheDocument();
  });

  it('clear-all button calls onClearHistory', () => {
    const onClearHistory = jest.fn();
    render(
      <HistorySidebar
        {...defaultProps}
        history={[makeItem()]}
        onClearHistory={onClearHistory}
      />
    );
    fireEvent.click(screen.getByTestId('clear-history-btn'));
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });
});
