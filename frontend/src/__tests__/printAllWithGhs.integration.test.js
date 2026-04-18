/**
 * App-level integration test for v1.8 M2 PR-B.
 *
 * The production handler `handlePrintAllWithGhs` must NOT delegate to
 * `handleOpenLabelModal`. The latter contains a legacy auto-select-all-
 * found fallback that runs when `selectedForLabel.length === 0`. Because
 * React state updates are batched, a delegating implementation would
 * read the pre-set length (stale closure), trigger the fallback, and
 * overwrite the GHS-filtered subset with EVERY found row.
 *
 * This test renders the real `<App />` with mocked network/IO and
 * proves that clicking the new shortcut:
 *   - opens LabelPrintModal
 *   - the modal's selection contains ONLY the `found && has-GHS` rows
 *     (not the found-but-no-GHS rows, not the not-found rows)
 *
 * Any future refactor that accidentally pipes the new handler through
 * `handleOpenLabelModal` will fail this test.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import App from '@/App';

jest.mock('axios');

// sonner's toast isn't what we're testing — neutralize it.
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

// Neutralize `printLabels` so a real window.print / iframe isn't
// spawned in jsdom. We only care about selection state + modal open.
jest.mock('@/utils/printLabels', () => ({
  buildPrintPreviewDocument: jest.fn(() => ({
    html: '<html><body>preview</body></html>',
  })),
  printLabels: jest.fn(),
  resolveEffectiveChemicalForPrint: jest.fn((chemical) => chemical),
  getQRCodeUrl: jest.fn(() => 'http://qr.test'),
}));

// sdsLinks returns harmless URLs in test.
jest.mock('@/utils/sdsLinks', () => ({
  getPubChemSDSUrl: jest.fn(() => 'http://sds.test'),
  getECHASearchUrl: jest.fn(() => 'http://echa.test'),
}));

// GHSImage would try to load SVGs — stub to a simple span.
jest.mock('@/components/GHSImage', () => (props) => (
  <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>
));

// localStorage is jsdom-provided; ensure a clean slate each test.
beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

// App is a static import at the top — jest.resetModules() would spawn
// a second React instance and break `useState`. Instead we rely on
// `localStorage.clear()` + `jest.clearAllMocks()` in beforeEach to
// wipe App's state between tests.

/**
 * Issue a single-CAS query via the search input, letting App's
 * existing `searchSingleChemical` fire and drive the mocked axios.get.
 * For batch routing we mock GET to return the shape App expects.
 */
async function runBatchSearch({ casInputs, mockResponses }) {
  // App dispatches GET /api/search/{cas} for single-CAS route AND
  // POST /api/search for batch. For this test, batch is easier — one
  // POST returns an array of results in one tick.
  axios.post.mockImplementation(async (url) => {
    if (url.endsWith('/api/search')) {
      return { data: mockResponses };
    }
    return { data: {} };
  });
  axios.get.mockImplementation(async () => {
    // Not used in batch path, but guard against accidental calls.
    return { data: { results: [] } };
  });

  // Switch to batch tab + paste + submit.
  const batchTab = screen.getByTestId('batch-search-tab');
  await act(async () => {
    fireEvent.click(batchTab);
  });

  const textarea = screen.getByTestId('batch-cas-input');
  await act(async () => {
    fireEvent.change(textarea, { target: { value: casInputs.join('\n') } });
  });

  const submit = screen.getByTestId('batch-search-btn');
  await act(async () => {
    fireEvent.click(submit);
  });

  // Wait for results to render.
  await waitFor(() =>
    expect(screen.getByText('results.title')).toBeInTheDocument()
  );
}

