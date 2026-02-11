import { renderHook, act } from '@testing-library/react';
import useFavorites from '../useFavorites';

const FAVORITES_KEY = 'ghs_favorites';

const mockChemical = {
  cas_number: '64-17-5',
  cid: 702,
  name_en: 'Ethanol',
  name_zh: '乙醇',
  ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
  hazard_statements: [{ code: 'H225', text_zh: '高度易燃液體和蒸氣' }],
  signal_word: 'Danger',
  signal_word_zh: '危險',
  other_classifications: [{ pictograms: [], hazard_statements: [], signal_word: 'Warning' }],
  has_multiple_classifications: true,
};

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('loads from localStorage on mount', () => {
    const saved = [{ cas_number: '64-17-5', name_en: 'Ethanol' }];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(saved);
  });

  it('toggleFavorite adds chemical with all required fields', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(mockChemical));

    const fav = result.current.favorites[0];
    expect(fav.cas_number).toBe('64-17-5');
    expect(fav.cid).toBe(702);
    expect(fav.name_en).toBe('Ethanol');
    expect(fav.name_zh).toBe('乙醇');
    expect(fav.ghs_pictograms).toEqual(mockChemical.ghs_pictograms);
    expect(fav.hazard_statements).toEqual(mockChemical.hazard_statements);
    expect(fav.signal_word).toBe('Danger');
    expect(fav.signal_word_zh).toBe('危險');
  });

  it('toggleFavorite saves found=true (critical for DetailModal)', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(mockChemical));
    expect(result.current.favorites[0].found).toBe(true);
  });

  it('toggleFavorite saves other_classifications defaulting to []', () => {
    const { result } = renderHook(() => useFavorites());
    // Chemical without other_classifications field
    const sparse = { cas_number: '123-45-6', cid: 100 };
    act(() => result.current.toggleFavorite(sparse));
    expect(result.current.favorites[0].other_classifications).toEqual([]);
  });

  it('toggleFavorite saves has_multiple_classifications defaulting to false', () => {
    const { result } = renderHook(() => useFavorites());
    const sparse = { cas_number: '123-45-6', cid: 100 };
    act(() => result.current.toggleFavorite(sparse));
    expect(result.current.favorites[0].has_multiple_classifications).toBe(false);
  });

  it('toggleFavorite removes existing favorite (toggle off)', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(mockChemical));
    expect(result.current.favorites).toHaveLength(1);
    act(() => result.current.toggleFavorite(mockChemical));
    expect(result.current.favorites).toHaveLength(0);
  });

  it('isFavorited returns true for saved CAS', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(mockChemical));
    expect(result.current.isFavorited('64-17-5')).toBe(true);
  });

  it('isFavorited returns false for unknown CAS', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorited('999-99-9')).toBe(false);
  });

  it('clearFavorites empties all and removes localStorage', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(mockChemical));
    act(() => result.current.clearFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(FAVORITES_KEY, '{broken json');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);

    consoleSpy.mockRestore();
  });
});
