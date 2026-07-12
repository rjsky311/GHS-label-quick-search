import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

const originalPilotAdminFlag = globalThis.__APP_PILOT_ADMIN_ENABLED__;
globalThis.__APP_PILOT_ADMIN_ENABLED__ = true;

const App = require("@/App").default;
const { toast } = require("sonner");

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

const preparedRecent = {
  schemaVersion: 1,
  createdAt: "2026-04-16T10:00:00.000Z",
  parentCas: "64-17-5",
  parentNameEn: "Ethanol",
  parentNameZh: "乙醇",
  concentration: "10%",
  solvent: "Water",
  preparedBy: "A. Chen",
  preparedDate: "2026-04-16",
  expiryDate: null,
};

const preparedParent = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02", name_zh: "易燃" }],
  hazard_statements: [{ code: "H225", text_en: "Highly flammable." }],
  precautionary_statements: [],
  signal_word: "Danger",
  other_classifications: [],
};

function seedPreparedRecent() {
  window.localStorage.setItem(
    "ghs_prepared_recents",
    JSON.stringify([preparedRecent]),
  );
}

async function startPreparedReprint(lookup) {
  axios.get.mockImplementation((url) =>
    url.endsWith("/api/search-single")
      ? lookup.promise
      : Promise.resolve({ data: {} }),
  );

  render(<App />);
  fireEvent.click(screen.getByTestId("prepared-toggle-btn"));
  await expectOnlyModalDialog("prepared.sidebarTitle");
  fireEvent.click(screen.getByTestId("prepared-reprint-btn-0"));
  await waitFor(() =>
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/search-single$/),
      expect.objectContaining({ params: { q: "64-17-5" } }),
    ),
  );
}

async function startPilotRequest(request) {
  window.sessionStorage.setItem("ghs.pilotAdminKey", "pilot-secret");
  axios.get.mockImplementation((url) =>
    url.includes("/api/ops/") || url.includes("/api/dictionary/")
      ? request.promise
      : Promise.resolve({ data: {} }),
  );

  render(<App />);
  fireEvent.click(screen.getByTestId("pilot-dashboard-toggle-btn"));
  await expectOnlyModalDialog("pilot.sidebarTitle");
  await waitFor(() =>
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ops\/report$/),
      expect.any(Object),
    ),
  );
}

const modalDialogs = () =>
  screen
    .getAllByRole("dialog")
    .filter((dialog) => dialog.getAttribute("aria-modal") === "true");

async function expectOnlyModalDialog(name) {
  const dialog = await screen.findByRole("dialog", { name });

  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(modalDialogs()).toEqual([dialog]);

  return dialog;
}

describe("App sidebar ownership", () => {
  let requestAnimationFrameSpy;
  let scrollToSpy;

  beforeAll(() => {
    scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
    requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 0;
      });
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
  });

  afterAll(() => {
    requestAnimationFrameSpy.mockRestore();
    scrollToSpy.mockRestore();
    if (typeof originalPilotAdminFlag === "boolean") {
      globalThis.__APP_PILOT_ADMIN_ENABLED__ = originalPilotAdminFlag;
    } else {
      delete globalThis.__APP_PILOT_ADMIN_ENABLED__;
    }
  });

  it("atomically replaces public sidebars with the most recently requested sidebar", async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    await expectOnlyModalDialog("favorites.title");

    fireEvent.click(screen.getByTestId("history-toggle-btn"));
    await expectOnlyModalDialog("history.title");

    fireEvent.click(screen.getByTestId("prepared-toggle-btn"));
    await expectOnlyModalDialog("prepared.sidebarTitle");
  });

  it("lets an unlocked Pilot dashboard replace an open public sidebar", async () => {
    window.sessionStorage.setItem("ghs.pilotAdminKey", "pilot-secret");
    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    await expectOnlyModalDialog("favorites.title");

    fireEvent.click(screen.getByTestId("pilot-dashboard-toggle-btn"));
    await expectOnlyModalDialog("pilot.sidebarTitle");
    expect(screen.queryByTestId("pilot-admin-dialog")).not.toBeInTheDocument();
  });

  it("closes an open sidebar before requesting locked Pilot access", async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("history-toggle-btn"));
    await expectOnlyModalDialog("history.title");

    fireEvent.click(screen.getByTestId("pilot-dashboard-toggle-btn"));
    await expectOnlyModalDialog("pilot.adminAccessTitle");
    expect(screen.getByTestId("pilot-admin-dialog")).toBeInTheDocument();
  });

  it("keeps a replacement sidebar when an older Prepared reprint resolves", async () => {
    seedPreparedRecent();
    const lookup = deferred();
    await startPreparedReprint(lookup);

    fireEvent.click(screen.getByTestId("history-toggle-btn"));
    await expectOnlyModalDialog("history.title");

    await act(async () => {
      lookup.resolve({ data: preparedParent });
      await lookup.promise;
    });

    await expectOnlyModalDialog("history.title");
    expect(screen.queryByTestId("label-modal-panel")).not.toBeInTheDocument();
  });

  it("does not reopen print when a Prepared reprint resolves after home reset", async () => {
    seedPreparedRecent();
    const lookup = deferred();
    await startPreparedReprint(lookup);

    fireEvent.click(screen.getByTestId("header-home-link"));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "prepared.sidebarTitle" }),
      ).not.toBeInTheDocument(),
    );

    await act(async () => {
      lookup.resolve({ data: preparedParent });
      await lookup.promise;
    });

    expect(screen.queryByTestId("label-modal-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("suppresses a stale Prepared reprint failure after sidebar replacement", async () => {
    seedPreparedRecent();
    const lookup = deferred();
    await startPreparedReprint(lookup);

    fireEvent.click(screen.getByTestId("history-toggle-btn"));
    await expectOnlyModalDialog("history.title");

    await act(async () => {
      lookup.reject(new Error("upstream unavailable"));
      await lookup.promise.catch(() => {});
    });

    await expectOnlyModalDialog("history.title");
    expect(toast.error).not.toHaveBeenCalledWith("prepared.reprintFailed");
  });

  it.each([401, 403, 503])(
    "ignores a stale Pilot %s response after a public sidebar takes ownership",
    async (status) => {
      const request = deferred();
      await startPilotRequest(request);

      fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
      await expectOnlyModalDialog("favorites.title");

      await act(async () => {
        request.reject({
          response: {
            status,
            data: { detail: `stale Pilot ${status}` },
          },
        });
        await request.promise.catch(() => {});
      });

      await expectOnlyModalDialog("favorites.title");
      expect(screen.queryByTestId("pilot-admin-dialog")).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem("ghs.pilotAdminKey")).toBe(
        "pilot-secret",
      );
    },
  );

  it("handles a current Pilot auth failure as the sole modal owner", async () => {
    const request = deferred();
    await startPilotRequest(request);

    await act(async () => {
      request.reject({
        response: {
          status: 401,
          data: { detail: "Pilot key expired" },
        },
      });
      await request.promise.catch(() => {});
    });

    await expectOnlyModalDialog("pilot.adminAccessTitle");
    expect(window.sessionStorage.getItem("ghs.pilotAdminKey")).toBeNull();
  });

  it("restores focus to the opener after Escape closes a sidebar", async () => {
    render(<App />);
    const favoritesToggle = screen.getByTestId("favorites-toggle-btn");
    favoritesToggle.focus();

    fireEvent.click(favoritesToggle);
    await expectOnlyModalDialog("favorites.title");
    expect(favoritesToggle).not.toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "favorites.title" }),
      ).not.toBeInTheDocument(),
    );
    expect(favoritesToggle).toHaveFocus();
  });
});
