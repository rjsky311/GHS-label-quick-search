import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { PILOT_ADMIN_SESSION_KEY } from "@/constants/admin";
import {
  exportObservabilityReport,
  fetchObservabilityReport,
  loadObservabilityEvents,
  MAX_OBSERVABILITY_META_ARRAY_ITEMS,
  MAX_OBSERVABILITY_STRING_LENGTH,
  OBSERVABILITY_STORAGE_KEY,
  recordObservabilityEvent,
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
  });

  it("fetches the backend report with the active admin key", async () => {
    sessionStorage.setItem(PILOT_ADMIN_SESSION_KEY, "secret");
    axios.get.mockResolvedValue({ data: { counters: { ok: 1 } } });

    await expect(fetchObservabilityReport()).resolves.toEqual({
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
    sessionStorage.setItem(PILOT_ADMIN_SESSION_KEY, "secret");
    axios.get.mockResolvedValue({ data: { counters: { ok: 1 } } });

    const report = await exportObservabilityReport({ format: "json" });

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

  it("stores bounded frontend event metadata", () => {
    const event = recordObservabilityEvent("batch_input_normalized", {
      query: "  ".concat("x".repeat(MAX_OBSERVABILITY_STRING_LENGTH + 20)),
      meta: {
        acceptedCount: 2,
        sentCasPreview: Array.from({ length: 40 }, (_, index) => `${index}-00-0`),
        rawInvalidPayload: "y".repeat(MAX_OBSERVABILITY_STRING_LENGTH + 20),
        nested: { raw: "z".repeat(MAX_OBSERVABILITY_STRING_LENGTH + 20) },
        ignored: undefined,
      },
    });

    expect(event.query).toHaveLength(MAX_OBSERVABILITY_STRING_LENGTH);
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
    expect(JSON.parse(localStorage.getItem(OBSERVABILITY_STORAGE_KEY))).toEqual([
      event,
    ]);
  });
});
