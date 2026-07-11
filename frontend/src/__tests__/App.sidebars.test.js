import { fireEvent, render, screen } from "@testing-library/react";
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
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
  });

  afterAll(() => {
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
});
