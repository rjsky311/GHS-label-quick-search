import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import App from "@/App";
import {
  clearObservabilityEvents,
  loadObservabilityEvents,
} from "@/utils/observability";

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
  return function MockSearchSection({
    batchCas,
    batchProgress,
    error,
    onSearchBatch,
    onSearchSingle,
    onSetBatchCas,
  }) {
    return (
      <div data-testid="mock-search-section">
        <button type="button" data-testid="search-first" onClick={() => onSearchSingle("64-17-5")}>
          First
        </button>
        <button type="button" data-testid="search-second" onClick={() => onSearchSingle("67-56-1")}>
          Second
        </button>
        <textarea
          data-testid="batch-input"
          value={batchCas}
          onChange={(event) => onSetBatchCas(event.target.value)}
        />
        <button type="button" data-testid="batch-search" onClick={onSearchBatch}>
          Batch
        </button>
        {batchProgress && (
          <div data-testid="batch-progress">
            {batchProgress.current}/{batchProgress.total}
          </div>
        )}
        {error && <div data-testid="search-error">{error}</div>}
      </div>
    );
  };
});

jest.mock("@/components/ResultsTable", () => {
  return function MockResultsTable({ results }) {
    return (
      <div data-testid="mock-results-table">
        {results.map((result) => (
          <span data-testid="result-name" key={result.cas_number}>
            {result.name_en || result.cas_number}
          </span>
        ))}
      </div>
    );
  };
});

jest.mock("@/utils/workspaceDocuments", () => ({
  recordDictionaryMissQuery: jest.fn(() => Promise.resolve(null)),
}));

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

const notFoundResultFor = (casNumber) => ({
  cas_number: casNumber,
  found: false,
  name_en: `Missing ${casNumber}`,
  ghs_pictograms: [],
  hazard_statements: [],
  precautionary_statements: [],
});

const buildValidCas = (index) => {
  const firstGroup = String(100000 + index);
  const middleGroup = String(10 + (index % 90)).padStart(2, "0");
  const bodyDigits = `${firstGroup}${middleGroup}`.split("").reverse();
  const checkDigit =
    bodyDigits.reduce((sum, digit, digitIndex) => {
      return sum + Number(digit) * (digitIndex + 1);
    }, 0) % 10;
  return `${firstGroup}-${middleGroup}-${checkDigit}`;
};

const buildCasList = (count, start = 0) =>
  Array.from({ length: count }, (_, index) => buildValidCas(start + index));

