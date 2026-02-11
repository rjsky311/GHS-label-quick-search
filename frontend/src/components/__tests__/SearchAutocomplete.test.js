import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SearchAutocomplete from '../SearchAutocomplete';
import axios from 'axios';

jest.mock('axios');

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
  jest.useFakeTimers();
  // Default: server returns empty results
  axios.get.mockResolvedValue({ data: { results: [], query: '' } });
});

afterEach(() => {
  jest.useRealTimers();
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
      // Local suggestions capped at 8; server results may add more
      // but default mock returns empty, so should be exactly 8
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(8);
    });

    it('shows favorite label for items from favorites and history label for history', () => {
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
      expect(screen.getByText('autocomplete.favorite')).toBeInTheDocument();
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

  describe('Server name search', () => {
    const serverResults = [
      { cas_number: '64-17-5', name_en: 'Ethanol', name_zh: '乙醇' },
      { cas_number: '67-56-1', name_en: 'Methanol', name_zh: '甲醇' },
      { cas_number: '71-36-3', name_en: '1-Butanol', name_zh: '正丁醇' },
    ];

    it('does not call API for CAS-like input', () => {
      render(<SearchAutocomplete {...defaultProps} value="64-17" />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      act(() => { jest.advanceTimersByTime(500); });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('does not call API for input shorter than 2 chars', () => {
      render(<SearchAutocomplete {...defaultProps} value="a" />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      act(() => { jest.advanceTimersByTime(500); });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('calls API after 300ms debounce for name input', () => {
      render(<SearchAutocomplete {...defaultProps} value="ethanol" />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      // Before 300ms — no call yet
      act(() => { jest.advanceTimersByTime(200); });
      expect(axios.get).not.toHaveBeenCalled();

      // After 300ms — call fires
      act(() => { jest.advanceTimersByTime(100); });
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/search-by-name/ethanol'),
        expect.objectContaining({ signal: expect.any(Object) })
      );
    });

    it('shows server results in dropdown below local results', async () => {
      axios.get.mockResolvedValue({
        data: { results: serverResults, query: 'ol' },
      });

      render(
        <SearchAutocomplete
          {...defaultProps}
          value="ol"
          favorites={[favItems[0]]} // Ethanol matches "ol"
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      // Advance past debounce and flush promises
      await act(async () => { jest.advanceTimersByTime(300); });

      const options = screen.getAllByRole('option');
      // Local: Ethanol (favorite); Server: Methanol + 1-Butanol (Ethanol deduped)
      expect(options.length).toBe(3);
      // First item should be local favorite
      expect(options[0].textContent).toContain('autocomplete.favorite');
      // Server items should show autocomplete.search badge
      expect(options[1].textContent).toContain('autocomplete.search');
    });

    it('deduplicates server results already in local suggestions', async () => {
      axios.get.mockResolvedValue({
        data: { results: serverResults, query: 'ol' },
      });

      render(
        <SearchAutocomplete
          {...defaultProps}
          value="ol"
          favorites={favItems} // Both Ethanol and Methanol in favorites
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      await act(async () => { jest.advanceTimersByTime(300); });

      const options = screen.getAllByRole('option');
      // Local: Ethanol + Methanol (favorites); Server: only 1-Butanol (other two deduped)
      expect(options.length).toBe(3);
      // Verify 1-Butanol appears as server result
      const butanolOption = options.find((o) => o.textContent.includes('71-36-3'));
      expect(butanolOption).toBeTruthy();
      expect(butanolOption.textContent).toContain('autocomplete.search');
    });

    it('shows loading spinner while fetching', () => {
      // Mock a pending promise
      axios.get.mockReturnValue(new Promise(() => {}));

      render(<SearchAutocomplete {...defaultProps} value="ethanol" />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      // Advance past debounce to trigger request
      act(() => { jest.advanceTimersByTime(300); });

      expect(screen.getByText('autocomplete.searching')).toBeInTheDocument();
    });

    it('clicking server result calls onChange and onSearch with CAS', async () => {
      const onChange = jest.fn();
      const onSearch = jest.fn();
      axios.get.mockResolvedValue({
        data: { results: [serverResults[2]], query: 'butanol' },
      });

      render(
        <SearchAutocomplete
          {...defaultProps}
          value="butanol"
          onChange={onChange}
          onSearch={onSearch}
        />
      );
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      await act(async () => { jest.advanceTimersByTime(300); });

      const option = screen.getByText('71-36-3').closest('[role="option"]');
      fireEvent.click(option);
      expect(onChange).toHaveBeenCalledWith('71-36-3');
      expect(onSearch).toHaveBeenCalledWith('71-36-3');
    });

    it('hides server results on API error', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      render(<SearchAutocomplete {...defaultProps} value="ethanol" />);
      const input = screen.getByTestId('single-cas-input');
      fireEvent.focus(input);

      await act(async () => { jest.advanceTimersByTime(300); });

      // No crash, no server results shown
      expect(screen.queryByText('autocomplete.search')).not.toBeInTheDocument();
      expect(screen.queryByText('autocomplete.searching')).not.toBeInTheDocument();
    });
  });
});
