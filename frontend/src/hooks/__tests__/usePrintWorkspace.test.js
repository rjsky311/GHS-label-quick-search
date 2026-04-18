import { act, renderHook, waitFor } from "@testing-library/react";
import usePrintWorkspace, { CUSTOM_FIELDS_KEY } from "../usePrintWorkspace";
import { buildPrintJobRecord } from "@/utils/printStorage";
import {
  fetchWorkspaceDocument,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";

const mockPersistTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();
const mockSetLabProfile = jest.fn();
const mockClearLabProfile = jest.fn();
const mockAddRecentPrint = jest.fn();
const mockClearRecentPrints = jest.fn();

jest.mock("../usePrintTemplates", () =>
  jest.fn(() => ({
    templates: [],
    saveTemplate: mockPersistTemplate,
    deleteTemplate: mockDeleteTemplate,
  }))
);

jest.mock("../useLabProfile", () =>
  jest.fn(() => ({
    labProfile: {
      organization: "",
      phone: "",
      address: "",
    },
    setLabProfile: mockSetLabProfile,
    clearLabProfile: mockClearLabProfile,
  }))
);

jest.mock("../usePrintRecents", () =>
  jest.fn(() => ({
    recentPrints: [],
    addRecentPrint: mockAddRecentPrint,
    clearRecentPrints: mockClearRecentPrints,
  }))
);

jest.mock("@/utils/workspaceDocuments", () => {
  const actual = jest.requireActual("@/utils/workspaceDocuments");
  return {
    ...actual,
    fetchWorkspaceDocument: jest.fn(),
    saveWorkspaceDocument: jest.fn(),
  };
});

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
      "64-17-5": 3,
    },
    labProfile: {
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
    },
  });
}

describe("usePrintWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    fetchWorkspaceDocument.mockResolvedValue({ payload: null });
    saveWorkspaceDocument.mockResolvedValue({ ok: true });
  });

  it("hydrates custom label fields from localStorage", () => {
    localStorage.setItem(
      CUSTOM_FIELDS_KEY,
      JSON.stringify({
        labName: "Legacy Lab",
        date: "2026-04-18",
        batchNumber: "B-7",
      })
    );

    const { result } = renderHook(() => usePrintWorkspace());

    expect(result.current.customLabelFields).toEqual({
      labName: "Legacy Lab",
      date: "2026-04-18",
      batchNumber: "B-7",
    });
  });

  it("hydrates from backend when remote custom label fields exist", async () => {
    fetchWorkspaceDocument.mockResolvedValue({
      payload: {
        date: "2026-05-01",
        batchNumber: "REMOTE-1",
      },
    });

    const { result } = renderHook(() => usePrintWorkspace());

    await waitFor(() => {
      expect(result.current.customLabelFields).toEqual({
        labName: "",
        date: "2026-05-01",
        batchNumber: "REMOTE-1",
      });
    });
    expect(JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY))).toEqual({
      labName: "",
      date: "2026-05-01",
      batchNumber: "REMOTE-1",
    });
  });

  it("setCustomLabelFields persists locally and syncs to backend", async () => {
    const { result } = renderHook(() => usePrintWorkspace());

    act(() => {
      result.current.setCustomLabelFields({
        date: "2026-04-18",
        batchNumber: "B-9",
      });
    });

    expect(result.current.customLabelFields).toEqual({
      labName: "",
      date: "2026-04-18",
      batchNumber: "B-9",
    });
    expect(JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY))).toEqual({
      labName: "",
      date: "2026-04-18",
      batchNumber: "B-9",
    });
    await waitFor(() => {
      expect(saveWorkspaceDocument).toHaveBeenCalledWith(
        "print_custom_label_fields",
        {
          labName: "",
          date: "2026-04-18",
          batchNumber: "B-9",
        }
      );
    });
  });

  it("loadRecentPrint applies workspace state and returns the recent job items", () => {
    const { result } = renderHook(() => usePrintWorkspace());
    const record = makeRecentJob();

    let items;
    act(() => {
      items = result.current.loadRecentPrint(record);
    });

    expect(items).toHaveLength(1);
    expect(items[0].cas_number).toBe("64-17-5");
    expect(result.current.customLabelFields.batchNumber).toBe("B-1");
    expect(result.current.labelQuantities["64-17-5"]).toBe(3);
    expect(mockSetLabProfile).toHaveBeenCalledWith({
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
    });
  });
});
