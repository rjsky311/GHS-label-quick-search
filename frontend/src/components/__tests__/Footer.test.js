import { render, screen } from '@testing-library/react';
import Footer from '../Footer';
import { APP_VERSION } from '@/constants/version';

describe('Footer', () => {
  it('renders the current app version string from the shared constant', () => {
    render(<Footer />);
    // Match `vX.Y.Z` using the value from the constant so the
    // assertion stays in sync automatically on future bumps.
    expect(
      screen.getByText(new RegExp(`v${APP_VERSION.replace(/\./g, '\\.')}`))
    ).toBeInTheDocument();
  });

  it('APP_VERSION constant is 1.8.0 (single source of truth pin)', () => {
    // Hard-pinned in ONE place so a future bump produces exactly one
    // failing test with a clear reason.
    expect(APP_VERSION).toBe('1.8.0');
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
