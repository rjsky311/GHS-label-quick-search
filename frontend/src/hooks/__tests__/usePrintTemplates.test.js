import { renderHook, act } from '@testing-library/react';
import usePrintTemplates from '../usePrintTemplates';

const TEMPLATES_KEY = 'ghs_print_templates';

const mockConfig = {
  size: 'medium',
  template: 'standard',
  orientation: 'portrait',
  nameDisplay: 'both',
};

const mockCustomFields = {
  labName: 'Materials Lab',
  date: '2026-02-12',
  batchNumber: 'B-001',
};

describe('usePrintTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty templates', () => {
    const { result } = renderHook(() => usePrintTemplates());
    expect(result.current.templates).toEqual([]);
  });

  it('loads from localStorage on mount', () => {
    const saved = [
      { id: 'tpl-1', name: 'Test', labelConfig: mockConfig, customLabelFields: mockCustomFields, createdAt: '2026-01-01T00:00:00Z' },
    ];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => usePrintTemplates());
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].name).toBe('Test');
  });

  it('saveTemplate creates template with all fields', () => {
    const { result } = renderHook(() => usePrintTemplates());
    let saved;
    act(() => { saved = result.current.saveTemplate('My Template', mockConfig, mockCustomFields); });

    expect(saved).toBe(true);
    expect(result.current.templates).toHaveLength(1);
    const tpl = result.current.templates[0];
    expect(tpl.name).toBe('My Template');
    expect(tpl.labelConfig).toEqual(mockConfig);
    expect(tpl.customLabelFields).toEqual(mockCustomFields);
    expect(tpl.id).toMatch(/^tpl-/);
    expect(tpl.createdAt).toBeDefined();
  });

  it('saveTemplate persists to localStorage', () => {
    const { result } = renderHook(() => usePrintTemplates());
    act(() => { result.current.saveTemplate('Persisted', mockConfig, mockCustomFields); });

    const stored = JSON.parse(localStorage.getItem(TEMPLATES_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Persisted');
  });

  it('saveTemplate prepends new templates (newest first)', () => {
    const { result } = renderHook(() => usePrintTemplates());
    act(() => { result.current.saveTemplate('First', mockConfig, mockCustomFields); });
    act(() => { result.current.saveTemplate('Second', mockConfig, mockCustomFields); });

    expect(result.current.templates).toHaveLength(2);
    expect(result.current.templates[0].name).toBe('Second');
    expect(result.current.templates[1].name).toBe('First');
  });

  it('saveTemplate enforces max 10 limit', () => {
    const { result } = renderHook(() => usePrintTemplates());
    // Save 10 templates
    for (let i = 0; i < 10; i++) {
      act(() => { result.current.saveTemplate(`Template ${i}`, mockConfig, mockCustomFields); });
    }
    expect(result.current.templates).toHaveLength(10);

    // 11th should fail
    let saved;
    act(() => { saved = result.current.saveTemplate('Overflow', mockConfig, mockCustomFields); });
    expect(saved).toBe(false);
    expect(result.current.templates).toHaveLength(10);
  });

  it('saveTemplate rejects empty name', () => {
    const { result } = renderHook(() => usePrintTemplates());
    let saved;
    act(() => { saved = result.current.saveTemplate('', mockConfig, mockCustomFields); });
    expect(saved).toBe(false);
    expect(result.current.templates).toHaveLength(0);
  });

  it('saveTemplate trims name to 30 characters', () => {
    const { result } = renderHook(() => usePrintTemplates());
    const longName = 'A'.repeat(50);
    act(() => { result.current.saveTemplate(longName, mockConfig, mockCustomFields); });
    expect(result.current.templates[0].name).toHaveLength(30);
  });

  it('deleteTemplate removes by id', () => {
    const { result } = renderHook(() => usePrintTemplates());
    act(() => { result.current.saveTemplate('To Delete', mockConfig, mockCustomFields); });
    const id = result.current.templates[0].id;

    act(() => { result.current.deleteTemplate(id); });
    expect(result.current.templates).toHaveLength(0);
  });

  it('deleteTemplate updates localStorage', () => {
    const { result } = renderHook(() => usePrintTemplates());
    act(() => { result.current.saveTemplate('Delete Me', mockConfig, mockCustomFields); });
    const id = result.current.templates[0].id;

    act(() => { result.current.deleteTemplate(id); });
    const stored = JSON.parse(localStorage.getItem(TEMPLATES_KEY));
    expect(stored).toHaveLength(0);
  });

  it('clearTemplates empties all and removes localStorage', () => {
    const { result } = renderHook(() => usePrintTemplates());
    act(() => { result.current.saveTemplate('One', mockConfig, mockCustomFields); });
    act(() => { result.current.saveTemplate('Two', mockConfig, mockCustomFields); });

    act(() => { result.current.clearTemplates(); });
    expect(result.current.templates).toEqual([]);
    expect(localStorage.getItem(TEMPLATES_KEY)).toBeNull();
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(TEMPLATES_KEY, '{broken json');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => usePrintTemplates());
    expect(result.current.templates).toEqual([]);

    consoleSpy.mockRestore();
  });
});
