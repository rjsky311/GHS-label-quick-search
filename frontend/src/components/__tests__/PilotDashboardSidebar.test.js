import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PilotDashboardSidebar from "../PilotDashboardSidebar";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const baseProps = {
  report: {
    dictionary: {
      pendingAliasCount: 1,
      openMissQueryCount: 2,
      manualEntryCount: 3,
      referenceLinkCount: 4,
      topMissQueries: [
        {
          query_text: "mystery solvent",
          query_kind: "name",
          endpoint: "search_single",
          hit_count: 2,
          last_seen_at: "2026-04-18T00:00:00+00:00",
        },
      ],
      pendingAliases: [
        {
          alias_text: "buffer x",
          locale: "en",
          cas_number: "123-45-6",
          hit_count: 3,
        },
      ],
    },
    counters: {
      "cache.ghs.stale_hit": 5,
      "upstream.total": 6,
    },
    recentEvents: [
      {
        ts: "2026-04-18T00:00:00+00:00",
        type: "upstream_error",
      },
    ],
  },
  manualEntries: [],
  referenceLinks: [],
  loading: false,
  saving: false,
  error: "",
  onClose: jest.fn(),
  onRefresh: jest.fn(),
  onExportObservabilityReport: jest.fn(),
  onSaveManualEntry: jest.fn(async () => ({ ok: true })),
  onSaveAlias: jest.fn(async () => ({ ok: true })),
  onSaveReferenceLink: jest.fn(async () => ({ ok: true })),
};

describe("PilotDashboardSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders overview metrics and miss queries", () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    expect(screen.getByTestId("pilot-summary-pending-aliases")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-summary-open-miss-queries")).toHaveTextContent("2");
    expect(screen.getByText("mystery solvent")).toBeInTheDocument();
  });

  it("approves a pending alias from the overview tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("approve-alias-buffer x"));

    await waitFor(() => {
      expect(baseProps.onSaveAlias).toHaveBeenCalledWith({
        alias_text: "buffer x",
        locale: "en",
        cas_number: "123-45-6",
        status: "approved",
        notes: "",
      });
    });
  });

  it("submits a manual dictionary entry from the dictionary tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.change(screen.getByTestId("manual-entry-cas-input"), {
      target: { value: "321-54-7" },
    });
    fireEvent.change(screen.getByTestId("manual-entry-name-en-input"), {
      target: { value: "Pilot Solvent" },
    });
    fireEvent.change(screen.getByTestId("manual-entry-name-zh-input"), {
      target: { value: "Ce shi rong ji" },
    });

    fireEvent.click(screen.getByTestId("manual-entry-submit-btn"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "321-54-7",
        name_en: "Pilot Solvent",
        name_zh: "Ce shi rong ji",
        notes: "",
      });
    });
  });
});
