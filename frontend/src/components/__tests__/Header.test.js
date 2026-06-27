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
  onGoHome: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    defaultProps.onToggleFavorites.mockClear();
    defaultProps.onToggleHistory.mockClear();
    defaultProps.onTogglePrepared.mockClear();
    defaultProps.onTogglePilotDashboard.mockClear();
    defaultProps.onGoHome.mockClear();
  });

  it('renders app title translation key', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('header.title')).toBeInTheDocument();
  });

  it('uses the notebook app chrome instead of a detached white header', () => {
    render(<Header {...defaultProps} />);

    const header = screen.getByTestId('app-header');
    expect(header).toHaveClass('notebook-header');
    expect(header.className).not.toContain('bg-white');
    expect(screen.getByText('header.title')).toHaveClass(
      'text-[hsl(var(--notebook-ink))]'
    );
    expect(screen.getByText('header.subtitle')).toHaveClass(
      'text-[hsl(var(--notebook-muted-ink))]'
    );
  });

  it('renders subtitle translation key', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('header.subtitle')).toBeInTheDocument();
  });

  it('uses the full brand lockup as a quiet home control', () => {
    render(<Header {...defaultProps} />);

    const homeControl = screen.getByTestId('header-home-link');
    expect(homeControl).toContainElement(screen.getByText('header.title'));
    expect(homeControl).toContainElement(screen.getByText('header.subtitle'));
    expect(homeControl).toHaveAttribute('aria-label', 'header.homeAria');
    expect(homeControl).toHaveAttribute('href', '/');
    expect(homeControl).toHaveClass('notebook-home-link');
    expect(homeControl).not.toHaveClass('notebook-control');

    fireEvent.click(homeControl);
    expect(defaultProps.onGoHome).toHaveBeenCalledTimes(1);
  });

  it('keeps header action buttons legible on mobile and stable across translations', () => {
    render(<Header {...defaultProps} />);

    [
      ['pilot-dashboard-toggle-btn', 'header.adminTools'],
      ['language-toggle-btn', 'header.langToggle'],
      ['favorites-toggle-btn', 'header.favorites'],
      ['prepared-toggle-btn', 'header.prepared'],
      ['history-toggle-btn', 'header.history'],
    ].forEach(([testId, labelText]) => {
      const button = screen.getByTestId(testId);
      const label = button.querySelector('span');
      expect(button).toHaveClass('notebook-control', 'notebook-control-utility');
      expect(button).toHaveClass('min-w-[4.25rem]', 'shrink-0', 'sm:min-w-28');
      expect(button.querySelector('svg')).toHaveClass('shrink-0');
      expect(button).toHaveTextContent(labelText);
      expect(label).not.toHaveClass('hidden');
    });

    expect(screen.getByTestId('language-toggle-btn')).toHaveAttribute(
      'aria-label',
      'header.switchToChinese'
    );
  });

  it('shows favorites count badge when favorites exist', () => {
    render(<Header {...defaultProps} favorites={[{ cas_number: '64-17-5' }, { cas_number: '7732-18-5' }]} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses notebook primary styling for the active admin button', () => {
    render(<Header {...defaultProps} showPilotDashboard={true} />);
    expect(screen.getByTestId('pilot-dashboard-toggle-btn')).toHaveClass(
      'notebook-control',
      'notebook-control-primary'
    );
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

  it('describes the prepared header button as recent/reprint access', () => {
    render(<Header {...defaultProps} />);

    const preparedBtn = screen.getByTestId('prepared-toggle-btn');
    expect(preparedBtn).toHaveTextContent('header.prepared');
    expect(preparedBtn).toHaveAttribute('aria-label', 'header.preparedTitle');
    expect(preparedBtn).toHaveAttribute('title', 'header.preparedTitle');
  });

  it('includes prepared count in the recent/reprint accessible label', () => {
    render(<Header {...defaultProps} preparedCount={3} />);

    const preparedBtn = screen.getByTestId('prepared-toggle-btn');
    expect(preparedBtn).toHaveAttribute(
      'aria-label',
      'header.preparedTitleWithCount'
    );
    expect(preparedBtn).toHaveAttribute(
      'title',
      'header.preparedTitleWithCount'
    );
  });

  it('clicking prepared button calls onTogglePrepared', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('prepared-toggle-btn'));
    expect(defaultProps.onTogglePrepared).toHaveBeenCalledTimes(1);
  });
});
