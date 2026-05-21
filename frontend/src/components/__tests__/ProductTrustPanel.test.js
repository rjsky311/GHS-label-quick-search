import { render, screen } from '@testing-library/react';
import ProductTrustPanel from '../ProductTrustPanel';

describe('ProductTrustPanel', () => {
  it('renders the empty-state trust and feedback surface', () => {
    render(<ProductTrustPanel variant="empty" />);

    expect(screen.getByTestId('product-trust-panel-empty')).toBeInTheDocument();
    expect(screen.getByTestId('product-trust-proof-list-empty')).toBeInTheDocument();
    expect(screen.getByText('productTrust.title')).toBeInTheDocument();
    expect(screen.getByText('productTrust.sourceTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.noAdsTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.feedbackTitle')).toBeInTheDocument();
    expect(screen.getByTestId('product-trust-report-link-empty')).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction'
    );
    const emptyWorkflowUrl = new URL(
      screen.getByTestId('product-trust-workflow-link-empty').getAttribute('href')
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

  it('renders the compact post-result surface with separated safe external support links', () => {
    render(<ProductTrustPanel variant="results" />);

    expect(screen.getByTestId('product-trust-panel-results')).toBeInTheDocument();
    expect(screen.getByTestId('product-trust-panel-results')).toHaveClass('border-t');
    expect(screen.getByTestId('product-trust-panel-results')).not.toHaveClass('rounded-lg');
    expect(screen.getByTestId('product-trust-proof-list-results')).toBeInTheDocument();
    expect(screen.getByText('productTrust.resultsTitle')).toBeInTheDocument();

    const reportLink = screen.getByTestId('product-trust-report-link-results');
    const workflowLink = screen.getByTestId('product-trust-workflow-link-results');
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
});
