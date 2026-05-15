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
    expect(screen.getByTestId('product-trust-workflow-link-empty')).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=workflow-request.yml&labels=workflow-request'
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
    expect(workflowLink).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=workflow-request.yml&labels=workflow-request'
    );
    for (const link of [reportLink, workflowLink]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});
