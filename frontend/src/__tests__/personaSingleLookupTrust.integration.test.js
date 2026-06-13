import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

jest.mock("@/utils/printLabels", () => ({
  buildPrintPreviewDocument: jest.fn(() => ({
    html: "<html><body>preview</body></html>",
  })),
  printLabels: jest.fn(),
  resolveEffectiveChemicalForPrint: jest.fn((chemical) => chemical),
  getQRCodeUrl: jest.fn(() => "http://qr.test"),
}));

jest.mock("@/utils/sdsLinks", () => ({
  getPubChemSDSUrl: jest.fn(() => "http://sds.test"),
  getECHASearchUrl: jest.fn(() => "http://echa.test"),
  getPreferredQrTargetInfo: jest.fn((cid, cas) =>
    cid
      ? {
          label: "PubChem Safety & Hazards",
          url: "http://sds.test",
          linkType: "sds",
          source: "pubchem",
          isFallback: true,
        }
      : cas
        ? {
            label: "ECHA Substance Search",
            url: "http://echa.test",
            linkType: "regulatory",
            source: "echa",
            isFallback: true,
          }
        : null,
  ),
  getReferenceLinks: jest.fn((result) => {
    const links = [];
    if (result?.cid) {
      links.push({
        label: "PubChem Safety & Hazards",
        url: "http://sds.test",
        linkType: "sds",
        source: "pubchem",
      });
    }
    if (result?.cas_number) {
      links.push({
        label: "ECHA Substance Search",
        url: "http://echa.test",
        linkType: "regulatory",
        source: "echa",
      });
    }
    return links;
  }),
}));

jest.mock("@/components/GHSImage", () => (props) => (
  <span data-testid={`ghs-img-${props.code}`}>{props.code}</span>
));

jest.setTimeout(20000);

const singleLookupTrustResult = {
  cas_number: "84-65-1",
  cid: 6780,
  name_en: "Anthraquinone",
  name_zh: "",
  found: true,
  ghs_pictograms: [{ code: "GHS07", name_zh: "" }],
  hazard_statements: [
    {
      code: "H317",
      text: "May cause an allergic skin reaction.",
      text_en: "May cause an allergic skin reaction.",
      text_zh: "",
    },
  ],
  precautionary_statements: [],
  signal_word: "Warning",
  signal_word_zh: "",
  primary_source: "ECHA C&L Notifications Summary",
  primary_report_count: 236,
  retrieved_at: "2026-06-01T08:00:00Z",
  cache_hit: true,
  has_multiple_classifications: true,
  other_classifications: [
    {
      pictograms: [{ code: "GHS08", name_zh: "" }],
      hazard_statements: [
        {
          code: "H350",
          text: "May cause cancer.",
          text_en: "May cause cancer.",
          text_zh: "",
        },
      ],
      signal_word: "Danger",
      signal_word_zh: "",
      source: "PubChem LCSS alternate",
      report_count: 12,
    },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

async function runSingleSearch(result) {
  axios.get.mockImplementation(async (url) => {
    if (String(url).endsWith("/api/search-single")) {
      return { data: result };
    }
    return { data: { results: [] } };
  });
  axios.post.mockResolvedValue({ data: [] });

  await act(async () => {
    fireEvent.change(screen.getByTestId("single-cas-input"), {
      target: { value: result.cas_number },
    });
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId("single-search-btn"));
  });

  await waitFor(() =>
    expect(screen.getByText("results.title")).toBeInTheDocument()
  );
}

describe("persona gate: general single lookup trust", () => {
  it("surfaces source confidence, missing Chinese-name curation, and authority boundaries", async () => {
    render(<App />);

    expect(await screen.findByTestId("empty-workbench-trust-slot")).toContainElement(
      screen.getByTestId("product-trust-panel-empty")
    );
    expect(screen.getByTestId("product-trust-panel-empty")).toHaveAttribute(
      "data-layout",
      "embedded"
    );

    await runSingleSearch(singleLookupTrustResult);

    expect(
      screen.getByTestId(`source-badge-echa-${singleLookupTrustResult.cas_number}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`data-quality-link-missing-chinese-name-${singleLookupTrustResult.cas_number}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`classification-state-${singleLookupTrustResult.cas_number}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`other-classifications-toggle-${singleLookupTrustResult.cas_number}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId("authoritative-source-note-results")).toBeInTheDocument();
    expect(screen.getByTestId("sds-btn-0")).toHaveAttribute("href", "http://sds.test");

    await act(async () => {
      fireEvent.click(screen.getByTestId("detail-btn-0"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("detail-modal")).toBeInTheDocument()
    );

    expect(screen.getByTestId("detail-trust-strip")).toBeInTheDocument();
    expect(screen.getByTestId("detail-trust-source")).toHaveTextContent(
      "results.sourceEcha"
    );
    expect(screen.getByTestId("detail-trust-classification")).toHaveTextContent(
      "detail.trustReportCount"
    );
    expect(screen.getByTestId("detail-missing-chinese-name-note")).toBeInTheDocument();
    expect(screen.getByTestId("detail-report-missing-chinese-name-link")).toHaveAttribute(
      "href",
      expect.stringContaining("Issue+key%3A+missing-chinese-name")
    );
    expect(screen.getByTestId("detail-source-conflict-note")).toBeInTheDocument();
    expect(screen.getByTestId("detail-reference-verification-hint")).toBeInTheDocument();
    expect(screen.getByTestId("detail-reference-link-sds")).toHaveAttribute(
      "data-reference-url-scheme",
      "http"
    );
    expect(screen.getByTestId("detail-reference-link-regulatory")).toHaveAttribute(
      "data-reference-url-scheme",
      "http"
    );
    expect(screen.getByTestId("provenance-report-count")).toHaveTextContent(
      "detail.provenanceReportCount"
    );
    expect(screen.getByTestId("provenance-cache-badge")).toBeInTheDocument();
    expect(screen.getByTestId("authoritative-source-note-detail")).toBeInTheDocument();
  });
});
