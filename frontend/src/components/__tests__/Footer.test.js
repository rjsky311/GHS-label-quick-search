import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

describe('Footer', () => {
  it('renders version string', () => {
    render(<Footer />);
    expect(screen.getByText(/v1\.6\.0/)).toBeInTheDocument();
  });

  it('renders PubChem link with correct href', () => {
    render(<Footer />);
    const link = screen.getByText('PubChem (NIH)');
    expect(link).toHaveAttribute('href', 'https://pubchem.ncbi.nlm.nih.gov/');
  });

  it('renders GitHub issues link', () => {
    render(<Footer />);
    const link = screen.getByText('footer.reportIssue');
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/rjsky311/GHS-label-quick-search/issues'
    );
  });

  it('all external links open in new tab securely', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
