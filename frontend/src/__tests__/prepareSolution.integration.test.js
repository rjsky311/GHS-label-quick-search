/**
 * App-level integration tests for v1.9 M3 Tier 1 PR-A.
 *
 * Pins the behaviour that component-level tests cannot verify on
 * their own:
 *
 *   1. Submit path: DetailModal → PrepareSolutionModal → fill form →
 *      submit closes both modals, opens LabelPrintModal, puts exactly
 *      ONE prepared item into the selection.
 *
 *   2. Quantity reset: if the parent's CAS had a stale quantity in
 *      `labelQuantities` (e.g. the user was mid-way through a normal
 *      print session before starting a prepare flow), the prepared
 *      item must NOT inherit that count. It starts at 1.
 *
 *   3. Cancel cleanup: if the user submits a prepared item, lands in
 *      LabelPrintModal, then CANCELS (closes the label modal without
 *      printing), the prepared item must be wiped from
 *      `selectedForLabel` so ResultsTable rows don't show a ghost
 *      "selected" state just because the parent's CAS matches.
 *
 *   4. Non-prepared close path is untouched: closing LabelPrintModal
 *      from a normal (non-prepared) selection does NOT wipe the
 *      selection.
 *
 * Reuses the same axios/sonner/printLabels mocking pattern as
 * `printAllWithGhs.integration.test.js`.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import App from "@/App";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock("@/utils/printLabels", () => ({
  printLabels: jest.fn(),
  getQRCodeUrl: jest.fn(() => "http://qr.test"),
}));

jest.mock("@/utils/sdsLinks", () => ({
  getPubChemSDSUrl: jest.fn(() => "http://sds.test"),
  getECHASearchUrl: jest.fn(() => "http://echa.test"),
}));

jest.mock("@/components/GHSImage", () => (props) => (
  <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>
));

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

async function runBatchSearch({ casInputs, mockResponses }) {
  axios.post.mockImplementation(async (url) => {
    if (url.endsWith("/api/search")) {
      return { data: mockResponses };
    }
    return { data: {} };
  });
  axios.get.mockImplementation(async () => ({ data: { results: [] } }));

  const batchTab = screen.getByTestId("batch-search-tab");
  await act(async () => fireEvent.click(batchTab));

  const textarea = screen.getByTestId("batch-cas-input");
  await act(async () =>
    fireEvent.change(textarea, { target: { value: casInputs.join("\n") } })
  );

  const submit = screen.getByTestId("batch-search-btn");
  await act(async () => fireEvent.click(submit));

  await waitFor(() =>
    expect(screen.getByText("results.title")).toBeInTheDocument()
  );
}

const ethanolResult = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02", name_zh: "易燃" }],
  hazard_statements: [{ code: "H225", text_zh: "高度易燃液體和蒸氣" }],
  precautionary_statements: [],
  signal_word: "Danger",
  signal_word_zh: "危險",
  other_classifications: [],
};

async function enterPrepareFlowFor(result) {
  // Open detail for the given result.
  const detailBtn = screen.getAllByTestId(/^detail-btn-/)[0];
  await act(async () => fireEvent.click(detailBtn));
  await waitFor(() =>
    expect(screen.getByText("detail.prepareSolution")).toBeInTheDocument()
  );
  // Click Prepare solution.
  await act(async () =>
    fireEvent.click(screen.getByTestId("prepare-solution-btn"))
  );
  await waitFor(() =>
    expect(screen.getByTestId("prepare-solution-modal")).toBeInTheDocument()
  );
}

async function submitPreparedForm({ concentration, solvent }) {
  await act(async () =>
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: concentration },
    })
  );
  await act(async () =>
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: solvent },
    })
  );
  await act(async () =>
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"))
  );
}

describe("v1.9 M3 Tier 1 PR-A — prepare-solution flow (App integration)", () => {
  it("submit opens LabelPrintModal with exactly one prepared item", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);
    await submitPreparedForm({ concentration: "10% (v/v)", solvent: "Water" });

    // LabelPrintModal opened
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    // PrepareSolutionModal is gone
    expect(
      screen.queryByTestId("prepare-solution-modal")
    ).not.toBeInTheDocument();
    // DetailModal is gone (both header modals closed on submit)
    expect(
      screen.queryByText("detail.prepareSolution")
    ).not.toBeInTheDocument();

    // Exactly one selected chemical in the label modal, marked prepared
    const dialog = screen.getByRole("dialog", { name: /label\.title/i });
    const casSpans = dialog.querySelectorAll(
      "span.font-mono.text-amber-400.text-sm"
    );
    expect(casSpans).toHaveLength(1);
    expect(casSpans[0].textContent).toBe("64-17-5");
    // Prepared marker visible in the selection row
    expect(
      screen.getByTestId(`selected-prepared-${ethanolResult.cas_number}`)
    ).toBeInTheDocument();
  });

  it("prepared item's quantity starts at 1 — does NOT inherit a stale parent quantity", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });

    // Simulate the user having already set up a normal print session
    // with the parent chemical at quantity=5. We do this via the
    // public purple Print-label button's auto-select-all flow, then
    // manually bump quantity.
    await act(async () =>
      fireEvent.click(screen.getByTestId("print-label-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    // Bump Ethanol's quantity to 5 inside the modal.
    const plusBtn = screen.getByText("+");
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => fireEvent.click(plusBtn));
    }
    // Close the label modal (no cancel cleanup triggers because
    // selection is non-prepared).
    const closeBtn = screen.getAllByRole("button").find((b) =>
      b.querySelector('svg[class*="lucide-x"]')
    );
    // Simpler: press Escape to close.
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    await waitFor(() =>
      expect(screen.queryAllByText("label.title").length).toBe(0)
    );

    // Now enter prepare flow and submit.
    await enterPrepareFlowFor(ethanolResult);
    await submitPreparedForm({ concentration: "0.1 N", solvent: "Water" });

    // LabelPrintModal reopens with prepared item; quantity must be 1.
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    const dialog = screen.getByRole("dialog", { name: /label\.title/i });
    // The quantity span is `<span class="w-6 text-center text-sm text-white">{n}</span>`.
    const qtySpans = dialog.querySelectorAll(
      "span.w-6.text-center.text-sm.text-white"
    );
    expect(qtySpans).toHaveLength(1);
    expect(qtySpans[0].textContent).toBe("1");
  });

  it("cancelling LabelPrintModal (closing without printing) wipes the prepared item from selection", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);
    await submitPreparedForm({ concentration: "10%", solvent: "Water" });

    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    // Close via Escape (equivalent to cancel / backdrop close in our lifecycle).
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    await waitFor(() =>
      expect(screen.queryAllByText("label.title").length).toBe(0)
    );

    // If selection had been left non-empty, the purple Print-label
    // button would show a count badge with the prepared item's CAS.
    // Verify no such badge / no prepared testid exists in the page.
    expect(
      screen.queryByTestId(`selected-prepared-${ethanolResult.cas_number}`)
    ).not.toBeInTheDocument();

    // And reopening LabelPrintModal shows nothing selected / or the
    // auto-select-all-found fallback — but not the ghost prepared item.
    await act(async () =>
      fireEvent.click(screen.getByTestId("print-label-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    // No `selected-prepared-*` testid anywhere (the prepared identity
    // is gone; the parent row might be auto-selected by the purple
    // button's fallback, but it's a normal chemical, not a prepared item).
    expect(screen.queryAllByTestId(/^selected-prepared-/)).toHaveLength(0);
  });

  it("closing LabelPrintModal from a NORMAL (non-prepared) selection does NOT wipe the selection", async () => {
    // This pins the other half of the cleanup logic: the ghost-cleanup
    // branch only fires when selection contains a prepared item.
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    // Open label modal via normal (non-prepared) path.
    await act(async () =>
      fireEvent.click(screen.getByTestId("print-label-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    // Close via Escape.
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    await waitFor(() =>
      expect(screen.queryAllByText("label.title").length).toBe(0)
    );
    // Reopen and confirm the normal Ethanol row is still selected
    // (the purple button's fallback keeps it).
    await act(async () =>
      fireEvent.click(screen.getByTestId("print-label-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    const dialog = screen.getByRole("dialog", { name: /label\.title/i });
    const casSpans = dialog.querySelectorAll(
      "span.font-mono.text-amber-400.text-sm"
    );
    expect(casSpans.length).toBeGreaterThanOrEqual(1);
    // No prepared marker
    expect(screen.queryAllByTestId(/^selected-prepared-/)).toHaveLength(0);
  });

  it("cancel PrepareSolutionModal without submitting leaves selection untouched", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);
    // Cancel the prepare-solution modal without filling the form.
    await act(async () =>
      fireEvent.click(screen.getByTestId("prepare-solution-cancel-btn"))
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("prepare-solution-modal")
      ).not.toBeInTheDocument()
    );
    // LabelPrintModal must NOT have opened.
    expect(screen.queryAllByText("label.title")).toHaveLength(0);
    // No prepared markers anywhere.
    expect(screen.queryAllByTestId(/^selected-prepared-/)).toHaveLength(0);
  });

  // Regression: Escape in PrepareSolutionModal must close ONLY that modal,
  // not also the underlying DetailModal. Both modals register window-
  // level Escape listeners; without capture-phase + stopImmediatePropagation
  // in PrepareSolutionModal, a single Esc would close both — diverging
  // from the pointer-driven Cancel / backdrop / X path (which only closes
  // the prepare modal). Pins keyboard-vs-pointer parity.
  it("Escape in PrepareSolutionModal closes ONLY that modal — DetailModal stays open", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);

    // Press Escape while prepare modal is on top.
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));

    // Prepare modal gone.
    await waitFor(() =>
      expect(
        screen.queryByTestId("prepare-solution-modal")
      ).not.toBeInTheDocument()
    );
    // DetailModal still present — its "Prepare solution" button lives
    // only inside DetailModal, so finding it proves DetailModal is
    // still mounted. Cancel/backdrop path would behave the same; this
    // test pins that Escape now matches.
    expect(screen.getByTestId("prepare-solution-btn")).toBeInTheDocument();
    // LabelPrintModal must NOT have opened (cancel path, not submit).
    expect(screen.queryAllByText("label.title")).toHaveLength(0);
  });

  // Regression: cleanup must fire even if the user manually removed the
  // prepared item from the selected list BEFORE closing LabelPrintModal.
  // Gating cleanup on `selectionHasPreparedItem(selectedForLabel)` would
  // miss this path (selection no longer has a prepared item at close
  // time) and leak `labelQuantities[parentCas]` into the next normal
  // print flow for the same parent chemical.
  it("removing prepared item then closing LabelPrintModal does NOT leak labelQuantities to the normal parent flow", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);
    await submitPreparedForm({ concentration: "10%", solvent: "Water" });

    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );

    // Bump prepared item quantity to 5. The single `+` inside the
    // dialog belongs to the prepared row.
    const plusBtn = screen.getByText("+");
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => fireEvent.click(plusBtn));
    }

    // Manually remove the prepared item via its per-row X (not the
    // modal-header X). That button lives inside the testid'd row and
    // carries the `hover:text-red-400` class — find it relative to
    // the row.
    const preparedRow = screen.getByTestId(
      `selected-prepared-${ethanolResult.cas_number}`
    );
    const removeBtn = preparedRow.querySelector(
      'button[class*="hover:text-red-400"]'
    );
    expect(removeBtn).not.toBeNull();
    await act(async () => fireEvent.click(removeBtn));

    // Selection is now empty BUT the prepared-flow session is still
    // active. Close the modal via Escape.
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    await waitFor(() =>
      expect(screen.queryAllByText("label.title").length).toBe(0)
    );

    // Reopen via the normal purple Print-label path (auto-select-all
    // found rows). The parent Ethanol row auto-selects; its quantity
    // MUST be 1, not the 5 we set during the prepared flow.
    await act(async () =>
      fireEvent.click(screen.getByTestId("print-label-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    const dialog = screen.getByRole("dialog", { name: /label\.title/i });
    const qtySpans = dialog.querySelectorAll(
      "span.w-6.text-center.text-sm.text-white"
    );
    expect(qtySpans).toHaveLength(1);
    expect(qtySpans[0].textContent).toBe("1");
    // And no prepared marker — we're in a pure normal flow now.
    expect(screen.queryAllByTestId(/^selected-prepared-/)).toHaveLength(0);
  });

  // Tier 2 PR-1: operational metadata ends up on the prepared item
  // and is surfaced in LabelPrintModal. The form fields are optional —
  // filling them in must not perturb the Tier 1 submit path (selection,
  // quantity reset, modal lifecycle) in any way.
  it("operational metadata from the form flows into LabelPrintModal's selected-row meta", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });
    await enterPrepareFlowFor(ethanolResult);

    // Fill required + optional operational fields together.
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
        target: { value: "10%" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
        target: { value: "Water" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-prepared-by-input"), {
        target: { value: "A. Chen" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-prepared-date-input"), {
        target: { value: "2026-04-16" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-expiry-date-input"), {
        target: { value: "2026-10-16" },
      })
    );
    await act(async () =>
      fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"))
    );

    // LabelPrintModal opened with the prepared item — Tier 1 markers
    // still present, plus the new operational row.
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    expect(
      screen.getByTestId(`selected-prepared-${ethanolResult.cas_number}`)
    ).toBeInTheDocument();
    const opRow = screen.getByTestId(
      `selected-prepared-operational-${ethanolResult.cas_number}`
    );
    expect(opRow).toBeInTheDocument();
    expect(opRow.textContent).toContain("A. Chen");
    expect(opRow.textContent).toContain("2026-04-16");
    expect(opRow.textContent).toContain("2026-10-16");
  });

  // Tier 2 PR-2A: submitting a prepared flow writes a recent entry,
  // and reopening the same parent's modal later surfaces it. This pins
  // the end-to-end "write + read + prefill" loop across a full App
  // instance, including the localStorage hop.
  it("submit writes to recent-prepared store; reopening same parent surfaces it and prefill fills the form", async () => {
    render(<App />);
    await runBatchSearch({
      casInputs: ["64-17-5"],
      mockResponses: [ethanolResult],
    });

    // First pass: full prepare flow with operational fields.
    await enterPrepareFlowFor(ethanolResult);
    // First time, no recents — section must not render.
    expect(
      screen.queryByTestId("prepare-solution-recent-section")
    ).not.toBeInTheDocument();
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
        target: { value: "10%" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
        target: { value: "Water" },
      })
    );
    await act(async () =>
      fireEvent.change(screen.getByTestId("prepared-prepared-by-input"), {
        target: { value: "A. Chen" },
      })
    );
    await act(async () =>
      fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"))
    );

    // LabelPrintModal opened — we don't need to print. Close it to
    // let the prepared-flow cleanup run and take us back to the
    // base app state.
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    await waitFor(() =>
      expect(screen.queryAllByText("label.title").length).toBe(0)
    );

    // Second pass: reopen the same parent's prepare modal. The recent
    // from the first submit must be visible AND parent-scoped.
    await enterPrepareFlowFor(ethanolResult);
    const recentSection = await screen.findByTestId(
      "prepare-solution-recent-section"
    );
    expect(recentSection).toBeInTheDocument();
    const recentItem = screen.getByTestId("prepare-solution-recent-item-0");
    expect(recentItem.textContent).toContain("A. Chen");

    // Click the recent → form fields prefill from the stored workflow
    // inputs, but submit does NOT auto-fire.
    await act(async () => fireEvent.click(recentItem));
    expect(screen.getByTestId("prepared-concentration-input")).toHaveValue("10%");
    expect(screen.getByTestId("prepared-solvent-input")).toHaveValue("Water");
    expect(screen.getByTestId("prepared-prepared-by-input")).toHaveValue(
      "A. Chen"
    );
    // LabelPrintModal must not have opened yet — prefill is not submit.
    expect(screen.queryAllByText("label.title")).toHaveLength(0);

    // Now submit the prefilled form — the existing lifecycle still runs
    // (selection gets the prepared item, quantity resets to 1).
    await act(async () =>
      fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"))
    );
    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );
    expect(
      screen.getByTestId(`selected-prepared-${ethanolResult.cas_number}`)
    ).toBeInTheDocument();
  });
});
