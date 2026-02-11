import { renderHook, act } from '@testing-library/react';
import useResultSort from '../useResultSort';

const mockGetEffective = (result) => {
  if (!result || !result.found) return null;
  return {
    pictograms: result.ghs_pictograms || [],
    signal_word: result.signal_word,
  };
};

const results = [
  { cas_number: '7732-18-5', name_en: 'Water', found: true, signal_word: null, ghs_pictograms: [] },
  { cas_number: '64-17-5', name_en: 'Ethanol', found: true, signal_word: 'Danger', ghs_pictograms: [{ code: 'GHS02' }, { code: 'GHS07' }] },
  { cas_number: '7647-01-0', name_en: 'Hydrochloric acid', found: true, signal_word: 'Warning', ghs_pictograms: [{ code: 'GHS05' }] },
  { cas_number: '000-00-0', name_en: 'Unknown', found: false },
];

describe('useResultSort', () => {
  it('returns unsorted results when no sort key set', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    expect(result.current.sortedResults).toEqual(results);
    expect(result.current.sortConfig).toEqual({ key: null, direction: 'asc' });
  });

  it('sorts by cas_number ascending', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('cas_number'));

    const cas = result.current.sortedResults.map((r) => r.cas_number);
    expect(cas).toEqual(['000-00-0', '64-17-5', '7647-01-0', '7732-18-5']);
  });

  it('toggles direction to desc on same key click', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('cas_number'));
    act(() => result.current.requestSort('cas_number'));

    expect(result.current.sortConfig.direction).toBe('desc');
    const cas = result.current.sortedResults.map((r) => r.cas_number);
    expect(cas).toEqual(['7732-18-5', '7647-01-0', '64-17-5', '000-00-0']);
  });

  it('resets to asc on new key', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('cas_number'));
    act(() => result.current.requestSort('cas_number')); // desc
    act(() => result.current.requestSort('name')); // new key → asc
    expect(result.current.sortConfig).toEqual({ key: 'name', direction: 'asc' });
  });

  it('sorts by name using name_en', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('name'));

    const names = result.current.sortedResults.map((r) => r.name_en);
    expect(names).toEqual(['Ethanol', 'Hydrochloric acid', 'Unknown', 'Water']);
  });

  it('sorts by signal_word: Danger < Warning < none < not-found', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('signal_word'));

    const words = result.current.sortedResults.map((r) => r.signal_word);
    // Danger (0) < Warning (1) < null/none (2) < not-found (3)
    expect(words).toEqual(['Danger', 'Warning', null, undefined]);
  });

  it('sorts by pictogram_count ascending', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('pictogram_count'));

    const counts = result.current.sortedResults.map(
      (r) => r.found ? (r.ghs_pictograms?.length || 0) : -1
    );
    // not-found (-1) < 0 < 1 < 2
    expect(counts).toEqual([-1, 0, 1, 2]);
  });

  it('sorts by pictogram_count descending', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('pictogram_count'));
    act(() => result.current.requestSort('pictogram_count'));

    const counts = result.current.sortedResults.map(
      (r) => r.found ? (r.ghs_pictograms?.length || 0) : -1
    );
    expect(counts).toEqual([2, 1, 0, -1]);
  });

  it('resetSort clears sort config', () => {
    const { result } = renderHook(() => useResultSort(results, mockGetEffective));
    act(() => result.current.requestSort('cas_number'));
    act(() => result.current.resetSort());
    expect(result.current.sortConfig).toEqual({ key: null, direction: 'asc' });
    expect(result.current.sortedResults).toEqual(results);
  });

  it('handles empty results array', () => {
    const { result } = renderHook(() => useResultSort([], mockGetEffective));
    act(() => result.current.requestSort('cas_number'));
    expect(result.current.sortedResults).toEqual([]);
  });
});
