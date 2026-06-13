import { fireEvent, render, screen } from '@testing-library/react';
import ProductTrustPanel from '../ProductTrustPanel';

describe('ProductTrustPanel', () => {
  it('renders the empty-state trust and feedback surface', () => {
    render(<ProductTrustPanel variant="empty" />);

    const panel = screen.getByTestId('product-trust-panel-empty');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('notebook-panel');
    expect(panel).not.toHaveClass('bg-white/80');
    expect(screen.getByTestId('product-trust-proof-list-empty')).toBeInTheDocument();
    expect(screen.getByText('productTrust.title')).toBeInTheDocument();
    expect(screen.getByText('productTrust.sourceTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.noAdsTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.feedbackTitle')).toBeInTheDocument();
    const reportLink = screen.getByTestId('product-trust-report-link-empty');
    const workflowLink = screen.getByTestId('product-trust-workflow-link-empty');
    expect(reportLink).toHaveClass('notebook-control', 'notebook-control-primary');
    expect(workflowLink).toHaveClass('notebook-control', 'notebook-control-secondary');
    expect(reportLink).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction'
    );
    const emptyWorkflowUrl = new URL(
      workflowLink.getAttribute('href')
    );
    expect(emptyWorkflowUrl.searchParams.get('template')).toBe('workflow-request.yml');
    expect(emptyWorkflowUrl.searchParams.get('labels')).toBe('workflow-request');
    expect(emptyWorkflowUrl.searchParams.get('workflow_area')).toBe('Search and results');
    expect(emptyWorkflowUrl.searchParams.get('current_problem')).toContain(
      'First-time search and label workflow'
    );
    expect(emptyWorkflowUrl.searchParams.get('current_problem')).toContain(
      'search-to-decision path'
    );
  });

  it('renders the empty trust surface in embedded workbench mode without its own page width', () => {
    render(<ProductTrustPanel variant="empty" embedded />);

    const panel = screen.getByTestId('product-trust-panel-empty');
    expect(panel).toHaveAttribute('data-layout', 'embedded');
    expect(panel).toHaveClass('notebook-trust-strip', 'rounded-md');
    expect(panel.className).not.toContain('mx-auto');
    expect(panel.className).not.toContain('max-w-5xl');
    expect(panel.className).not.toContain('mt-8');

    expect(screen.getByTestId('product-trust-proof-list-empty')).toHaveClass(
      'grid',
      'gap-3',
      'md:grid-cols-3'
    );
    expect(screen.getByTestId('product-trust-proof-card-empty-source')).toHaveClass(
      'notebook-trust-item',
    );
    expect(screen.getByTestId('product-trust-proof-card-empty-label')).toHaveClass(
      'notebook-trust-item',
    );
    expect(screen.getByTestId('product-trust-proof-card-empty-feedback')).toHaveClass(
      'notebook-trust-item',
    );
    expect(screen.getByTestId('product-trust-report-link-empty')).toHaveClass(
      'notebook-control',
      'notebook-control-primary'
    );
    expect(screen.getByTestId('product-trust-workflow-link-empty')).toHaveClass(
      'notebook-control',
      'notebook-control-secondary'
    );
  });

  it('renders the compact post-result surface with separated safe external support links', () => {
    render(<ProductTrustPanel variant="results" />);

    const panel = screen.getByTestId('product-trust-panel-results');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('data-layout', 'compact');
    expect(panel).toHaveClass('notebook-trust-strip', 'rounded-md');
    expect(panel).not.toHaveClass('notebook-panel', 'bg-white/80', 'rounded-lg');
    expect(panel.className).not.toContain('mx-auto');
    expect(panel.className).not.toContain('mt-4');
    expect(panel.className).not.toContain('max-w-5xl');
    expect(screen.getByTestId('product-trust-proof-list-results')).toBeInTheDocument();
    expect(screen.getByText('productTrust.resultsTitle')).toBeInTheDocument();

    const reportLink = screen.getByTestId('product-trust-report-link-results');
    const workflowLink = screen.getByTestId('product-trust-workflow-link-results');
    expect(reportLink).toHaveClass('notebook-control', 'notebook-control-primary');
    expect(workflowLink).toHaveClass('notebook-control', 'notebook-control-secondary');
    expect(reportLink).toHaveTextContent('productTrust.reportDataCta');
    expect(reportLink).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction'
    );
    expect(workflowLink).toHaveTextContent('productTrust.requestWorkflowCta');
    const resultsWorkflowUrl = new URL(workflowLink.getAttribute('href'));
    expect(resultsWorkflowUrl.searchParams.get('template')).toBe('workflow-request.yml');
    expect(resultsWorkflowUrl.searchParams.get('labels')).toBe('workflow-request');
    expect(resultsWorkflowUrl.searchParams.get('workflow_area')).toBe('Search and results');
    expect(resultsWorkflowUrl.searchParams.get('current_problem')).toContain(
      'Search results, SDS review, export, or label handoff'
    );
    expect(resultsWorkflowUrl.searchParams.get('desired_behavior')).toContain(
      'Keep the safety-data correction path separate'
    );
    for (const link of [reportLink, workflowLink]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('opens the in-app correction handler while preserving the fallback link', () => {
    const onOpenDataCorrection = jest.fn();
    render(
      <ProductTrustPanel
        variant="results"
        onOpenDataCorrection={onOpenDataCorrection}
      />,
    );

    const reportLink = screen.getByTestId('product-trust-report-link-results');
    expect(reportLink.getAttribute('href')).toContain('data-correction.yml');
    fireEvent.click(reportLink);
    expect(onOpenDataCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        issueType: 'other-data-quality',
        payload: expect.objectContaining({
          issue_type: 'other-data-quality',
          source: 'public-in-app',
        }),
      }),
    );
  });
});