const setBatchInput = (casNumbers) => {
  fireEvent.change(screen.getByTestId("batch-input"), {
    target: { value: casNumbers.join("\n") },
  });
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe("App single-search request ordering", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearObservabilityEvents();
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

describe("App batch-search chunking", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearObservabilityEvents();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: [] });
  });

  it("posts batch searches sequentially in 20-item chunks while preserving input order and progress", async () => {
    const casNumbers = buildCasList(45);
    const chunkRequests = [deferred(), deferred(), deferred()];

    axios.post.mockImplementation((url, body) => {
      const request = chunkRequests[axios.post.mock.calls.length - 1];
      return request.promise.then(() => ({
        data: body.cas_numbers.map((casNumber) =>
          casNumber === casNumbers[22]
            ? notFoundResultFor(casNumber)
            : resultFor(casNumber, `Chemical ${casNumbers.indexOf(casNumber)}`),
        ),
      }));
    });

    render(<App />);
    setBatchInput(casNumbers);

    fireEvent.click(screen.getByTestId("batch-search"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post.mock.calls[0][1]).toEqual({
      cas_numbers: casNumbers.slice(0, 20),
    });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("0/45");

    await act(async () => {
      chunkRequests[0].resolve();
      await chunkRequests[0].promise;
    });

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
    expect(axios.post.mock.calls[1][1]).toEqual({
      cas_numbers: casNumbers.slice(20, 40),
    });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("20/45");

    await act(async () => {
      chunkRequests[1].resolve();
      await chunkRequests[1].promise;
    });

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(3));
    expect(axios.post.mock.calls[2][1]).toEqual({
      cas_numbers: casNumbers.slice(40, 45),
    });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("40/45");

    await act(async () => {
      chunkRequests[2].resolve();
      await chunkRequests[2].promise;
    });

    await waitFor(() =>
      expect(screen.getAllByTestId("result-name")).toHaveLength(45),
    );
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("45/45");
    expect(
      screen.getAllByTestId("result-name").map((node) => node.textContent),
    ).toEqual(
      casNumbers.map((casNumber, index) =>
        casNumber === casNumbers[22]
          ? `Missing ${casNumber}`
          : `Chemical ${index}`,
      ),
    );

    const unresolvedEvents = loadObservabilityEvents().filter(
      (event) => event.type === "search_unresolved",
    );
    expect(unresolvedEvents).toHaveLength(1);
    expect(unresolvedEvents[0]).toEqual(
      expect.objectContaining({
        cas: casNumbers[22],
        query: casNumbers[22],
        queryType: "batch",
        status: "not_found",
        meta: expect.objectContaining({
          activeTab: "batch",
          batchSize: 45,
          batchIndex: 22,
        }),
      }),
    );
  });

  it("aborts and discards an older chunked batch when a newer batch starts", async () => {
    const staleCasNumbers = buildCasList(45);
    const freshCasNumbers = buildCasList(1, 100);
    const firstStaleChunk = deferred();
    const secondStaleChunk = deferred();
    const freshSearch = deferred();

    axios.post
      .mockImplementationOnce((url, body) =>
        firstStaleChunk.promise.then(() => ({
          data: body.cas_numbers.map((casNumber) =>
            resultFor(casNumber, `Stale ${casNumber}`),
          ),
        })),
      )
      .mockImplementationOnce((url, body) =>
        secondStaleChunk.promise.then(() => ({
          data: body.cas_numbers.map((casNumber) =>
            resultFor(casNumber, `Stale ${casNumber}`),
          ),
        })),
      )
      .mockImplementationOnce((url, body) =>
        freshSearch.promise.then(() => ({
          data: body.cas_numbers.map((casNumber) =>
            resultFor(casNumber, `Fresh ${casNumber}`),
          ),
        })),
      );

    render(<App />);
    setBatchInput(staleCasNumbers);
    fireEvent.click(screen.getByTestId("batch-search"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    await act(async () => {
      firstStaleChunk.resolve();
      await firstStaleChunk.promise;
    });
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));

    setBatchInput(freshCasNumbers);
    fireEvent.click(screen.getByTestId("batch-search"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(3));
    expect(axios.post.mock.calls[1][2].signal.aborted).toBe(true);
    expect(axios.post.mock.calls[2][1]).toEqual({
      cas_numbers: freshCasNumbers,
    });

    await act(async () => {
      freshSearch.resolve();
      await freshSearch.promise;
    });

    await waitFor(() =>
      expect(screen.getByText(`Fresh ${freshCasNumbers[0]}`)).toBeInTheDocument(),
    );

    await act(async () => {
      secondStaleChunk.resolve();
      await secondStaleChunk.promise;
    });

    expect(screen.getByText(`Fresh ${freshCasNumbers[0]}`)).toBeInTheDocument();
    expect(
      screen.queryByText(`Stale ${staleCasNumbers[20]}`),
    ).not.toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledTimes(3);
  });

  it("keeps completed chunk results visible when a later chunk fails", async () => {
    const casNumbers = buildCasList(45);
    const firstChunkResults = casNumbers
      .slice(0, 20)
      .map((casNumber, index) => resultFor(casNumber, `Partial ${index}`));

    axios.post
      .mockResolvedValueOnce({ data: firstChunkResults })
      .mockRejectedValueOnce(
        Object.assign(new Error("rate limited"), {
          response: { status: 429 },
        }),
      );

    render(<App />);
    setBatchInput(casNumbers);
    fireEvent.click(screen.getByTestId("batch-search"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));

    await waitFor(() =>
      expect(screen.getByTestId("search-error")).toHaveTextContent(
        "search.errorBatchPartial",
      ),
    );
    expect(
      screen.getAllByTestId("result-name").map((node) => node.textContent),
    ).toEqual(
      firstChunkResults.map((result) => result.name_en),
    );
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Partial 20")).not.toBeInTheDocument();
  });
});
