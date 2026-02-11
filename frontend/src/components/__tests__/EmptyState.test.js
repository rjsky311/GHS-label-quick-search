import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  const onQuickSearch = jest.fn();

  beforeEach(() => {
    onQuickSearch.mockClear();
  });

  it('renders title and subtitle translation keys', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('empty.title')).toBeInTheDocument();
    expect(screen.getByText('empty.subtitle')).toBeInTheDocument();
  });

  it('renders 3 quick example buttons with correct CAS numbers', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('64-17-5')).toBeInTheDocument();
    expect(screen.getByText('7732-18-5')).toBeInTheDocument();
    expect(screen.getByText('7647-01-0')).toBeInTheDocument();
  });

  it('clicking quick example button calls onQuickSearch with CAS', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    fireEvent.click(screen.getByText('64-17-5').closest('button'));
    expect(onQuickSearch).toHaveBeenCalledWith('64-17-5');
  });

  it('renders 4 feature cards', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('empty.featureBatch')).toBeInTheDocument();
    expect(screen.getByText('empty.featurePrint')).toBeInTheDocument();
    expect(screen.getByText('empty.featureExcel')).toBeInTheDocument();
    expect(screen.getByText('empty.featureFavorite')).toBeInTheDocument();
  });

  it('each feature card has a description', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('empty.featureBatchDesc')).toBeInTheDocument();
    expect(screen.getByText('empty.featurePrintDesc')).toBeInTheDocument();
    expect(screen.getByText('empty.featureExcelDesc')).toBeInTheDocument();
    expect(screen.getByText('empty.featureFavoriteDesc')).toBeInTheDocument();
  });
});
