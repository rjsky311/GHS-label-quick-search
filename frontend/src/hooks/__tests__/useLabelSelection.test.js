import { renderHook, act } from '@testing-library/react';
import useLabelSelection from '../useLabelSelection';

const chem1 = { cas_number: '64-17-5', name_en: 'Ethanol', found: true };
const chem2 = { cas_number: '7732-18-5', name_en: 'Water', found: true };
const chemNotFound = { cas_number: '000-00-0', name_en: 'Unknown', found: false };

describe('useLabelSelection', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useLabelSelection());
    expect(result.current.selectedForLabel).toEqual([]);
  });

  it('toggleSelectForLabel adds a chemical', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.toggleSelectForLabel(chem1));
    expect(result.current.selectedForLabel).toHaveLength(1);
    expect(result.current.selectedForLabel[0].cas_number).toBe('64-17-5');
  });

  it('toggleSelectForLabel removes an existing chemical', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.toggleSelectForLabel(chem1));
    act(() => result.current.toggleSelectForLabel(chem1));
    expect(result.current.selectedForLabel).toHaveLength(0);
  });

  it('isSelectedForLabel returns correct boolean', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.toggleSelectForLabel(chem1));
    expect(result.current.isSelectedForLabel('64-17-5')).toBe(true);
    expect(result.current.isSelectedForLabel('7732-18-5')).toBe(false);
  });

  it('selectAllForLabel filters to found-only results', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.selectAllForLabel([chem1, chem2, chemNotFound]));
    expect(result.current.selectedForLabel).toHaveLength(2);
    expect(result.current.selectedForLabel.map((c) => c.cas_number)).toEqual([
      '64-17-5',
      '7732-18-5',
    ]);
  });

  it('selectAllForLabel replaces previous selection', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.toggleSelectForLabel(chem1));
    act(() => result.current.selectAllForLabel([chem2]));
    expect(result.current.selectedForLabel).toHaveLength(1);
    expect(result.current.selectedForLabel[0].cas_number).toBe('7732-18-5');
  });

  it('clearLabelSelection empties all', () => {
    const { result } = renderHook(() => useLabelSelection());
    act(() => result.current.selectAllForLabel([chem1, chem2]));
    act(() => result.current.clearLabelSelection());
    expect(result.current.selectedForLabel).toEqual([]);
  });
});
