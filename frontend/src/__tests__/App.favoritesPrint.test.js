import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { toast } from "sonner";
import App from "@/App";
import useFavorites from "@/hooks/useFavorites";
import { buildPrintJobRecord } from "@/utils/printStorage";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock("@/hooks/useFavorites", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/components/SearchSection", () => {
  return function MockSearchSection({
    onSearchBatch,
    onSearchSingle,
    onSetBatchCas,
  }) {
    return (
      <div data-testid="mock-search-section">
        <button
          type="button"
          data-testid="search-second-favorite"
          onClick={() => onSearchSingle("67-56-1")}
        >
          search methanol
        </button>
        <input
          data-testid="batch-search-input"
          onChange={(event) => onSetBatchCas(event.target.value)}
        />
        <button
          type="button"
          data-testid="batch-search"
          onClick={onSearchBatch}
        >
          batch search
        </button>
      </div>
    );
  };
});

jest.mock("@/components/EmptyState", () => {
  return function MockEmptyState() {
    return <div data-testid="mock-empty-state" />;
  };
});

jest.mock("@/components/ResultsTable", () => {
  return function MockResultsTable({ onOpenLabelModal, results }) {
    return (
      <div data-testid="mock-results-table">
        {results.map((result) => (
          <span key={result.cas_number}>{result.name_en}</span>
        ))}
        <button
          type="button"
          data-testid="print-current-results"
          onClick={onOpenLabelModal}
        >
          print current results
        </button>
      </div>
    );
  };
});

