import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoritesSidebar from '../FavoritesSidebar';

// GHSImage makes real <img> requests — stub it out.
jest.mock('@/components/GHSImage', () => () => null);

const makeFav = (overrides = {}) => ({
  cas_number: '64-17-5',
  name_en: 'Ethanol',
  name_zh: '乙醇',
  ghs_pictograms: [
    { code: 'GHS02', name_zh: '易燃' },
  ],
  ...overrides,
});

const defaultProps = {
  favorites: [],
  onClose: jest.fn(),
  onClearFavorites: jest.fn(),
  onToggleFavorite: jest.fn(),
  onViewDetail: jest.fn(),
  onPrintLabel: jest.fn(),
};

describe('FavoritesSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with role=dialog and aria-modal=true', () => {
    render(<FavoritesSidebar {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('shows empty state when favorites list is empty', () => {
    render(<FavoritesSidebar {...defaultProps} favorites={[]} />);
    // i18n mock returns keys verbatim
    expect(screen.getByText('favorites.empty')).toBeInTheDocument();
    expect(screen.getByText('favorites.emptyHint')).toBeInTheDocument();
  });

  it('renders each favorite with its CAS number and English name', () => {
    const favs = [
      makeFav({ cas_number: '64-17-5', name_en: 'Ethanol' }),
      makeFav({ cas_number: '67-56-1', name_en: 'Methanol' }),
    ];
    render(<FavoritesSidebar {...defaultProps} favorites={favs} />);
    expect(screen.getByText('64-17-5')).toBeInTheDocument();
    expect(screen.getByText('67-56-1')).toBeInTheDocument();
    expect(screen.getByText('Ethanol')).toBeInTheDocument();
    expect(screen.getByText('Methanol')).toBeInTheDocument();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = jest.fn();
    render(<FavoritesSidebar {...defaultProps} onClose={onClose} />);
    // The outer div is the backdrop (role="dialog")
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel does not call onClose', () => {
    const onClose = jest.fn();
    render(<FavoritesSidebar {...defaultProps} onClose={onClose} favorites={[makeFav()]} />);
    // Click an element inside the panel — the panel's stopPropagation
    // should prevent the backdrop handler from firing.
    fireEvent.click(screen.getByText('Ethanol'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose (via focus trap hook)', () => {
    const onClose = jest.fn();
    render(<FavoritesSidebar {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves initial focus into the panel on open', () => {
    render(<FavoritesSidebar {...defaultProps} favorites={[makeFav()]} />);
    // Focus should be on one of the buttons inside the panel, NOT on
    // document.body.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.tagName).toBe('BUTTON');
  });

  it('shows the clear-all button only when favorites is non-empty', () => {
    const { rerender } = render(<FavoritesSidebar {...defaultProps} favorites={[]} />);
    expect(screen.queryByTestId('clear-favorites-btn')).not.toBeInTheDocument();

    rerender(<FavoritesSidebar {...defaultProps} favorites={[makeFav()]} />);
    expect(screen.getByTestId('clear-favorites-btn')).toBeInTheDocument();
  });

  it('clear-all button calls onClearFavorites', () => {
    const onClearFavorites = jest.fn();
    render(
      <FavoritesSidebar
        {...defaultProps}
        favorites={[makeFav()]}
        onClearFavorites={onClearFavorites}
      />
    );
    fireEvent.click(screen.getByTestId('clear-favorites-btn'));
    expect(onClearFavorites).toHaveBeenCalledTimes(1);
  });

  it('detail button invokes onViewDetail with the item', () => {
    const onViewDetail = jest.fn();
    const fav = makeFav();
    render(
      <FavoritesSidebar {...defaultProps} favorites={[fav]} onViewDetail={onViewDetail} />
    );
    fireEvent.click(screen.getByText('favorites.detail'));
    expect(onViewDetail).toHaveBeenCalledWith(fav);
  });

  it('print button invokes onPrintLabel with the item', () => {
    const onPrintLabel = jest.fn();
    const fav = makeFav();
    render(
      <FavoritesSidebar {...defaultProps} favorites={[fav]} onPrintLabel={onPrintLabel} />
    );
    fireEvent.click(screen.getByText('favorites.printLabel'));
    expect(onPrintLabel).toHaveBeenCalledWith(fav);
  });

  it('star toggle button invokes onToggleFavorite with the item', () => {
    const onToggleFavorite = jest.fn();
    const fav = makeFav();
    render(
      <FavoritesSidebar {...defaultProps} favorites={[fav]} onToggleFavorite={onToggleFavorite} />
    );
    // The star (remove from favorites) button has title from i18n
    fireEvent.click(screen.getByTitle('favorites.removeFavorite'));
    expect(onToggleFavorite).toHaveBeenCalledWith(fav);
  });
});
