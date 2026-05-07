import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { PILOT_ADMIN_SESSION_KEY } from "@/constants/admin";
import {
  exportObservabilityReport,
  fetchObservabilityReport,
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
});