jest.mock("@/components/FavoritesSidebar", () => {
  return function MockFavoritesSidebar({
    favorites,
    onClearFavorites,
    onClose,
    onPrintLabel,
    onToggleFavorite,
  }) {
    return (
      <div data-testid="mock-favorites-sidebar">
        <button type="button" data-testid="close-favorites" onClick={onClose}>
          close favorites
        </button>
        <button type="button" data-testid="clear-favorites" onClick={onClearFavorites}>
          clear favorites
        </button>
        {favorites.map((favorite) => (
          <div key={favorite.cas_number || favorite.name_en}>
            <button
              type="button"
              data-testid={`favorite-print-${favorite.cas_number || "missing-cas"}`}
              onClick={() => onPrintLabel(favorite)}
            >
              print {favorite.name_en}
            </button>
            <button
              type="button"
              data-testid={`favorite-remove-${favorite.cas_number || "missing-cas"}`}
              onClick={() => onToggleFavorite(favorite)}
            >
              remove {favorite.name_en}
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("@/components/LabelPrintModal", () => {
  return function MockLabelPrintModal({
    customGHSSettings,
    selectedForLabel,
    recentPrints = [],
    onLoadRecentPrint,
  }) {
    return (
      <div data-testid="mock-label-print-modal">
        {JSON.stringify({ customGHSSettings, selectedForLabel })}
        {recentPrints[0] && (
          <button
            type="button"
            data-testid="load-recent-print"
            onClick={() => onLoadRecentPrint(recentPrints[0])}
          >
            load recent
          </button>
        )}
      </div>
    );
  };
});

const reducedFavorite = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour." },
  ],
  signal_word: "Danger",
};

const secondReducedFavorite = {
  cas_number: "67-56-1",
  cid: 887,
  name_en: "Methanol",
  name_zh: "甲醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS06" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour." },
    { code: "H301", text_en: "Toxic if swallowed." },
  ],
  signal_word: "Danger",
};

const identityOnlyFavorite = {
  cas_number: "109-99-9",
  cid: 8028,
  name_en: "Tetrahydrofuran",
  name_zh: "四氫呋喃",
  found: true,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
  signal_word: null,
};

const missingCasFavorite = {
  cid: 9999,
  name_en: "Missing CAS",
  name_zh: "缺少 CAS",
  found: true,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
  signal_word: null,
};

const freshFullResult = {
  ...reducedFavorite,
  precautionary_statements: [
    {
      code: "P210",
      text_en:
        "Keep away from heat, hot surfaces, sparks, open flames and other ignition sources.",
    },
  ],
  provenance: { source: "pubchem-live" },
  retrieval: { fetched_at: "2026-06-21T00:00:00Z" },
  source: "PubChem",
};

const secondFreshFullResult = {
  ...secondReducedFavorite,
  precautionary_statements: [
    {
      code: "P301+P310",
      text_en:
        "IF SWALLOWED: Immediately call a POISON CENTER or doctor.",
    },
  ],
  provenance: { source: "pubchem-methanol-live" },
  retrieval: { fetched_at: "2026-06-21T00:01:00Z" },
  source: "PubChem",
};

const identityOnlyFreshFullResult = {
  ...identityOnlyFavorite,
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapour." },
  ],
  precautionary_statements: [
    {
      code: "P233",
      text_en: "Keep container tightly closed.",
    },
  ],
  signal_word: "Danger",
  provenance: { source: "pubchem-thf-live" },
  retrieval: { fetched_at: "2026-06-21T00:02:00Z" },
  source: "PubChem",
};

const refreshedNotFoundResult = {
  cas_number: "64-17-5",
  found: false,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
  signal_word: null,
};

const refreshedNoPrintableGhsResult = {
  ...reducedFavorite,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
  signal_word: null,
};

const alternateOnlyFreshResult = {
  cas_number: "75-07-0",
  cid: 177,
  name_en: "Acetaldehyde",
  name_zh: "乙醛",
  found: true,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
  signal_word: null,
  other_classifications: [
    {
      pictograms: [{ code: "GHS02" }],
      hazard_statements: [
        { code: "H224", text_en: "Extremely flammable liquid and vapour." },
      ],
      precautionary_statements: [
        { code: "P210", text_en: "Keep away from heat." },
      ],
      signal_word: "Danger",
      source: "manual-review",
    },
  ],
};

let mockFavorites;
let mockClearFavorites;
let mockToggleFavorite;

describe("App favorites print rehydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: [] });
    mockFavorites = [
      reducedFavorite,
      secondReducedFavorite,
      identityOnlyFavorite,
      missingCasFavorite,
    ];
    mockClearFavorites = jest.fn();
    mockToggleFavorite = jest.fn();
    useFavorites.mockImplementation(() => ({
      favorites: mockFavorites,
      toggleFavorite: mockToggleFavorite,
      isFavorited: jest.fn(() => true),
      clearFavorites: mockClearFavorites,
    }));
  });

  it("looks up the full chemical before opening the print modal from a reduced favorite", async () => {
    let resolveLookup;
    const lookupPromise = new Promise((resolve) => {
      resolveLookup = resolve;
    });
    axios.get.mockReturnValueOnce(lookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/search-single$/),
        expect.objectContaining({
          params: { q: "64-17-5" },
        }),
      ),
    );
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();

    await act(async () => {
      resolveLookup({ data: freshFullResult });
      await lookupPromise;
    });

    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("P210");
    expect(modal).toHaveTextContent("pubchem-live");
  });

  it("requeries historical recent-print snapshots before replacing the active print selection", async () => {
    const historicalMethanol = {
      ...secondFreshFullResult,
      hazard_statements: [
        { code: "H225", text_en: "Historical flammable wording." },
        { code: "H301", text_en: "Historical toxic wording." },
      ],
      precautionary_statements: [
        { code: "P301+P310", text_en: "Historical response wording." },
      ],
      retrieved_at: "2026-07-15T00:01:00Z",
      provenance: undefined,
      retrieval: undefined,
      source: undefined,
    };
    const record = buildPrintJobRecord({
      items: [historicalMethanol],
      labelConfig: { stockPreset: "a4-primary" },
      customLabelFields: {},
      labelQuantities: { "67-56-1": 1 },
      labProfile: {
        organization: "Materials Lab",
        phone: "02-1234",
        address: "Taipei",
      },
    });
    localStorage.setItem("ghs_recent_print_jobs", JSON.stringify([record]));

    let resolveRecentLookup;
    const recentLookupPromise = new Promise((resolve) => {
      resolveRecentLookup = resolve;
    });
    axios.get.mockResolvedValueOnce({ data: freshFullResult });
    axios.post.mockReturnValueOnce(recentLookupPromise);

    render(<App />);
    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("Ethanol");

    fireEvent.click(screen.getByTestId("load-recent-print"));
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/search$/),
        { cas_numbers: ["67-56-1"] },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "Ethanol",
    );
    expect(screen.getByTestId("mock-label-print-modal")).not.toHaveTextContent(
      "Historical toxic wording",
    );

    await act(async () => {
      resolveRecentLookup({ data: [secondFreshFullResult] });
      await recentLookupPromise;
    });

    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "Methanol",
    );
    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "Immediately call a POISON CENTER",
    );
    expect(screen.getByTestId("mock-label-print-modal")).not.toHaveTextContent(
      "Historical toxic wording",
    );
  });

  it("looks up an identity-only favorite and opens print with refreshed full GHS content", async () => {
    axios.get.mockResolvedValueOnce({ data: identityOnlyFreshFullResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-109-99-9"));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/search-single$/),
        expect.objectContaining({
          params: { q: "109-99-9" },
        }),
      ),
    );

    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("Tetrahydrofuran");
    expect(modal).toHaveTextContent("P233");
    expect(modal).toHaveTextContent("pubchem-thf-live");
  });

  it("does not open the print modal when favorite rehydration fails", async () => {
    axios.get.mockRejectedValueOnce(new Error("upstream unavailable"));

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "label.favoritePrintLookupFailed",
      ),
    );
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("does not open the print modal when refreshed favorite lookup is not found", async () => {
    axios.get.mockResolvedValueOnce({ data: refreshedNotFoundResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("label.noPrintableHazardData"),
    );
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("does not open the print modal when refreshed favorite has no printable GHS data", async () => {
    axios.get.mockResolvedValueOnce({ data: refreshedNoPrintableGhsResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("label.noPrintableHazardData"),
    );
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("opens print when the refreshed favorite is printable through the selected alternate classification", async () => {
    window.localStorage.setItem(
      "ghs_custom_settings",
      JSON.stringify({
        "75-07-0": {
          selectedIndex: 1,
          note: "Use reviewed alternate classification",
        },
      }),
    );
    const alternateOnlyFavorite = {
      cas_number: "75-07-0",
      name_en: "Acetaldehyde",
      found: true,
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [],
      signal_word: null,
    };
    mockFavorites = [alternateOnlyFavorite];
    axios.get.mockResolvedValueOnce({ data: alternateOnlyFreshResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-75-07-0"));

    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("Acetaldehyde");
    expect(modal).toHaveTextContent("manual-review");
    expect(modal).toHaveTextContent('"selectedIndex":1');
  });

  it("ignores an older favorite print response when a newer favorite resolves first", async () => {
    let resolveFirstLookup;
    let resolveSecondLookup;
    const firstLookupPromise = new Promise((resolve) => {
      resolveFirstLookup = resolve;
    });
    const secondLookupPromise = new Promise((resolve) => {
      resolveSecondLookup = resolve;
    });
    axios.get
      .mockReturnValueOnce(firstLookupPromise)
      .mockReturnValueOnce(secondLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    fireEvent.click(await screen.findByTestId("favorite-print-67-56-1"));

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(axios.get.mock.calls[1][1].signal.aborted).toBe(false);
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/api\/search-single$/),
      expect.objectContaining({
        params: { q: "64-17-5" },
      }),
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/search-single$/),
      expect.objectContaining({
        params: { q: "67-56-1" },
      }),
    );

    await act(async () => {
      resolveSecondLookup({ data: secondFreshFullResult });
      await secondLookupPromise;
    });

    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("Methanol");
    expect(modal).toHaveTextContent("P301+P310");
    expect(modal).not.toHaveTextContent("P210");

    await act(async () => {
      resolveFirstLookup({ data: freshFullResult });
      await firstLookupPromise;
    });

    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "Methanol",
    );
    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "P301+P310",
    );
    expect(screen.getByTestId("mock-label-print-modal")).not.toHaveTextContent(
      "P210",
    );
  });

  it("does not let an older favorite lookup replace a newer results-table print intent", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get
      .mockReturnValueOnce(favoriteLookupPromise)
      .mockResolvedValueOnce({ data: secondFreshFullResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId("search-second-favorite"));
    await waitFor(() => expect(screen.getByText("Methanol")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("print-current-results"));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);

    const modal = await screen.findByTestId("mock-label-print-modal");
    expect(modal).toHaveTextContent("Methanol");
    expect(modal).toHaveTextContent("P301+P310");

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.getByTestId("mock-label-print-modal")).toHaveTextContent(
      "Methanol",
    );
    expect(screen.getByTestId("mock-label-print-modal")).not.toHaveTextContent(
      "P210",
    );
  });

  it("invalidates an older pending favorite lookup when a new single search starts", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get
      .mockReturnValueOnce(favoriteLookupPromise)
      .mockResolvedValueOnce({ data: secondFreshFullResult });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId("search-second-favorite"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
    expect(await screen.findByText("Methanol")).toBeInTheDocument();
  });

  it("invalidates an older pending favorite lookup when a new batch search starts", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get.mockReturnValueOnce(favoriteLookupPromise);
    axios.post.mockResolvedValueOnce({ data: [secondFreshFullResult] });

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByTestId("batch-search-input"), {
      target: { value: "67-56-1" },
    });
    fireEvent.click(screen.getByTestId("batch-search"));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
    expect(await screen.findByText("Methanol")).toBeInTheDocument();
  });

  it("invalidates an older pending favorite lookup when a print attempt has no printable rows", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get
      .mockResolvedValueOnce({ data: refreshedNoPrintableGhsResult })
      .mockReturnValueOnce(favoriteLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("search-second-favorite"));
    await waitFor(() => expect(screen.getByText("Ethanol")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByTestId("print-current-results"));
    expect(axios.get.mock.calls[1][1].signal.aborted).toBe(true);
    expect(toast.error).toHaveBeenCalledWith("label.noPrintableHazardData");

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("suppresses stale favorite lookup failure toast after Favorites is closed", async () => {
    let rejectFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve, reject) => {
      rejectFavoriteLookup = reject;
    });
    axios.get.mockReturnValueOnce(favoriteLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("close-favorites"));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);

    await act(async () => {
      rejectFavoriteLookup(new Error("upstream unavailable"));
      await favoriteLookupPromise.catch(() => {});
    });

    expect(toast.error).not.toHaveBeenCalledWith(
      "label.favoritePrintLookupFailed",
    );
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("invalidates an older pending favorite lookup when all favorites are cleared", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get.mockReturnValueOnce(favoriteLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("clear-favorites"));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(mockClearFavorites).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("invalidates an older pending favorite lookup when that favorite is removed", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get.mockReturnValueOnce(favoriteLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("favorite-remove-64-17-5"));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(mockToggleFavorite).toHaveBeenCalledWith(reducedFavorite);

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });

  it("invalidates an older pending favorite lookup when a later favorite print intent has no CAS", async () => {
    let resolveFavoriteLookup;
    const favoriteLookupPromise = new Promise((resolve) => {
      resolveFavoriteLookup = resolve;
    });
    axios.get.mockReturnValueOnce(favoriteLookupPromise);

    render(<App />);

    fireEvent.click(screen.getByTestId("favorites-toggle-btn"));
    fireEvent.click(await screen.findByTestId("favorite-print-64-17-5"));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByTestId("favorite-print-missing-cas"));
    expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);

    await act(async () => {
      resolveFavoriteLookup({ data: freshFullResult });
      await favoriteLookupPromise;
    });

    expect(toast.error).toHaveBeenCalledWith("label.favoritePrintLookupFailed");
    expect(screen.queryByTestId("mock-label-print-modal")).not.toBeInTheDocument();
  });
});
