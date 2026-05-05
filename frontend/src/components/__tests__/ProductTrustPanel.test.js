import { render, screen } from '@testing-library/react';
import ProductTrustPanel from '../ProductTrustPanel';

describe('ProductTrustPanel', () => {
  it('renders the empty-state trust and feedback surface', () => {
    render(<ProductTrustPanel variant="empty" />);

    expect(screen.getByTestId('product-trust-panel-empty')).toBeInTheDocument();
    expect(screen.getByText('productTrust.title')).toBeInTheDocument();
    expect(screen.getByText('productTrust.sourceTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.noAdsTitle')).toBeInTheDocument();
    expect(screen.getByText('productTrust.feedbackTitle')).toBeInTheDocument();
  });

  it('renders the compact post-result surface with a safe external feedback link', () => {
    render(<ProductTrustPanel variant="results" />);

    expect(screen.getByTestId('product-trust-panel-results')).toBeInTheDocument();
    expect(screen.getByText('productTrust.resultsTitle')).toBeInTheDocument();

    const link = screen.getByText('productTrust.cta').closest('a');
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
