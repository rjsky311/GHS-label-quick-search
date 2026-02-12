jest.mock('@/i18n', () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: 'en',
}));
jest.mock('@/constants/ghs', () => ({
  GHS_IMAGES: {
    GHS01: 'https://example.com/GHS01.svg',
    GHS02: 'https://example.com/GHS02.svg',
    GHS07: 'https://example.com/GHS07.svg',
  },
}));

import { printLabels, getQRCodeUrl, getHazardFontTier } from '../printLabels';

// ── Mock chemical fixtures ──
const mockChemical = {
  cas_number: '64-17-5',
  name_en: 'Ethanol',
  name_zh: '乙醇',
  cid: 702,
  ghs_pictograms: [
    { code: 'GHS02', name_zh: '易燃' },
    { code: 'GHS07', name_zh: '驚嘆號' },
  ],
  hazard_statements: [
    { code: 'H225', text_zh: '高度易燃液體和蒸氣' },
    { code: 'H319', text_zh: '造成嚴重眼睛刺激' },
  ],
  signal_word: 'Danger',
  signal_word_zh: '危險',
};

const mockChemicalNoGHS = {
  cas_number: '7732-18-5',
  name_en: 'Water',
  name_zh: '水',
  ghs_pictograms: [],
  hazard_statements: [],
  signal_word: '',
  signal_word_zh: '',
};

// ── Helper to create mock iframe ──
function createMockIframe() {
  const mockImages = [];
  const mockIframeDoc = {
    open: jest.fn(),
    write: jest.fn(),
    close: jest.fn(),
    querySelectorAll: jest.fn(() => mockImages),
  };
  const mockIframeWindow = {
    focus: jest.fn(),
    print: jest.fn(),
    document: mockIframeDoc,
  };
  const mockIframe = {
    id: '',
    style: { cssText: '' },
    contentDocument: mockIframeDoc,
    contentWindow: mockIframeWindow,
    remove: jest.fn(),
  };
  return { mockIframe, mockIframeDoc, mockIframeWindow, mockImages };
}

// ── Tests ──

describe('getQRCodeUrl', () => {
  it('generates correct QR code URL with default size', () => {
    const url = getQRCodeUrl('https://example.com');
    expect(url).toBe(
      'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fexample.com'
    );
  });

  it('generates correct QR code URL with custom size', () => {
    const url = getQRCodeUrl('https://example.com', 200);
    expect(url).toContain('size=200x200');
  });

  it('encodes special characters in data URL', () => {
    const url = getQRCodeUrl('https://example.com?a=1&b=2');
    expect(url).toContain('data=https%3A%2F%2Fexample.com%3Fa%3D1%26b%3D2');
  });
});

describe('getHazardFontTier', () => {
  it('returns default tier for 1-5 hazards (medium)', () => {
    const tier = getHazardFontTier(3, 'medium');
    expect(tier.fontSize).toBe('8px');
    expect(tier.lineHeight).toBe('1.2');
    expect(tier.marginBottom).toBe('0.8mm');
  });

  it('returns reduced tier for 6-8 hazards (medium)', () => {
    const tier = getHazardFontTier(6, 'medium');
    expect(tier.fontSize).toBe('7px');
    expect(tier.lineHeight).toBe('1.15');
  });

  it('returns small tier for 9-12 hazards (medium)', () => {
    const tier = getHazardFontTier(10, 'medium');
    expect(tier.fontSize).toBe('6px');
    expect(tier.lineHeight).toBe('1.1');
  });

  it('returns tiny tier for 13+ hazards (medium)', () => {
    const tier = getHazardFontTier(15, 'medium');
    expect(tier.fontSize).toBe('5.5px');
    expect(tier.lineHeight).toBe('1.05');
  });

  it('scales appropriately for small labels', () => {
    const tier = getHazardFontTier(10, 'small');
    expect(tier.fontSize).toBe('5.5px');
  });

  it('scales appropriately for large labels', () => {
    const tier = getHazardFontTier(10, 'large');
    expect(tier.fontSize).toBe('7.5px');
  });

  it('defaults to medium when size is undefined', () => {
    const tier = getHazardFontTier(3, undefined);
    expect(tier.fontSize).toBe('8px');
  });
});

