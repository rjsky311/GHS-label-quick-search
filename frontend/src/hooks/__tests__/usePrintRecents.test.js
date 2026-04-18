import { act, renderHook, waitFor } from "@testing-library/react";
import usePrintRecents, { MAX_RECENT_PRINTS } from "../usePrintRecents";
import { buildPrintJobRecord } from "@/utils/printStorage";
import {
  fetchWorkspaceDocument,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";

jest.mock("@/utils/workspaceDocuments", () => {
  const actual = jest.requireActual("@/utils/workspaceDocuments");
  return {
    ...actual,
    fetchWorkspaceDocument: jest.fn(),
    saveWorkspaceDocument: jest.fn(),
  };
});

const RECENT_PRINTS_KEY = "ghs_recent_print_jobs";

function makeRecentJob(overrides = {}) {
  return buildPrintJobRecord({
    items: [
      {
        cas_number: "64-17-5",
        name_en: "Ethanol",
        name_zh: "Ethanol",
        cid: 702,
        found: true,
        signal_word: "Warning",
        signal_word_zh: "Warning",
        ghs_pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
      },
    ],
    labelConfig: {
      template: "standard",
      size: "medium",
      orientation: "portrait",
      nameDisplay: "both",
      colorMode: "color",
    },
    customLabelFields: {
      date: "2026-04-18",
      batchNumber: "B-1",
      ...(overrides.customLabelFields || {}),
    },
    labelQuantities: {
      "64-17-5": 1,
      ...(overrides.labelQuantities || {}),
    },
    labProfile: {
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
      ...(overrides.labProfile || {}),
    },
  });
}

describe("usePrintRecents", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    fetchWorkspaceDocument.mockResolvedValue({ payload: null });
    saveWorkspaceDocument.mockResolvedValue({ ok: true });
  });

  it("starts empty when there is no local or remote state", () => {
    const { result } = renderHook(() => usePrintRecents());
    expect(result.current.recentPrints).toEqual([]);
  });

  it("hydrates from localStorage on mount", () => {
    const saved = [makeRecentJob()];
    localStorage.setItem(RECENT_PRINTS_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => usePrintRecents());

    expect(result.current.recentPrints).toHaveLength(1);
    expect(result.current.recentPrints[0].items[0].cas_number).toBe("64-17-5");
  });

  it("syncs a local snapshot to the backend when remote state is empty", async () => {
    const saved = [makeRecentJob()];
    localStorage.setItem(RECENT_PRINTS_KEY, JSON.stringify(saved));

    renderHook(() => usePrintRecents());

    await waitFor(() => {
      expect(saveWorkspaceDocument).toHaveBeenCalledWith("print_recents", saved);
    });
  });

  it("addRecentPrint prepends, dedupes, caps, and persists", async () => {
    const { result } = renderHook(() => usePrintRecents());

    act(() => {
      for (let i = 0; i < MAX_RECENT_PRINTS + 2; i += 1) {
        result.current.addRecentPrint({
          items: [
            {
              cas_number: `64-17-${i}`,
              name_en: `Chem ${i}`,
              name_zh: `Chem ${i}`,
              found: true,
              signal_word: "Warning",
              signal_word_zh: "Warning",
              ghs_pictograms: [],
              hazard_statements: [],
              precautionary_statements: [],
            },
          ],
          labelConfig: {
            template: "standard",
            size: "medium",
            orientation: "portrait",
            nameDisplay: "both",
            colorMode: "color",
          },
          customLabelFields: {
            date: `2026-04-${String(i + 1).padStart(2, "0")}`,
            batchNumber: `B-${i}`,
          },
          labelQuantities: {
            [`64-17-${i}`]: 1,
          },
          labProfile: {
            organization: "Materials Lab",
            phone: "",
            address: "",
          },
        });
      }
    });

    expect(result.current.recentPrints).toHaveLength(MAX_RECENT_PRINTS);
    expect(JSON.parse(localStorage.getItem(RECENT_PRINTS_KEY))).toHaveLength(
      MAX_RECENT_PRINTS
    );
    await waitFor(() => {
      expect(saveWorkspaceDocument).toHaveBeenLastCalledWith(
        "print_recents",
        expect.any(Array)
      );
    });
  });

  it("clearRecentPrints empties local and backend state", async () => {
    localStorage.setItem(RECENT_PRINTS_KEY, JSON.stringify([makeRecentJob()]));
    const { result } = renderHook(() => usePrintRecents());

    act(() => {
      result.current.clearRecentPrints();
    });

    expect(result.current.recentPrints).toEqual([]);
    expect(JSON.parse(localStorage.getItem(RECENT_PRINTS_KEY))).toEqual([]);
    await waitFor(() => {
      expect(saveWorkspaceDocument).toHaveBeenLastCalledWith("print_recents", []);
    });
  });
});
