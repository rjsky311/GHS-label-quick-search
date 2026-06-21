import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

jest.mock("@/components/SearchSection", () => {
  return function MockSearchSection({ onSearchSingle }) {
    return (
      <div data-testid="mock-search-section">
        <button type="button" data-testid="search-first" onClick={() => onSearchSingle("64-17-5")}>
          First
        </button>
        <button type="button" data-testid="search-second" onClick={() => onSearchSingle("67-56-1")}>
          Second
        </button>
      </div>
    );
  };
});

jest.mock("@/components/ResultsTable", () => {
  return function MockResultsTable({ results }) {
    return (
      <div data-testid="mock-results-table">
        {results.map((result) => (
          <span key={result.cas_number}>{result.name_en}</span>
        ))}
      </div>
    );
  };
});

const resultFor = (casNumber, nameEn) => ({
  cas_number: casNumber,
  cid: 1,
  name_en: nameEn,
  name_zh: "",
  found: true,
  ghs_pictograms: [{ code: "GHS07" }],
  hazard_statements: [{ code: "H315", text_en: "Causes skin irritation." }],
  precautionary_statements: [],
  signal_word: "Warning",
});

describe("App single-search request ordering", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: [] });
  });

  it("keeps the newest single-search response when an older request resolves later", async () => {
    let resolveFirst;
    let resolveSecond;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    axios.get
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => secondResponse);

    render(<App />);

    fireEvent.click(screen.getByTestId("search-first"));
    fireEvent.click(screen.getByTestId("search-second"));

    await act(async () => {
      resolveSecond({ data: resultFor("67-56-1", "Methanol") });
    });

    await waitFor(() => expect(screen.getByText("Methanol")).toBeInTheDocument());

    await act(async () => {
      resolveFirst({ data: resultFor("64-17-5", "Ethanol") });
    });

    expect(screen.getByText("Methanol")).toBeInTheDocument();
    expect(screen.queryByText("Ethanol")).not.toBeInTheDocument();
  });
});
