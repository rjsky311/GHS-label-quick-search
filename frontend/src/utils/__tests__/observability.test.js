import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  exportObservabilityReport,
  fetchObservabilityReport,
  loadObservabilityEvents,
  MAX_OBSERVABILITY_META_ARRAY_ITEMS,
  MAX_OBSERVABILITY_STRING_LENGTH,
  recordObservabilityEvent,
  clearObservabilityEvents,
} from "../observability";

jest.mock("axios");
jest.mock("file-saver", () => ({
  saveAs: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

describe("observability admin report", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    clearObservabilityEvents();
  });

  it("fetches the backend report with the active admin key", async () => {
    axios.get.mockResolvedValue({ data: { counters: { ok: 1 } } });

    await expect(fetchObservabilityReport("secret")).resolves.toEqual({
      counters: { ok: 1 },
    });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ops\/report$/),
      {
        headers: { "x-ghs-admin-key": "secret" },
      }
    );
  });

  it("exports backend data instead of falling back when admin is unlocked", async () => {
    axios.get.mockResolvedValue({ data: { counters: { ok: 1 } } });

    const report = await exportObservabilityReport({
      format: "json",
      adminKey: "secret",
    });

    expect(report.backend).toEqual({ counters: { ok: 1 } });
    expect(report.backendError).toBeNull();
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ops\/report$/),
      {
        headers: { "x-ghs-admin-key": "secret" },
      }
    );
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Observability report exported.");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("keeps bounded frontend event metadata in memory and forwards it to the backend", () => {
    const event = recordObservabilityEvent("batch_input_normalized", {
      query: "Acetone",
      meta: {
        acceptedCount: 2,
        sentCasPreview: Array.from({ length: 40 }, (_, index) => `${index}-00-0`),
        rawInvalidPayload: "y".repeat(MAX_OBSERVABILITY_STRING_LENGTH + 20),
        nested: { raw: "z".repeat(MAX_OBSERVABILITY_STRING_LENGTH + 20) },
        ignored: undefined,
      },
    });

    expect(event.query).toBe("");
    expect(event.meta.acceptedCount).toBe(2);
    expect(event.meta.sentCasPreview).toHaveLength(
      MAX_OBSERVABILITY_META_ARRAY_ITEMS
    );
    expect(event.meta.rawInvalidPayload).toHaveLength(
      MAX_OBSERVABILITY_STRING_LENGTH
    );
    expect(event.meta.nested).toHaveLength(MAX_OBSERVABILITY_STRING_LENGTH);
    expect(event.meta).not.toHaveProperty("ignored");
    expect(loadObservabilityEvents()).toEqual([event]);
    expect(localStorage.length).toBe(0);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/telemetry$/),
      expect.objectContaining({
        id: event.id,
        type: event.type,
        source: event.source,
        query: null,
      }),
      { timeout: 3000 }
    );
  });
});
