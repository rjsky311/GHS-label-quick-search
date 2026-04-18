import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

const defaultProps = {
  favorites: [],
  history: [],
  preparedCount: 0,
  pilotAttentionCount: 0,
  showPilotDashboardButton: true,
  pilotAdminUnlocked: true,
  showFavorites: false,
  showHistory: false,
  showPilotDashboard: false,
  onTogglePilotDashboard: jest.fn(),
  onToggleFavorites: jest.fn(),
  onToggleHistory: jest.fn(),
  onTogglePrepared: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    defaultProps.onToggleFavorites.mockClear();
    defaultProps.onToggleHistory.mockClear();
    defaultProps.onTogglePrepared.mockClear();
    defaultProps.onTogglePilotDashboard.mockClear();
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

  it('clicking admin button calls onTogglePilotDashboard when enabled', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('pilot-dashboard-toggle-btn'));
    expect(defaultProps.onTogglePilotDashboard).toHaveBeenCalledTimes(1);
  });

  it('hides admin button when admin tools are disabled', () => {
    render(<Header {...defaultProps} showPilotDashboardButton={false} />);
    expect(screen.queryByTestId('pilot-dashboard-toggle-btn')).not.toBeInTheDocument();
  });

  it('clicking history button calls onToggleHistory', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('history-toggle-btn'));
    expect(defaultProps.onToggleHistory).toHaveBeenCalledTimes(1);
  });

  it('shows prepared count badge when prepared recents exist', () => {
    render(<Header {...defaultProps} preparedCount={3} />);
    const preparedBtn = screen.getByTestId('prepared-toggle-btn');
    const badge = preparedBtn.querySelector('.bg-cyan-500');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('3');
  });

  it('clicking prepared button calls onTogglePrepared', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('prepared-toggle-btn'));
    expect(defaultProps.onTogglePrepared).toHaveBeenCalledTimes(1);
  });
});