describe('v1.8 M2 PR-B — Print all with GHS data (App integration)', () => {
  it('opens the label modal with ONLY rows that have GHS data, excluding found-but-no-GHS and not-found rows', async () => {
    // Three-row scenario Codex specified:
    //   1. foundWithGhs  — included
    //   2. foundWithoutGhs — excluded (no pictograms / H / P / signal)
    //   3. notFound — excluded
    const foundWithGhs = {
      cas_number: '64-17-5',
      cid: 702,
      name_en: 'Ethanol',
      name_zh: '乙醇',
      found: true,
      ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
      hazard_statements: [{ code: 'H225', text_zh: '高度易燃液體和蒸氣' }],
      precautionary_statements: [],
      signal_word: 'Danger',
      signal_word_zh: '危險',
      other_classifications: [],
    };
    const foundWithoutGhs = {
      cas_number: '7732-18-5',
      cid: 962,
      name_en: 'Water',
      name_zh: '水',
      found: true,
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [],
      signal_word: null,
      signal_word_zh: null,
      other_classifications: [],
    };
    const notFound = {
      cas_number: '999-99-9',
      name_en: null,
      name_zh: null,
      found: false,
      error: 'Not in PubChem',
    };

    render(<App />);

    await runBatchSearch({
      casInputs: ['64-17-5', '7732-18-5', '999-99-9'],
      mockResponses: [foundWithGhs, foundWithoutGhs, notFound],
    });

    // The new shortcut button must be present with count=1
    const printAllBtn = await screen.findByTestId('print-all-with-ghs-btn');
    expect(printAllBtn.textContent).toContain('1');

    // Click it.
    await act(async () => {
      fireEvent.click(printAllBtn);
    });

    // Label modal opens. The modal has a heading i18n key `label.title`.
    await waitFor(() =>
      expect(screen.getAllByText('label.title').length).toBeGreaterThan(0)
    );

    // Inside the modal's "Selected Chemicals" list, only the with-GHS
    // row should appear. We search inside the modal dialog specifically.
    // The LabelPrintModal renders each chemical's CAS as a
    // `<span class="font-mono ...">{cas_number}</span>`. `screen.getAllByText`
    // for the CAS is enough because each CAS is unique in the document.
    expect(screen.getAllByText('64-17-5').length).toBeGreaterThan(0);
    // And the others must NOT appear inside the modal.
    // Water (found-but-no-GHS) and the not-found CAS must not leak in.
    // They DO appear in the underlying ResultsTable rows behind the
    // modal, so querying globally is ambiguous. Instead, check the
    // selected-count header inside the modal.
    expect(screen.getByText('label.selectedCount')).toBeInTheDocument();
    // The i18n mock returns keys, but we can count rendered rows:
    // the modal's list uses `<span class="font-mono text-amber-400 text-sm">{cas}</span>`
    // for each selected chemical. We assert exactly one such span
    // inside the dialog.
    const dialog = screen.getByRole('dialog', { name: /label\.title/i });
    const selectedCasSpans = dialog.querySelectorAll(
      'span.font-mono.text-amber-400.text-sm'
    );
    expect(selectedCasSpans).toHaveLength(1);
    expect(selectedCasSpans[0].textContent).toBe('64-17-5');
  });

  it('regression guard: the found-but-no-GHS row is NOT in the modal selection even though handleOpenLabelModal would have included it', async () => {
    // This test pins the key behavioural invariant: if the new handler
    // were ever refactored to delegate to handleOpenLabelModal, the
    // found-but-no-GHS row would leak into the selection via the
    // auto-select-all-found fallback. We verify it does NOT.
    const foundWithGhs = {
      cas_number: '64-17-5',
      name_en: 'Ethanol',
      name_zh: '乙醇',
      found: true,
      ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
      hazard_statements: [{ code: 'H225', text_zh: 'x' }],
      precautionary_statements: [],
      signal_word: 'Danger',
      signal_word_zh: '危險',
      other_classifications: [],
    };
    const foundWithoutGhs = {
      cas_number: '7732-18-5',
      name_en: 'Water',
      name_zh: '水',
      found: true,
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [],
      signal_word: null,
      signal_word_zh: null,
      other_classifications: [],
    };

    render(<App />);

    await runBatchSearch({
      casInputs: ['64-17-5', '7732-18-5'],
      mockResponses: [foundWithGhs, foundWithoutGhs],
    });

    const printAllBtn = await screen.findByTestId('print-all-with-ghs-btn');
    // Count = 1 because only one row has GHS data.
    expect(printAllBtn.textContent).toContain('1');

    await act(async () => {
      fireEvent.click(printAllBtn);
    });

    await waitFor(() =>
      expect(screen.getAllByText('label.title').length).toBeGreaterThan(0)
    );

    const dialog = screen.getByRole('dialog', { name: /label\.title/i });
    const selectedCasSpans = dialog.querySelectorAll(
      'span.font-mono.text-amber-400.text-sm'
    );
    // If delegation had clobbered the subset, this would be 2.
    expect(selectedCasSpans).toHaveLength(1);
    expect(selectedCasSpans[0].textContent).toBe('64-17-5');
    // And explicitly: the water CAS is NOT inside the dialog.
    const dialogText = dialog.textContent;
    expect(dialogText).not.toContain('7732-18-5');
  });

  it('filter-independence: the shortcut count reflects RAW results, not the currently visible filter set', async () => {
    // Post-review fix verification: the shortcut acts on the RAW
    // results array, not on whatever is currently visible in the
    // filtered table view. If the count had been computed from
    // filter-visible rows (the pre-fix bug), applying a filter that
    // hides some rows would make the count drop below the true total.
    //
    // Scenario:
    //   - Batch returns 2 rows that both have GHS data, one with
    //     signal_word="Danger" and one with signal_word="Warning"
    //   - Apply the "Danger" filter → only 1 row visible in the table
    //   - The shortcut badge must still say "2" (both raw-eligible rows)
    //   - Clicking must open the modal with BOTH rows selected
    const dangerRow = {
      cas_number: '64-17-5',
      cid: 702,
      name_en: 'Ethanol',
      name_zh: '乙醇',
      found: true,
      ghs_pictograms: [{ code: 'GHS02', name_zh: '易燃' }],
      hazard_statements: [{ code: 'H225', text_zh: 'x' }],
      precautionary_statements: [],
      signal_word: 'Danger',
      signal_word_zh: '危險',
      other_classifications: [],
    };
    const warningRow = {
      cas_number: '67-64-1',
      cid: 180,
      name_en: 'Acetone',
      name_zh: '丙酮',
      found: true,
      ghs_pictograms: [{ code: 'GHS07', name_zh: '刺激性' }],
      hazard_statements: [{ code: 'H319', text_zh: 'x' }],
      precautionary_statements: [],
      signal_word: 'Warning',
      signal_word_zh: '警告',
      other_classifications: [],
    };

    render(<App />);
    await runBatchSearch({
      casInputs: ['64-17-5', '67-64-1'],
      mockResponses: [dangerRow, warningRow],
    });

    // Baseline: both rows eligible, shortcut badge = 2.
    let btn = await screen.findByTestId('print-all-with-ghs-btn');
    expect(btn.textContent).toContain('2');

    // Apply the "Danger" filter. filter.danger is the i18n key for
    // the Danger pill in the filter toolbar.
    const dangerPill = screen.getByText('filter.danger');
    await act(async () => {
      fireEvent.click(dangerPill);
    });

    // The filter toolbar now shows a "showing 1 of 2" indicator via
    // filter.showing key. Sanity-check the filter actually applied
    // by looking for that key.
    expect(screen.getByText('filter.showing')).toBeInTheDocument();

    // CRITICAL: the shortcut badge must still say "2" because the
    // count reflects RAW results (pre-filter). Before the post-review
    // fix, this would have been "1" — one visible Danger row.
    btn = screen.getByTestId('print-all-with-ghs-btn');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain('2');

    // Clicking it opens the modal with BOTH rows selected, proving
    // the handler (already on raw results) and the count (now also
    // on raw results) are in sync.
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() =>
      expect(screen.getAllByText('label.title').length).toBeGreaterThan(0)
    );
    const dialog = screen.getByRole('dialog', { name: /label\.title/i });
    const selectedCasSpans = dialog.querySelectorAll(
      'span.font-mono.text-amber-400.text-sm'
    );
    expect(selectedCasSpans).toHaveLength(2);
    const selectedCasValues = Array.from(selectedCasSpans).map((n) => n.textContent);
    expect(selectedCasValues).toEqual(expect.arrayContaining(['64-17-5', '67-64-1']));
  });
});