describe('printLabels', () => {
  let mockIframe, mockIframeDoc, mockIframeWindow;
  let createElementSpy, appendChildSpy, getByIdSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createMockIframe();
    mockIframe = mocks.mockIframe;
    mockIframeDoc = mocks.mockIframeDoc;
    mockIframeWindow = mocks.mockIframeWindow;

    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'iframe') return mockIframe;
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : {};
    });
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    getByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getByIdSpy.mockRestore();
    jest.useRealTimers();
  });

  it('returns immediately for empty selection', () => {
    printLabels([], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(createElementSpy).not.toHaveBeenCalledWith('iframe');
  });

  it('creates a hidden iframe element', () => {
    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(createElementSpy).toHaveBeenCalledWith('iframe');
    expect(mockIframe.id).toBe('ghs-print-frame');
  });

  it('sets iframe to invisible with correct styles', () => {
    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(mockIframe.style.cssText).toContain('position:fixed');
    expect(mockIframe.style.cssText).toContain('width:0');
    expect(mockIframe.style.cssText).toContain('height:0');
    expect(mockIframe.style.cssText).toContain('opacity:0');
  });

  it('appends iframe to document.body', () => {
    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(appendChildSpy).toHaveBeenCalledWith(mockIframe);
  });

  it('writes HTML document to iframe', () => {
    printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(mockIframeDoc.open).toHaveBeenCalled();
    expect(mockIframeDoc.write).toHaveBeenCalledTimes(1);
    expect(mockIframeDoc.close).toHaveBeenCalled();

    const html = mockIframeDoc.write.mock.calls[0][0];
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Ethanol');
    expect(html).toContain('64-17-5');
    expect(html).toContain('乙醇');
  });

  it('calls print immediately when no images (300ms delay)', () => {
    // mockIframeDoc.querySelectorAll returns [] by default (no images)
    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});

    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.focus).toHaveBeenCalled();
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it('calls print after all images load', () => {
    const img1 = { complete: false, onload: null, onerror: null };
    const img2 = { complete: false, onload: null, onerror: null };
    mockIframeDoc.querySelectorAll.mockReturnValue([img1, img2]);

    printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});

    // Not printed yet (images still loading)
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();

    // First image loads
    img1.onload();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();

    // Second image loads → triggers print
    img2.onload();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it('handles images that are already complete', () => {
    const img1 = { complete: true };
    const img2 = { complete: true };
    mockIframeDoc.querySelectorAll.mockReturnValue([img1, img2]);

    printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});

    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it('removes existing print iframe before creating new one', () => {
    const oldIframe = { remove: jest.fn() };
    getByIdSpy.mockReturnValue(oldIframe);

    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
    expect(oldIframe.remove).toHaveBeenCalled();
  });

  it('cleans up iframe 1 second after printing', () => {
    printLabels([mockChemicalNoGHS], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});

    // Trigger print (300ms)
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(mockIframe.remove).not.toHaveBeenCalled();

    // Cleanup (1000ms after print)
    jest.advanceTimersByTime(1000);
    expect(mockIframe.remove).toHaveBeenCalled();
  });

  describe('templates', () => {
    const configs = [
      { template: 'icon', label: 'icon template' },
      { template: 'standard', label: 'standard template' },
      { template: 'full', label: 'full template' },
      { template: 'qrcode', label: 'qrcode template' },
    ];

    configs.forEach(({ template, label }) => {
      it(`generates valid HTML for ${label}`, () => {
        printLabels([mockChemical], { size: 'medium', template, orientation: 'portrait' }, {});
        const html = mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain('Ethanol');
        expect(html).toContain('64-17-5');
        expect(html).toContain('class="label');
      });
    });

    it('qrcode template includes QR code image', () => {
      printLabels([mockChemical], { size: 'medium', template: 'qrcode', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('qrcode-img');
      expect(html).toContain('api.qrserver.com');
    });
  });

  describe('sizes and orientations', () => {
    it('handles small size', () => {
      printLabels([mockChemical], { size: 'small', template: 'standard', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('60mm');
    });

    it('handles large size', () => {
      printLabels([mockChemical], { size: 'large', template: 'standard', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('105mm');
    });

    it('handles landscape orientation', () => {
      printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'landscape' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('A4 landscape');
    });

    it('portrait does not include landscape keyword in @page', () => {
      printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain('A4 landscape');
      expect(html).toContain('size: A4');
    });
  });

  describe('custom label fields', () => {
    const fields = { labName: 'Lab A', date: '2026-02-12', batchNumber: 'B-001' };
    const config = { size: 'medium', template: 'standard', orientation: 'portrait' };

    it('renders all custom fields in generated HTML', () => {
      printLabels([mockChemical], config, {}, fields);
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('Lab A');
      expect(html).toContain('2026-02-12');
      expect(html).toContain('B-001');
      expect(html).toContain('custom-fields');
    });

    it('does not render custom fields section when all empty', () => {
      printLabels([mockChemical], config, {}, { labName: '', date: '', batchNumber: '' });
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain('<div class="custom-fields">');
    });

    it('renders only non-empty fields', () => {
      printLabels([mockChemical], config, {}, { labName: 'Lab B', date: '', batchNumber: '' });
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('Lab B');
      expect(html).toContain('custom-fields');
      expect(html).not.toContain('B-001');
    });

    it('renders custom fields in all 4 templates', () => {
      ['icon', 'standard', 'full', 'qrcode'].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) => tag === 'iframe' ? mocks.mockIframe : {});
        getByIdSpy.mockReturnValue(null);

        printLabels([mockChemical], { ...config, template }, {}, fields);
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain('custom-fields');
        expect(html).toContain('Lab A');
      });
    });

    it('renders custom fields with default empty object', () => {
      // No customLabelFields argument → uses default {}
      printLabels([mockChemical], config, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain('<div class="custom-fields">');
    });

    it('batch number includes prefix label', () => {
      printLabels([mockChemical], config, {}, { labName: '', date: '', batchNumber: 'X-99' });
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('print.batch');
      expect(html).toContain('X-99');
    });
  });

  describe('name display modes', () => {
    it('shows both names by default (nameDisplay: "both")', () => {
      printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait', nameDisplay: 'both' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('Ethanol');
      expect(html).toContain('乙醇');
    });

    it('shows only English name when nameDisplay is "en"', () => {
      printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait', nameDisplay: 'en' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('Ethanol');
      expect(html).not.toContain('乙醇');
    });

    it('shows only Chinese name when nameDisplay is "zh"', () => {
      printLabels([mockChemical], { size: 'medium', template: 'standard', orientation: 'portrait', nameDisplay: 'zh' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('乙醇');
      expect(html).not.toContain('Ethanol');
    });

    it('falls back to English when nameDisplay is "zh" but no Chinese name', () => {
      const enOnlyChem = { ...mockChemical, name_zh: '' };
      printLabels([enOnlyChem], { size: 'medium', template: 'standard', orientation: 'portrait', nameDisplay: 'zh' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('Ethanol');
    });

    it('respects nameDisplay across all 4 templates', () => {
      ['icon', 'standard', 'full', 'qrcode'].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) => tag === 'iframe' ? mocks.mockIframe : {});
        getByIdSpy.mockReturnValue(null);

        printLabels([mockChemical], { size: 'medium', template, orientation: 'portrait', nameDisplay: 'en' }, {});
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain('Ethanol');
        expect(html).not.toContain('乙醇');
      });
    });
  });

  describe('label quantities', () => {
    const config = { size: 'medium', template: 'standard', orientation: 'portrait' };

    it('prints multiple copies when quantity > 1', () => {
      const quantities = { '64-17-5': 3 };
      printLabels([mockChemical], config, {}, {}, quantities);
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Should contain 3 label divs for the same chemical
      const matches = html.match(/CAS: 64-17-5/g);
      expect(matches).toHaveLength(3);
    });

    it('defaults to quantity 1 when not specified', () => {
      printLabels([mockChemical], config, {}, {}, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      const matches = html.match(/CAS: 64-17-5/g);
      expect(matches).toHaveLength(1);
    });

    it('respects different quantities for different chemicals', () => {
      const quantities = { '64-17-5': 2, '7732-18-5': 3 };
      printLabels([mockChemical, mockChemicalNoGHS], config, {}, {}, quantities);
      const html = mockIframeDoc.write.mock.calls[0][0];
      const ethanolMatches = html.match(/CAS: 64-17-5/g);
      const waterMatches = html.match(/CAS: 7732-18-5/g);
      expect(ethanolMatches).toHaveLength(2);
      expect(waterMatches).toHaveLength(3);
    });

    it('paginates correctly with expanded quantities', () => {
      // perPage for medium+portrait = 8 labels per page
      // 5 copies of ethanol + 5 copies of water = 10 total → 2 pages
      const quantities = { '64-17-5': 5, '7732-18-5': 5 };
      printLabels([mockChemical, mockChemicalNoGHS], config, {}, {}, quantities);
      const html = mockIframeDoc.write.mock.calls[0][0];
      const pageMatches = html.match(/class="page"/g);
      expect(pageMatches).toHaveLength(2);
    });
  });

  describe('full template font auto-sizing', () => {
    it('applies default font size for few hazards (tier 1)', () => {
      // mockChemical has 2 hazards → tier 1
      printLabels([mockChemical], { size: 'medium', template: 'full', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('font-size:8px');
    });

    it('applies reduced font size for many hazards (tier 3)', () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 10 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels([manyHazards], { size: 'medium', template: 'full', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('font-size:6px');
    });

    it('applies tiny font size for very many hazards (tier 4)', () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 15 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels([manyHazards], { size: 'medium', template: 'full', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('font-size:5.5px');
    });

    it('does not apply auto-sizing inline styles to standard template', () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 15 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels([manyHazards], { size: 'medium', template: 'standard', orientation: 'portrait' }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Standard template truncates hazards, does not use auto-sizing inline styles
      expect(html).not.toContain('font-size:5.5px');
    });
  });

  describe('custom GHS settings', () => {
    it('uses alternate classification when customGHSSettings specifies index', () => {
      const chemWithAlternate = {
        ...mockChemical,
        other_classifications: [
          {
            pictograms: [{ code: 'GHS01', name_zh: '爆炸物' }],
            hazard_statements: [{ code: 'H200', text_zh: '不穩定炸藥' }],
            signal_word: 'Danger',
            signal_word_zh: '危險',
          },
        ],
      };
      const customSettings = {
        '64-17-5': { selectedIndex: 1, note: 'Use alternate' },
      };

      printLabels([chemWithAlternate], { size: 'medium', template: 'standard', orientation: 'portrait' }, customSettings);
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain('GHS01');
      expect(html).toContain('H200');
    });
  });
});
