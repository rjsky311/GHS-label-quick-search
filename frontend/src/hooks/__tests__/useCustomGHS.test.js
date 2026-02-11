import { renderHook, act } from '@testing-library/react';
import useCustomGHS from '../useCustomGHS';

const CUSTOM_GHS_KEY = 'ghs_custom_settings';

const mockResult = {
  cas_number: '64-17-5',
  found: true,
  ghs_pictograms: [{ code: 'GHS02' }],
  hazard_statements: [{ code: 'H225', text_zh: '高度易燃' }],
  signal_word: 'Danger',
  signal_word_zh: '危險',
  other_classifications: [
    {
      pictograms: [{ code: 'GHS07' }],
      hazard_statements: [{ code: 'H302', text_zh: '吞食有害' }],
      signal_word: 'Warning',
      signal_word_zh: '警告',
    },
  ],
  has_multiple_classifications: true,
};

describe('useCustomGHS', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty settings', () => {
    const { result } = renderHook(() => useCustomGHS());
    expect(result.current.customGHSSettings).toEqual({});
  });

  it('getEffectiveClassification returns null for null result', () => {
    const { result } = renderHook(() => useCustomGHS());
    expect(result.current.getEffectiveClassification(null)).toBeNull();
  });

  it('getEffectiveClassification returns null for found=false', () => {
    const { result } = renderHook(() => useCustomGHS());
    expect(result.current.getEffectiveClassification({ found: false })).toBeNull();
  });

  it('getEffectiveClassification returns default (index 0) with isCustom=false', () => {
    const { result } = renderHook(() => useCustomGHS());
    const eff = result.current.getEffectiveClassification(mockResult);
    expect(eff.isCustom).toBe(false);
    expect(eff.customIndex).toBe(0);
    expect(eff.pictograms).toEqual([{ code: 'GHS02' }]);
    expect(eff.signal_word).toBe('Danger');
  });

  it('getEffectiveClassification returns primary classification fields', () => {
    const { result } = renderHook(() => useCustomGHS());
    const eff = result.current.getEffectiveClassification(mockResult);
    expect(eff).toHaveProperty('pictograms');
    expect(eff).toHaveProperty('hazard_statements');
    expect(eff).toHaveProperty('signal_word');
    expect(eff).toHaveProperty('signal_word_zh');
  });

  it('setCustomClassification saves to localStorage', () => {
    const { result } = renderHook(() => useCustomGHS());
    act(() => result.current.setCustomClassification('64-17-5', 1, 'test note'));

    const saved = JSON.parse(localStorage.getItem(CUSTOM_GHS_KEY));
    expect(saved['64-17-5'].selectedIndex).toBe(1);
    expect(saved['64-17-5'].note).toBe('test note');
    expect(saved['64-17-5']).toHaveProperty('updatedAt');
  });

  it('getEffectiveClassification respects custom selectedIndex', () => {
    const { result } = renderHook(() => useCustomGHS());
    act(() => result.current.setCustomClassification('64-17-5', 1));

    const eff = result.current.getEffectiveClassification(mockResult);
    expect(eff.isCustom).toBe(true);
    expect(eff.customIndex).toBe(1);
    expect(eff.signal_word).toBe('Warning');
    expect(eff.pictograms).toEqual([{ code: 'GHS07' }]);
  });

  it('getEffectiveClassification falls back to default for out-of-range index', () => {
    const { result } = renderHook(() => useCustomGHS());
    act(() => result.current.setCustomClassification('64-17-5', 99));

    const eff = result.current.getEffectiveClassification(mockResult);
    expect(eff.isCustom).toBe(false);
    expect(eff.customIndex).toBe(0);
  });

  it('clearCustomClassification removes setting', () => {
    const { result } = renderHook(() => useCustomGHS());
    act(() => result.current.setCustomClassification('64-17-5', 1));
    expect(result.current.hasCustomClassification('64-17-5')).toBe(true);

    act(() => result.current.clearCustomClassification('64-17-5'));
    expect(result.current.hasCustomClassification('64-17-5')).toBe(false);
  });

  it('hasCustomClassification returns correct boolean', () => {
    const { result } = renderHook(() => useCustomGHS());
    expect(result.current.hasCustomClassification('64-17-5')).toBe(false);
    act(() => result.current.setCustomClassification('64-17-5', 0));
    expect(result.current.hasCustomClassification('64-17-5')).toBe(true);
  });
});
