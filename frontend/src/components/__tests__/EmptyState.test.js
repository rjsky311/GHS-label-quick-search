import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  const onQuickSearch = jest.fn();

  beforeEach(() => {
    onQuickSearch.mockClear();
  });

  it('renders title and subtitle translation keys', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('empty.kicker')).toBeInTheDocument();
    expect(screen.getByText('empty.title')).toBeInTheDocument();
    expect(screen.getByText('empty.subtitle')).toBeInTheDocument();
  });

  it('renders the generated workflow visual asset', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByTestId('empty-visual-asset')).toBeInTheDocument();
    expect(screen.getByText('empty.visualBadge')).toBeInTheDocument();
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

  it('uses notebook controls for quick example buttons', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);

    const example = screen.getByText('64-17-5').closest('button');
    expect(example).toHaveClass('notebook-control', 'notebook-control-secondary');
    expect(example.className).not.toContain('bg-white');
  });

  it('renders the notebook workbench layout regions', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);

    const emptyState = screen.getByTestId('empty-state');
    const workbench = screen.getByTestId('empty-workbench');

    expect(emptyState).toContainElement(workbench);
    expect(workbench).toHaveClass(
      'notebook-surface',
      'empty-workbench',
    );
    expect(screen.getByTestId('empty-workbench-grid')).toHaveClass(
      'empty-workbench-grid',
      'grid',
      'lg:grid-cols-12',
    );
    expect(screen.getByTestId('empty-workbench-primary')).toHaveClass(
      'empty-workbench-primary',
      'lg:col-span-7',
      'min-w-0',
      'text-left',
    );
    expect(screen.getByTestId('empty-workbench-support')).toHaveClass(
      'empty-workbench-support',
      'lg:col-span-5',
      'min-w-0',
    );
    expect(screen.getByTestId('empty-workbench-tools')).toHaveClass(
      'empty-workbench-tools',
      'lg:col-span-12',
      'min-w-0',
    );
  });

  it('renders a provided trust panel inside the workbench trust slot', () => {
    render(
      <EmptyState
        onQuickSearch={onQuickSearch}
        trustPanel={<div data-testid="empty-trust-child">trust panel</div>}
      />,
    );

    const trustSlot = screen.getByTestId('empty-workbench-trust-slot');
    expect(trustSlot).toHaveClass(
      'empty-workbench-trust-slot',
      'lg:col-span-12',
      'min-w-0',
    );
    expect(trustSlot).toContainElement(screen.getByTestId('empty-trust-child'));
  });

  it('omits the trust slot when no trust panel is provided', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} trustPanel={null} />);

    expect(screen.queryByTestId('empty-workbench-trust-slot')).not.toBeInTheDocument();
  });

  it('renders 4 feature cards', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);
    expect(screen.getByText('empty.workflowSearch')).toBeInTheDocument();
    expect(screen.getByText('empty.workflowReview')).toBeInTheDocument();
    expect(screen.getByText('empty.workflowUse')).toBeInTheDocument();
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

  it('uses notebook ledger rows and status cards for workbench modules', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);

    expect(screen.getByTestId('empty-workbench-workflow')).toBeInTheDocument();
    expect(screen.getByTestId('empty-workflow-card-search')).toHaveClass('notebook-ledger-row');
    expect(screen.getByTestId('empty-workflow-card-review')).toHaveClass('notebook-ledger-row');
    expect(screen.getByTestId('empty-workflow-card-use')).toHaveClass('notebook-ledger-row');
    expect(screen.getByTestId('empty-feature-card-batch')).toHaveClass('notebook-status-card');
    expect(screen.getByTestId('empty-feature-card-print')).toHaveClass('notebook-status-card');
    expect(screen.getByTestId('empty-feature-card-excel')).toHaveClass('notebook-status-card');
    expect(screen.getByTestId('empty-feature-card-favorite')).toHaveClass(
      'notebook-status-card',
    );
  });

  it('uses a unified notebook tool tray instead of detached feature cards', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);

    expect(screen.getByTestId('empty-workbench-tools')).toHaveClass(
      'notebook-tool-tray',
    );
    expect(screen.getByTestId('empty-feature-card-batch')).toHaveClass(
      'notebook-tool-card',
    );
    expect(screen.getByTestId('empty-feature-card-print')).toHaveClass(
      'notebook-tool-card',
    );
    expect(screen.getByTestId('empty-feature-card-excel')).toHaveClass(
      'notebook-tool-card',
    );
    expect(screen.getByTestId('empty-feature-card-favorite')).toHaveClass(
      'notebook-tool-card',
    );
  });

  it('uses notebook theme token text colors inside the workbench', () => {
    render(<EmptyState onQuickSearch={onQuickSearch} />);

    const workbench = screen.getByTestId('empty-workbench');
    expect(workbench.querySelector('.text-blue-700')).not.toBeInTheDocument();
    expect(workbench.querySelector('.text-slate-950')).not.toBeInTheDocument();
    expect(workbench.querySelector('.text-slate-600')).not.toBeInTheDocument();
    expect(workbench.querySelector('.text-slate-500')).not.toBeInTheDocument();
    expect(screen.getByText('empty.kicker')).toHaveClass(
      'text-[hsl(var(--notebook-action))]',
    );
    expect(screen.getByText('empty.title')).toHaveClass(
      'text-[hsl(var(--notebook-ink))]',
    );
    expect(screen.getByText('empty.subtitle')).toHaveClass(
      'text-[hsl(var(--notebook-muted-ink))]',
    );
    expect(screen.getByText('64-17-5')).toHaveClass(
      'text-[hsl(var(--notebook-action))]',
    );
    expect(screen.getByText('empty.ethanol')).toHaveClass(
      'text-[hsl(var(--notebook-muted-ink))]',
    );
    expect(screen.getByText('empty.workflowSearch')).toHaveClass(
      'text-[hsl(var(--notebook-ink))]',
    );
    expect(screen.getByText('empty.workflowSearchDesc')).toHaveClass(
      'text-[hsl(var(--notebook-muted-ink))]',
    );
    expect(screen.getByText('empty.featureBatch')).toHaveClass(
      'text-[hsl(var(--notebook-ink))]',
    );
    expect(screen.getByText('empty.featureBatchDesc')).toHaveClass(
      'text-[hsl(var(--notebook-muted-ink))]',
    );
  });
});
