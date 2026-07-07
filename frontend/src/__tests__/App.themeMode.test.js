import { fireEvent, render, screen } from "@testing-library/react";
import axios from "axios";
import App from "@/App";
import {
  THEME_MODE_STORAGE_KEY,
  THEME_MODES,
} from "@/utils/themeMode";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: ({ theme }) => (
    <div data-testid="sonner-toaster" data-theme={theme} />
  ),
}));

jest.mock("@/components/SearchSection", () => {
  return function MockSearchSection() {
    return <div data-testid="mock-search-section" />;
  };
});

describe("App theme mode shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: [] });
  });

  it("starts in Comfort Dim without a saved preference", () => {
    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-comfort-dim");
    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  it("mounts the shared material grain layer inside the themed app shell", () => {
    render(<App />);

    const shell = screen.getByTestId("app-shell");
    const grain = screen.getByTestId("notebook-grain");

    expect(shell).toContainElement(grain);
    expect(grain).toHaveClass("notebook-grain");
    expect(grain).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to Comfort Dim for an invalid saved preference", () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "warm-light");

    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-comfort-dim");
  });

  it("starts in Dark Bench from a saved preference", () => {
    window.localStorage.setItem(
      THEME_MODE_STORAGE_KEY,
      THEME_MODES.DARK_BENCH,
    );

    render(<App />);

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-dark-bench");
    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute(
      "data-theme",
      "dark",
    );
  });

  it("toggles and persists Dark Bench from the header", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("theme-toggle-btn"));

    expect(screen.getByTestId("app-shell")).toHaveClass("theme-dark-bench");
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.DARK_BENCH,
    );
  });
});
