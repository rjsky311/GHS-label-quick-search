import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PilotDashboardSidebar from "../PilotDashboardSidebar";
import { toast } from "sonner";

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
      pendingManualEntryCount: 1,
      openMissQueryCount: 2,
      manualEntryCount: 3,
      manualEntryStatusCounts: {
        approved: 2,
        pending: 1,
        needs_evidence: 1,
        rejected: 0,
      },
      aliasStatusCounts: {
        approved: 1,
        pending: 1,
        needs_evidence: 0,
        rejected: 0,
      },
      referenceLinkCount: 4,
      inactiveReferenceLinkCount: 1,
      referenceLinkStatusCounts: {
        active: 4,
        inactive: 1,
      },
      missQueryStatusCounts: {
        open: 2,
        needs_evidence: 1,
        resolved: 3,
        ignored: 4,
      },
      missQueryRetention: {
        retentionDays: 90,
        cutoffAt: "2026-01-19T00:00:00+00:00",
        purgeableCount: 5,
        retainedNeedsEvidenceCount: 1,
      },
      topMissQueries: [
        {
          id: 101,
          query_text: "mystery solvent",
          query_kind: "name",
          endpoint: "search_single",
          hit_count: 2,
          resolution_status: "open",
          resolved_cas: null,
          context: {},
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
      pendingManualEntries: [
        {
          cas_number: "555-55-5",
          name_en: "Review Solvent",
          name_zh: "審核溶劑",
          status: "needs_evidence",
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
  aliases: [
    {
      id: 21,
      alias_text: "legacy solvent",
      locale: "en",
      cas_number: "111-11-1",
      status: "approved",
      last_seen_at: "2026-04-18T08:00:00+00:00",
    },
    {
      id: 22,
      alias_text: "new review alias",
      locale: "zh",
      cas_number: "222-22-2",
      status: "pending",
      last_seen_at: "2026-04-18T11:00:00+00:00",
    },
  ],
  manualEntries: [
    {
      id: 31,
      cas_number: "111-11-1",
      name_en: "Older Solvent",
      name_zh: "舊溶劑",
      status: "approved",
      updatedAt: "2026-04-18T07:00:00+00:00",
    },
    {
      id: 32,
      cas_number: "222-22-2",
      name_en: "Needs Evidence Solvent",
      name_zh: "待佐證溶劑",
      status: "needs_evidence",
      updatedAt: "2026-04-18T12:00:00+00:00",
    },
  ],
  referenceLinks: [
    {
      id: 10,
      casNumber: "64-17-5",
      cid: 702,
      linkType: "sds",
      label: "Current SDS",
      url: "https://lab.example/sds/current",
      priority: 1,
      status: "active",
      updatedAt: "2026-04-18T09:00:00+00:00",
    },
    {
      id: 11,
      casNumber: "64-17-5",
      cid: 702,
      linkType: "sds",
      label: "Retired SDS",
      url: "https://lab.example/sds/retired",
      priority: 0,
      status: "inactive",
      updatedAt: "2026-04-18T10:00:00+00:00",
    },
  ],
  loading: false,
  saving: false,
  error: "",
  onClose: jest.fn(),
  onRefresh: jest.fn(),
  onExportObservabilityReport: jest.fn(),
  onSaveManualEntry: jest.fn(async () => ({ ok: true })),
  onSaveAlias: jest.fn(async () => ({ ok: true })),
  onSaveReferenceLink: jest.fn(async () => ({ ok: true })),
  onResolveMissQuery: jest.fn(async () => ({ ok: true })),
  onPurgeStaleMissQueries: jest.fn(async () => ({
    ok: true,
    retention: { deletedCount: 5 },
  })),
};

describe("PilotDashboardSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders overview metrics and miss queries", () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    expect(screen.getByTestId("pilot-summary-pending-aliases")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-summary-pending-manual-entries")).toHaveTextContent("1");
    expect(screen.getByTestId("manual-entry-status-count-approved")).toHaveTextContent("2");
    expect(screen.getByTestId("manual-entry-status-count-pending")).toHaveTextContent("1");
    expect(screen.getByTestId("manual-entry-status-count-needs_evidence")).toHaveTextContent("1");
    expect(screen.getByTestId("manual-entry-status-count-rejected")).toHaveTextContent("0");
    expect(screen.getByTestId("alias-status-count-approved")).toHaveTextContent("1");
    expect(screen.getByTestId("alias-status-count-pending")).toHaveTextContent("1");
    expect(screen.getByTestId("alias-status-count-needs_evidence")).toHaveTextContent("0");
    expect(screen.getByTestId("alias-status-count-rejected")).toHaveTextContent("0");
    expect(screen.getByTestId("reference-link-status-count-active")).toHaveTextContent("4");
    expect(screen.getByTestId("reference-link-status-count-inactive")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-summary-open-miss-queries")).toHaveTextContent("2");
    expect(screen.getByTestId("miss-query-status-count-open")).toHaveTextContent("2");
    expect(screen.getByTestId("miss-query-status-count-needs_evidence")).toHaveTextContent("1");
    expect(screen.getByTestId("miss-query-status-count-resolved")).toHaveTextContent("3");
    expect(screen.getByTestId("miss-query-status-count-ignored")).toHaveTextContent("4");
    expect(screen.getByTestId("pilot-summary-stale-miss-rows")).toHaveTextContent("5");
    expect(screen.getByText("mystery solvent")).toBeInTheDocument();
  });

  it("purges stale miss-query telemetry after confirmation", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("purge-stale-miss-queries-btn"));

    await waitFor(() => {
      expect(baseProps.onPurgeStaleMissQueries).toHaveBeenCalledWith({
        retention_days: 90,
      });
    });
    expect(toast.success).toHaveBeenCalledWith("pilot.purgeMissDone");
    confirmSpy.mockRestore();
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

  it("marks a pending alias as needing evidence from the overview tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("needs-evidence-alias-buffer x"));

    await waitFor(() => {
      expect(baseProps.onSaveAlias).toHaveBeenCalledWith({
        alias_text: "buffer x",
        locale: "en",
        cas_number: "123-45-6",
        status: "needs_evidence",
        notes: "",
      });
    });
  });

  it("approves a manual dictionary entry from the overview tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("approve-manual-entry-555-55-5"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "555-55-5",
        name_en: "Review Solvent",
        name_zh: "審核溶劑",
        notes: "",
        source: "manual",
        status: "approved",
      });
    });
  });

  it("marks a miss query as needing evidence from the overview tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("needs-evidence-miss-query-101"));

    await waitFor(() => {
      expect(baseProps.onResolveMissQuery).toHaveBeenCalledWith(101, {
        resolution_status: "needs_evidence",
        resolved_cas: null,
      });
    });
  });

  it("resolves a miss query with a reviewed CAS", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.change(screen.getByTestId("miss-query-resolved-cas-101"), {
      target: { value: "64-17-5" },
    });
    fireEvent.click(screen.getByTestId("resolve-miss-query-101"));

    await waitFor(() => {
      expect(baseProps.onResolveMissQuery).toHaveBeenCalledWith(101, {
        resolution_status: "resolved",
        resolved_cas: "64-17-5",
      });
    });
  });

  it("does not resolve a miss query without CAS evidence", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("resolve-miss-query-101"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("pilot.missResolvedCasRequired");
    });
    expect(baseProps.onResolveMissQuery).not.toHaveBeenCalled();
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
      target: { value: "測試溶劑" },
    });

    fireEvent.click(screen.getByTestId("manual-entry-submit-btn"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "321-54-7",
        name_en: "Pilot Solvent",
        name_zh: "測試溶劑",
        notes: "",
      });
    });
  });

  it("submits a pending manual entry status when selected", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.change(screen.getByTestId("manual-entry-cas-input"), {
      target: { value: "555-55-5" },
    });
    fireEvent.change(screen.getByTestId("manual-entry-name-en-input"), {
      target: { value: "Review Solvent" },
    });
    fireEvent.change(screen.getByTestId("manual-entry-name-zh-input"), {
      target: { value: "審核溶劑" },
    });
    fireEvent.change(screen.getByTestId("manual-entry-status-select"), {
      target: { value: "pending" },
    });

    fireEvent.click(screen.getByTestId("manual-entry-submit-btn"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "555-55-5",
        name_en: "Review Solvent",
        name_zh: "審核溶劑",
        notes: "",
        status: "pending",
      });
    });
  });

  it("blocks manual Chinese names that do not contain Chinese characters", async () => {
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
      expect(toast.error).toHaveBeenCalledWith(
        "pilot.manualChineseNameRequiresCjk"
      );
    });
    expect(baseProps.onSaveManualEntry).not.toHaveBeenCalled();
  });

  it("submits an inactive reference link from the dictionary tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.change(screen.getByTestId("reference-link-cas-input"), {
      target: { value: "64-17-5" },
    });
    fireEvent.change(screen.getByTestId("reference-link-label-input"), {
      target: { value: "Retired SDS" },
    });
    fireEvent.change(screen.getByTestId("reference-link-url-input"), {
      target: { value: "https://lab.example/sds/retired" },
    });
    fireEvent.change(screen.getByTestId("reference-link-status-select"), {
      target: { value: "inactive" },
    });

    fireEvent.click(screen.getByTestId("reference-link-submit-btn"));

    await waitFor(() => {
      expect(baseProps.onSaveReferenceLink).toHaveBeenCalledWith({
        cas_number: "64-17-5",
        label: "Retired SDS",
        url: "https://lab.example/sds/retired",
        link_type: "reference",
        priority: 50,
        status: "inactive",
      });
    });
  });

  it("updates reference link status from the recent links list", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    const rows = screen.getAllByTestId(/^reference-link-row-/);
    expect(rows[0]).toHaveTextContent("Retired SDS");
    expect(screen.getByTestId("reference-link-status-11")).toHaveTextContent(
      "pilot.referenceStatusInactive"
    );
    expect(screen.getByTestId("reference-link-status-10")).toHaveTextContent(
      "pilot.referenceStatusActive"
    );

    fireEvent.click(screen.getByTestId("reference-link-inactive-10"));

    await waitFor(() => {
      expect(baseProps.onSaveReferenceLink).toHaveBeenCalledWith({
        cas_number: "64-17-5",
        label: "Current SDS",
        url: "https://lab.example/sds/current",
        link_type: "sds",
        priority: 1,
        status: "inactive",
        cid: 702,
      });
    });

    fireEvent.click(screen.getByTestId("reference-link-active-11"));

    await waitFor(() => {
      expect(baseProps.onSaveReferenceLink).toHaveBeenLastCalledWith({
        cas_number: "64-17-5",
        label: "Retired SDS",
        url: "https://lab.example/sds/retired",
        link_type: "sds",
        priority: 0,
        status: "active",
        cid: 702,
      });
    });
  });

  it("sorts recent curation rows by newest update and shows review status", () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));

    const aliasRows = screen.getAllByTestId(/^alias-row-/);
    expect(aliasRows[0]).toHaveTextContent("new review alias");
    expect(aliasRows[1]).toHaveTextContent("legacy solvent");
    expect(screen.getByTestId("alias-status-22")).toHaveTextContent(
      "pilot.manualStatusPending"
    );

    const manualRows = screen.getAllByTestId(/^manual-entry-row-/);
    expect(manualRows[0]).toHaveTextContent("Needs Evidence Solvent");
    expect(manualRows[1]).toHaveTextContent("Older Solvent");
    expect(screen.getByTestId("manual-entry-status-32")).toHaveTextContent(
      "pilot.manualStatusNeedsEvidence"
    );
  });

  it("updates alias status from the recent aliases list", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.click(screen.getByTestId("alias-reject-21"));

    await waitFor(() => {
      expect(baseProps.onSaveAlias).toHaveBeenCalledWith({
        alias_text: "legacy solvent",
        locale: "en",
        cas_number: "111-11-1",
        status: "rejected",
        notes: "",
      });
    });

    fireEvent.click(screen.getByTestId("alias-needs-evidence-21"));

    await waitFor(() => {
      expect(baseProps.onSaveAlias).toHaveBeenLastCalledWith({
        alias_text: "legacy solvent",
        locale: "en",
        cas_number: "111-11-1",
        status: "needs_evidence",
        notes: "",
      });
    });

    fireEvent.click(screen.getByTestId("alias-approve-22"));

    await waitFor(() => {
      expect(baseProps.onSaveAlias).toHaveBeenLastCalledWith({
        alias_text: "new review alias",
        locale: "zh",
        cas_number: "222-22-2",
        status: "approved",
        notes: "",
      });
    });
  });

  it("updates manual entry status from the recent manual entries list", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.click(screen.getByTestId("manual-entry-reject-31"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "111-11-1",
        name_en: "Older Solvent",
        name_zh: "舊溶劑",
        notes: "",
        source: "manual",
        status: "rejected",
      });
    });

    fireEvent.click(screen.getByTestId("manual-entry-approve-32"));

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenLastCalledWith({
        cas_number: "222-22-2",
        name_en: "Needs Evidence Solvent",
        name_zh: "待佐證溶劑",
        notes: "",
        source: "manual",
        status: "approved",
      });
    });
  });
});
