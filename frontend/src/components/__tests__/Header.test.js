import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

const defaultProps = {
  favorites: [],
  history: [],
  showFavorites: false,
  showHistory: false,
  onToggleFavorites: jest.fn(),
  onToggleHistory: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    defaultProps.onToggleFavorites.mockClear();
    defaultProps.onToggleHistory.mockClear();
  });

  it('renders app title translation key', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('header.title')).toBeInTheDocument();
  });

  it('renders subtitle translation key', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('header.subtitle')).toBeInTheDocument();
  });

  it('shows favorites count badge when favorites exist', () => {
    render(<Header {...defaultProps} favorites={[{ cas_number: '64-17-5' }, { cas_number: '7732-18-5' }]} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('hides favorites count badge when favorites empty', () => {
    render(<Header {...defaultProps} />);
    const favBtn = screen.getByTestId('favorites-toggle-btn');
    // No badge should exist inside the favorites button
    const badge = favBtn.querySelector('.bg-red-500');
    expect(badge).toBeNull();
  });

  it('shows history count badge when history exists', () => {
    render(<Header {...defaultProps} history={[{ cas_number: '64-17-5' }]} />);
    const histBtn = screen.getByTestId('history-toggle-btn');
    const badge = histBtn.querySelector('.bg-amber-500');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('1');
  });

  it('clicking favorites button calls onToggleFavorites', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('favorites-toggle-btn'));
    expect(defaultProps.onToggleFavorites).toHaveBeenCalledTimes(1);
  });

  it('clicking history button calls onToggleHistory', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('history-toggle-btn'));
    expect(defaultProps.onToggleHistory).toHaveBeenCalledTimes(1);
  });
});
