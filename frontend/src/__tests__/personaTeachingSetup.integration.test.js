import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import App from "@/App";
import { printLabels } from "@/utils/printLabels";

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

const ethanolResult = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "\u4e59\u9187",
  found: true,
  ghs_pictograms: [{ code: "GHS02", name_zh: "\u706b\u7130" }],
  hazard_statements: [
    {
      code: "H225",
      text: "Highly flammable liquid and vapour.",
      text_en: "Highly flammable liquid and vapour.",
      text_zh: "\u9ad8\u5ea6\u6613\u71c3\u6db2\u9ad4\u548c\u84b8\u6c23",
    },
  ],
  precautionary_statements: [],
  signal_word: "Danger",
  signal_word_zh: "\u5371\u96aa",
  primary_source: "PubChem LCSS",
  primary_report_count: 12,
  other_classifications: [],
};

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  printLabels.mockResolvedValue(undefined);
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

async function openPrepareSolutionModal() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("detail-btn-0"));
  });
  await waitFor(() =>
    expect(screen.getByTestId("detail-modal")).toBeInTheDocument()
  );

  await act(async () => {
    fireEvent.click(screen.getByTestId("prepare-solution-btn"));
  });
  await waitFor(() =>
    expect(screen.getByTestId("prepare-solution-modal")).toBeInTheDocument()
  );
}

describe("persona gate: teaching unit repeatable setup", () => {
  it("keeps prepared-solution setup task-first and hands off a printable prepared label", async () => {
    render(<App />);

    await runSingleSearch(ethanolResult);

    expect(screen.getByTestId("authoritative-source-note-results")).toBeInTheDocument();
    expect(screen.getByTestId("print-label-btn")).toBeInTheDocument();
    expect(screen.getByTestId("export-xlsx-btn")).toBeInTheDocument();

    await openPrepareSolutionModal();

    await act(async () => {
      fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
        target: { value: "10% (v/v)" },
      });
      fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
        target: { value: "Water" },
      });
      fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    });

    await waitFor(() =>
      expect(screen.getAllByText("label.title").length).toBeGreaterThan(0)
    );

    const dialog = screen.getByRole("dialog", { name: /label\.title/i });
    expect(screen.queryByTestId("prepare-solution-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("detail-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("label-purpose-complete")).toBeInTheDocument();
    expect(screen.getByTestId("label-purpose-qrSupplement")).toBeInTheDocument();
    expect(screen.getByTestId("label-purpose-quickId")).toBeInTheDocument();
    expect(screen.getByTestId("authoritative-source-note-print")).toBeInTheDocument();

    expect(
      screen.getByTestId(`selected-prepared-${ethanolResult.cas_number}`)
    ).toBeInTheDocument();
    const selectedCas = Array.from(
      dialog.querySelectorAll('[data-testid="selected-label-cas"]')
    ).map((node) => node.textContent);
    expect(selectedCas).toEqual(["64-17-5"]);

    await act(async () => {
      fireEvent.click(screen.getByTestId("label-purpose-quickId"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("print-label-action"));
    });

    expect(printLabels).toHaveBeenCalledTimes(1);
    const [printedChemicals, printConfig] = printLabels.mock.calls[0];
    expect(printedChemicals).toHaveLength(1);
    expect(printedChemicals[0]).toEqual(
      expect.objectContaining({
        cas_number: "64-17-5",
        isPreparedSolution: true,
        ghs_pictograms: ethanolResult.ghs_pictograms,
        preparedSolution: expect.objectContaining({
          parentCas: "64-17-5",
          concentration: "10% (v/v)",
          solvent: "Water",
        }),
      })
    );
    expect(printConfig).toEqual(
      expect.objectContaining({
        labelPurpose: "quickId",
        template: "icon",
      })
    );
  });
});
