import { renderHook, act } from '@testing-library/react';
import useSearchHistory from '../useSearchHistory';

const HISTORY_KEY = 'ghs_search_history';

const makeResult = (cas, found = true) => ({
  cas_number: cas,
  name_en: `Chemical ${cas}`,
  name_zh: `化學品 ${cas}`,
  found,
});

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty history when no localStorage data', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('loads existing history from localStorage on mount', () => {
    const saved = [{ cas_number: '64-17-5', name_en: 'Ethanol', timestamp: '2024-01-01T00:00:00Z' }];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual(saved);
  });

  it('saveToHistory filters out found=false results', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.saveToHistory([makeResult('64-17-5', true), makeResult('000-00-0', false)]);
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].cas_number).toBe('64-17-5');
  });

  it('saveToHistory does nothing if all results not found', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.saveToHistory([makeResult('000-00-0', false)]);
    });
    expect(result.current.history).toEqual([]);
  });

  it('saveToHistory adds timestamp to each item', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.saveToHistory([makeResult('64-17-5')]);
    });
    expect(result.current.history[0]).toHaveProperty('timestamp');
    expect(new Date(result.current.history[0].timestamp).getTime()).not.toBeNaN();
  });

  it('saveToHistory deduplicates by CAS (new at front)', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.saveToHistory([makeResult('64-17-5'), makeResult('7732-18-5')]);
    });
    act(() => {
      result.current.saveToHistory([makeResult('64-17-5')]);
    });
    // 64-17-5 should be at front, no duplicates
    expect(result.current.history.filter((h) => h.cas_number === '64-17-5')).toHaveLength(1);
    expect(result.current.history[0].cas_number).toBe('64-17-5');
  });

  it('saveToHistory caps at 50 items', () => {
    const { result } = renderHook(() => useSearchHistory());
    // Add 55 items
    const batch = Array.from({ length: 55 }, (_, i) => makeResult(`${i}-00-0`));
    act(() => {
      result.current.saveToHistory(batch);
    });
    expect(result.current.history.length).toBeLessThanOrEqual(50);
  });

  it('clearHistory empties array and removes localStorage', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.saveToHistory([makeResult('64-17-5')]);
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    localStorage.setItem(HISTORY_KEY, 'not-valid-json{{{');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);

    consoleSpy.mockRestore();
  });
});
