import { render, screen, fireEvent } from '@testing-library/react';
import GHSImage from '../GHSImage';

jest.mock('@/constants/ghs', () => ({
  GHS_IMAGES: {
    GHS02: 'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg',
    GHS07: 'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg',
  },
}));

describe('GHSImage', () => {
  it('renders img with correct src from GHS_IMAGES', () => {
    render(<GHSImage code="GHS02" name="Flammable" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'src',
      'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg'
    );
  });

  it('uses name as alt text when provided', () => {
    render(<GHSImage code="GHS02" name="Flammable" />);
    expect(screen.getByAltText('Flammable')).toBeInTheDocument();
  });

  it('uses code as alt text when no name provided', () => {
    render(<GHSImage code="GHS02" />);
    expect(screen.getByAltText('GHS02')).toBeInTheDocument();
  });

  it('shows error fallback when image fails to load', () => {
    render(<GHSImage code="GHS02" name="Flammable" />);
    fireEvent.error(screen.getByRole('img'));
    // After error, img is replaced by a span with the code
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('GHS02')).toBeInTheDocument();
  });

  it('renders tooltip when showTooltip is true', () => {
    render(<GHSImage code="GHS02" name="Flammable" showTooltip={true} />);
    // Tooltip div should contain "GHS02: Flammable"
    expect(screen.getByText(/GHS02.*Flammable|Flammable.*GHS02/)).toBeDefined();
  });
});
