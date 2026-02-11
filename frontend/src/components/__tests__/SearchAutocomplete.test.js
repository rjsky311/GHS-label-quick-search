import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchAutocomplete from '../SearchAutocomplete';

// requestAnimationFrame mock — execute callback synchronously
let rafSpy;
beforeEach(() => {
  rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb();
    return 0;
  });
});
afterEach(() => {
  rafSpy.mockRestore();
});

const defaultProps = {
  value: '',
  onChange: jest.fn(),
  onSearch: jest.fn(),
  history: [],
  favorites: [],
  searchInputRef: React.createRef(),
  loading: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

const favItems = [
  { cas_number: '64-17-5', name_en: 'Ethanol', name_zh: '乙醇' },
  { cas_number: '67-56-1', name_en: 'Methanol', name_zh: '甲醇' },
];

const histItems = [
  { cas_number: '67-64-1', name_en: 'Acetone', name_zh: '丙酮' },
  { cas_number: '64-17-5', name_en: 'Ethanol', name_zh: '乙醇' }, // duplicate with favorites
];

describe('SearchAutocomplete', () => {
  describe('Rendering', () => {
    it('renders input with data-testid single-cas-input', () => {
      render(<SearchAutocomplete {...defaultProps} />);
      expect(screen.getByTestId('single-cas-input')).toBeInTheDocument();
    });

    it('has combobox role with correct aria attributes', () => {
      render(<SearchAutocomplete {...defaultProps} />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not show clear button when value is empty', () => {
      render(<SearchAutocomplete {...defaultProps} value="" />);
      // No button besides the input itself
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('shows clear button when value is non-empty', () => {
      render(<SearchAutocomplete {...defaultProps} value="64" />);
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show suggestions dropdown initially', () => {
      render(<SearchAutocomplete {...defaultProps} value="64" favorites={favItems} />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions filtering', () => {
    it('shows suggestions matching favorites by CAS number', () => {
      render(<SearchAutocomplete {...defaultProps} value="64-17" favorites={favItems} />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('64-17-5')).toBeInTheDocument();
    });

    it('shows suggestions matching history by English name', () => {
      render(<SearchAutocomplete {...defaultProps} value="acet" history={histItems} />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      expect(screen.getByText('67-64-1')).toBeInTheDocument();
    });

    it('deduplicates suggestions with favorites taking priority', () => {
      render(
        <SearchAutocomplete
          {...defaultProps}
          value="ethanol"
          favorites={favItems}
          history={histItems}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      // Should only appear once despite being in both favorites and history
      const options = screen.getAllByRole('option');
      const ethanolOptions = options.filter((o) => o.textContent.includes('64-17-5'));
      expect(ethanolOptions).toHaveLength(1);
    });

    it('limits suggestions to 8 items maximum', () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        cas_number: `100-0${i}-${i}`,
        name_en: `Chemical ${i}`,
        name_zh: `化學物 ${i}`,
      }));
      render(<SearchAutocomplete {...defaultProps} value="chemical" history={manyItems} />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      const options = screen.getAllByRole('option');
      expect(options.length).toBeLessThanOrEqual(8);
    });

    it('shows favorite label for items from favorites and history label for history', () => {
      // Use a query that matches both Ethanol (favorite) and Acetone (history)
      // "e" matches both "Ethanol" and "Acetone"
      render(
        <SearchAutocomplete
          {...defaultProps}
          value="e"
          favorites={[favItems[0]]}
          history={[histItems[0]]}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      // Ethanol from favorites should show autocomplete.favorite key
      expect(screen.getByText('autocomplete.favorite')).toBeInTheDocument();
      // Acetone from history should show autocomplete.history key
      expect(screen.getByText('autocomplete.history')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('clicking a suggestion calls onChange and onSearch with CAS number', () => {
      const onChange = jest.fn();
      const onSearch = jest.fn();
      render(
        <SearchAutocomplete
          {...defaultProps}
          value="ethanol"
          onChange={onChange}
          onSearch={onSearch}
          favorites={favItems}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      const option = screen.getByText('64-17-5');
      fireEvent.click(option.closest('[role="option"]'));
      expect(onChange).toHaveBeenCalledWith('64-17-5');
      expect(onSearch).toHaveBeenCalledWith('64-17-5');
    });

    it('clicking clear button calls onChange with empty string', () => {
      const onChange = jest.fn();
      render(<SearchAutocomplete {...defaultProps} value="64-17-5" onChange={onChange} />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // clear button
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard navigation', () => {
    const renderWithSuggestions = () => {
      const onChange = jest.fn();
      const onSearch = jest.fn();
      render(
        <SearchAutocomplete
          {...defaultProps}
          value="ol"
          onChange={onChange}
          onSearch={onSearch}
          favorites={favItems}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);
      return { input, onChange, onSearch };
    };

    it('ArrowDown moves activeIndex forward and wraps around', () => {
      const { input } = renderWithSuggestions();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // First option should become active (aria-selected)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // Navigate past the end to wrap around
      for (let i = 0; i < options.length; i++) {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      }
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp moves activeIndex backward and wraps around', () => {
      const { input } = renderWithSuggestions();
      // From -1, ArrowUp should go to last item
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter without active suggestion calls onSearch directly', () => {
      const onSearch = jest.fn();
      render(
        <SearchAutocomplete
          {...defaultProps}
          value="unknown"
          onSearch={onSearch}
          favorites={[]}
          history={[]}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSearch).toHaveBeenCalled();
    });

    it('Enter with active suggestion selects it', () => {
      const { input, onChange, onSearch } = renderWithSuggestions();
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // activeIndex = 0
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(expect.any(String));
      expect(onSearch).toHaveBeenCalledWith(expect.any(String));
    });

    it('Escape closes the suggestions dropdown', () => {
      const { input } = renderWithSuggestions();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
