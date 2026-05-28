import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PilotDashboardSidebar from "../PilotDashboardSidebar";
import PilotTriagePanel from "../pilot/PilotTriagePanel";
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
      openCorrectionRequestCount: 1,
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
      correctionRequestStatusCounts: {
        open: 1,
        candidate_found: 1,
        approved: 2,
        rejected: 0,
        ignored: 1,
      },
      convertedCorrectionCandidateCount: 1,
      convertedCorrectionCandidates: [
        {
          id: 202,
          issue_type: "source-conflict",
          cas_number: "67-64-1",
          chemical_name: "Acetone",
          candidate: {
            cas_number: "67-64-1",
            name_en: "Acetone",
            name_zh: "Acetone zh",
            source: "admin-correction-request",
            approved_for_public_use: false,
            converted_to_manual_entry: true,
            manual_entry_status: "pending",
            public_data_changed: false,
          },
          status: "candidate_found",
          updated_at: "2026-04-18T14:00:00+00:00",
        },
      ],
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
      pilotTriage: {
        openWorkItemCount: 12,
        attentionSignalCount: 25,
        attentionCounts: {
          openCorrectionRequests: 2,
          unresolvedSearches: 3,
          candidateFoundAwaitingManualReview: 1,
          manualEntriesInReview: 2,
          needsEvidenceWorkItems: 4,
          missingChineseNameReports: 1,
          sourceConflictReports: 2,
          noGhsReports: 5,
          staleMissQueryRows: 5,
        },
        recommendedFocus: [
          {
            key: "correction_intake",
            targetKey: "correction_requests",
            targetLabel: "Correction requests",
            message: "Review open correction requests before adding new data sources.",
            nextAction: "Open correction queue and decide approve, reject, or needs evidence.",
            count: 2,
          },
        ],
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
      topCorrectionRequests: [
        {
          id: 201,
          issue_type: "missing-chinese-name",
          cas_number: "64-17-5",
          chemical_name: "Ethanol",
          current_output: "English name only",
          expected_output: "中文名稱：乙醇",
          evidence_url: "https://example.com/evidence",
          status: "open",
          updated_at: "2026-04-18T13:00:00+00:00",
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
  correctionRequests: [
    {
      id: 201,
      issue_type: "missing-chinese-name",
      cas_number: "64-17-5",
      chemical_name: "Ethanol",
      expected_output: "乙醇",
      status: "open",
      updated_at: "2026-04-18T13:00:00+00:00",
    },
    {
      id: 202,
      issue_type: "source-conflict",
      cas_number: "67-64-1",
      chemical_name: "Acetone",
      expected_output: "Review ECHA source",
      candidate: {
        cas_number: "67-64-1",
        name_en: "Acetone",
        name_zh: "丙酮",
        source: "admin-correction-request",
        approved_for_public_use: false,
      },
      status: "candidate_found",
      updated_at: "2026-04-18T14:00:00+00:00",
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
  onUpdateCorrectionRequestStatus: jest.fn(async () => ({ ok: true })),
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
    expect(screen.getByTestId("pilot-summary-open-correction-requests")).toHaveTextContent("1");
    expect(
      screen.getByTestId("pilot-summary-converted-correction-candidates"),
    ).toHaveTextContent("1");
    expect(screen.getByTestId("miss-query-status-count-open")).toHaveTextContent("2");
    expect(screen.getByTestId("miss-query-status-count-needs_evidence")).toHaveTextContent("1");
    expect(screen.getByTestId("miss-query-status-count-resolved")).toHaveTextContent("3");
    expect(screen.getByTestId("miss-query-status-count-ignored")).toHaveTextContent("4");
    expect(screen.getByTestId("correction-request-status-count-open")).toHaveTextContent("1");
    expect(screen.getByTestId("correction-request-status-count-candidate_found")).toHaveTextContent("1");
    expect(screen.getByTestId("correction-request-status-count-approved")).toHaveTextContent("2");
    expect(screen.getByTestId("correction-request-status-count-rejected")).toHaveTextContent("0");
    expect(screen.getByTestId("correction-request-status-count-ignored")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-summary-stale-miss-rows")).toHaveTextContent("5");
    expect(screen.getByTestId("pilot-triage-open-work-items")).toHaveTextContent("12");
    expect(screen.getByTestId("pilot-triage-attention-signals")).toHaveTextContent("25");
    expect(screen.getByTestId("pilot-triage-overlap-note")).toHaveTextContent(
      "pilot.triageOverlapNote",
    );
    expect(screen.getByTestId("pilot-triage-open-corrections")).toHaveTextContent("2");
    expect(screen.getByTestId("pilot-triage-unresolved-searches")).toHaveTextContent("3");
    expect(screen.getByTestId("pilot-triage-candidate-found")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-triage-manual-entries")).toHaveTextContent("2");
    expect(screen.getByTestId("pilot-triage-needs-evidence")).toHaveTextContent("4");
    expect(screen.getByTestId("pilot-triage-missing-chinese-names")).toHaveTextContent("1");
    expect(screen.getByTestId("pilot-triage-missing-chinese-names")).toHaveTextContent(
      "dataQuality.issue.missingChineseName",
    );
    expect(screen.getByTestId("pilot-triage-source-conflicts")).toHaveTextContent("2");
    expect(screen.getByTestId("pilot-triage-source-conflicts")).toHaveTextContent(
      "dataQuality.issue.sourceConflict",
    );
    expect(screen.getByTestId("pilot-triage-upstream-retries")).toHaveTextContent("6");
    expect(screen.getByTestId("pilot-triage-upstream-retries")).toHaveTextContent(
      "dataQuality.issue.upstreamError",
    );
    expect(screen.getByTestId("pilot-triage-no-ghs")).toHaveTextContent("5");
    expect(screen.getByTestId("pilot-triage-no-ghs")).toHaveTextContent(
      "dataQuality.issue.noGhsData",
    );
    expect(screen.getByTestId("pilot-triage-stale-telemetry")).toHaveTextContent("5");
    expect(screen.getByTestId("pilot-triage-primary-action-message")).toHaveTextContent(
      "pilot.triageFocus.correction_intake.message",
    );
    expect(screen.getByTestId("pilot-triage-primary-action-next")).toHaveTextContent(
      "pilot.triageNextAction",
    );
    expect(screen.getByTestId("pilot-triage-primary-action-count")).toHaveTextContent("2");
    expect(
      screen.getByTestId("pilot-triage-primary-action-target-label"),
    ).toHaveTextContent("Correction requests");
    expect(
      screen.getByTestId("pilot-triage-primary-action-open-target"),
    ).toHaveTextContent("Open Correction requests");
    expect(screen.getByTestId("pilot-triage-focus-correction_intake")).toHaveTextContent(
      "pilot.triageFocus.correction_intake.message",
    );
    expect(
      screen.getByTestId("pilot-triage-focus-correction_intake-next-action"),
    ).toHaveTextContent("pilot.triageNextAction");
    expect(screen.getByText("mystery solvent")).toBeInTheDocument();
    expect(
      screen.getAllByText("dataQuality.issue.missingChineseName").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("missing-chinese-name")).toBeInTheDocument();
    expect(
      screen.getByTestId("converted-correction-candidate-row-202"),
    ).toHaveTextContent("67-64-1");
    expect(
      screen.getByTestId("correction-request-candidate-converted-202-manual-pending"),
    ).toBeInTheDocument();
  });

  it("renders a no-action primary triage state when the pilot queue is clear", () => {
    render(
      <PilotTriagePanel
        pilotTriage={{
          openWorkItemCount: 0,
          attentionCounts: {},
          recommendedFocus: [],
        }}
        observabilityCounters={{}}
      />,
    );

    expect(screen.getByTestId("pilot-triage-primary-action")).toBeInTheDocument();
    expect(screen.getByTestId("pilot-triage-primary-action-message")).toHaveTextContent(
      "pilot.triageNoPrimaryAction",
    );
    expect(screen.queryByTestId("pilot-triage-primary-action-count")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pilot-triage-overlap-note")).not.toBeInTheDocument();
  });

  it("calls the triage target handler from the primary and focus-row actions", () => {
    const onOpenFocusTarget = jest.fn();
    render(
      <PilotTriagePanel
        pilotTriage={{
          openWorkItemCount: 1,
          attentionCounts: {},
          recommendedFocus: [
            {
              key: "candidate_found",
              targetKey: "converted_candidates",
              targetLabel: "Converted candidates",
              message: "Convert candidate evidence.",
              nextAction: "Open candidate queue.",
              count: 1,
            },
            {
              key: "unresolved_searches",
              targetKey: "miss_queries",
              targetLabel: "Miss-query cleanup",
              message: "Resolve search misses.",
              nextAction: "Open miss query queue.",
              count: 3,
            },
          ],
        }}
        observabilityCounters={{}}
        onOpenFocusTarget={onOpenFocusTarget}
      />,
    );

    fireEvent.click(screen.getByTestId("pilot-triage-primary-action-open-target"));
    fireEvent.click(screen.getByTestId("pilot-triage-focus-unresolved_searches-open-target"));

    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(1, "converted_candidates");
    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(2, "miss_queries");
  });

  it("keeps roster data-quality focus rows routed to the right admin queues", () => {
    const onOpenFocusTarget = jest.fn();
    render(
      <PilotTriagePanel
        pilotTriage={{
          openWorkItemCount: 9,
          attentionCounts: {
            missingChineseNameReports: 2,
            noGhsReports: 1,
            sourceConflictReports: 1,
            unresolvedSearches: 2,
            candidateFoundAwaitingManualReview: 1,
          },
          recommendedFocus: [
            {
              key: "missing_chinese_names",
              targetKey: "correction_requests",
              targetLabel: "Correction requests",
              message: "Backfill trusted Traditional Chinese names.",
              nextAction: "Create candidate evidence before approval.",
              count: 2,
            },
            {
              key: "no_ghs_gaps",
              targetKey: "correction_requests",
              targetLabel: "Correction requests",
              message: "Review no-GHS reports.",
              nextAction: "Keep no-GHS separate from no-hazard.",
              count: 1,
            },
            {
              key: "source_conflicts",
              targetKey: "correction_requests",
              targetLabel: "Correction requests",
              message: "Inspect source conflicts.",
              nextAction: "Confirm public primary selection separately.",
              count: 1,
            },
            {
              key: "unresolved_searches",
              targetKey: "miss_queries",
              targetLabel: "Miss-query cleanup",
              message: "Resolve search misses.",
              nextAction: "Resolve to reviewed CAS or mark needs-evidence.",
              count: 2,
            },
            {
              key: "candidate_found",
              targetKey: "converted_candidates",
              targetLabel: "Converted candidates",
              message: "Convert candidate evidence.",
              nextAction: "Create a manual entry only after review.",
              count: 1,
            },
          ],
        }}
        observabilityCounters={{}}
        onOpenFocusTarget={onOpenFocusTarget}
      />,
    );

    expect(screen.getByTestId("pilot-triage-focus-missing_chinese_names")).toHaveTextContent(
      "pilot.triageFocus.missing_chinese_names.message",
    );
    expect(screen.getByTestId("pilot-triage-focus-no_ghs_gaps")).toHaveTextContent(
      "pilot.triageFocus.no_ghs_gaps.message",
    );
    expect(screen.getByTestId("pilot-triage-focus-source_conflicts")).toHaveTextContent(
      "pilot.triageFocus.source_conflicts.message",
    );

    fireEvent.click(
      screen.getByTestId("pilot-triage-focus-missing_chinese_names-open-target"),
    );
    fireEvent.click(screen.getByTestId("pilot-triage-focus-no_ghs_gaps-open-target"));
    fireEvent.click(screen.getByTestId("pilot-triage-focus-source_conflicts-open-target"));
    fireEvent.click(screen.getByTestId("pilot-triage-focus-unresolved_searches-open-target"));
    fireEvent.click(screen.getByTestId("pilot-triage-focus-candidate_found-open-target"));

    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(1, "correction_requests");
    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(2, "correction_requests");
    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(3, "correction_requests");
    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(4, "miss_queries");
    expect(onOpenFocusTarget).toHaveBeenNthCalledWith(5, "converted_candidates");
  });

  it("routes inventory handoff focus to its review-only correction queue", () => {
    const onOpenFocusTarget = jest.fn();
    render(
      <PilotTriagePanel
        pilotTriage={{
          openWorkItemCount: 2,
          attentionCounts: {
            openCorrectionRequests: 2,
            inventoryHandoffRequests: 2,
          },
          recommendedFocus: [
            {
              key: "inventory_handoff",
              targetKey: "inventory_handoff",
              targetLabel: "Inventory handoff queue",
              message:
                "Review inventory workbook handoff items before converting candidates.",
              nextAction: "Verify workbook candidates against evidence.",
              count: 2,
            },
          ],
        }}
        observabilityCounters={{}}
        onOpenFocusTarget={onOpenFocusTarget}
      />,
    );

    expect(screen.getByTestId("pilot-triage-inventory-handoff")).toHaveTextContent(
      "2",
    );
    expect(screen.getByTestId("pilot-triage-focus-inventory_handoff")).toHaveTextContent(
      "pilot.triageFocus.inventory_handoff.message",
    );

    fireEvent.click(screen.getByTestId("pilot-triage-focus-inventory_handoff-open-target"));

    expect(onOpenFocusTarget).toHaveBeenCalledWith("inventory_handoff");
  });

  it("separates inventory handoff correction requests from the general correction list", () => {
    const inventoryRequest = {
      id: 301,
      issue_type: "missing-chinese-name",
      cas_number: "84-65-1",
      chemical_name: "Anthraquinone",
      current_output: "Seed dictionary has no trusted Chinese name.",
      expected_output: "Inventory candidate: 蒽醌",
      source: "inventory-workbook-audit",
      status: "open",
      updated_at: "2026-04-18T15:00:00+00:00",
    };
    const props = {
      ...baseProps,
      report: {
        ...baseProps.report,
        dictionary: {
          ...baseProps.report.dictionary,
          inventoryHandoffCorrectionRequests: [inventoryRequest],
          topCorrectionRequests: [
            inventoryRequest,
            ...baseProps.report.dictionary.topCorrectionRequests,
          ],
          pilotTriage: {
            ...baseProps.report.dictionary.pilotTriage,
            attentionCounts: {
              ...baseProps.report.dictionary.pilotTriage.attentionCounts,
              inventoryHandoffRequests: 1,
            },
            recommendedFocus: [
              {
                key: "inventory_handoff",
                targetKey: "inventory_handoff",
                targetLabel: "Inventory handoff queue",
                message: "Review inventory handoff first.",
                nextAction: "Verify evidence before approval.",
                count: 1,
              },
            ],
          },
        },
      },
    };

    render(<PilotDashboardSidebar {...props} />);

    expect(screen.getByText("pilot.inventoryHandoffQueue")).toBeInTheDocument();
    expect(screen.getAllByTestId("correction-request-row-301")).toHaveLength(1);
    expect(screen.getByTestId("correction-request-source-301")).toHaveTextContent(
      "pilot.inventoryHandoffSource",
    );
    expect(
      screen.getByTestId("correction-request-source-review-only-301"),
    ).toHaveTextContent("pilot.inventoryHandoffReviewOnly");
    expect(screen.getByTestId("correction-request-expected-301")).toHaveTextContent(
      "Inventory candidate",
    );
    expect(screen.getByTestId("correction-request-row-201")).toBeInTheDocument();
  });

  it("scrolls to the related admin queue from the primary triage action", async () => {
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-triage-primary-action-open-target"));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
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

  it("updates a correction request from the overview tab", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.change(screen.getByTestId("correction-request-notes-201"), {
      target: { value: "Found supplier SDS evidence" },
    });
    fireEvent.click(screen.getByTestId("candidate-correction-request-201"));

    await waitFor(() => {
      expect(baseProps.onUpdateCorrectionRequestStatus).toHaveBeenCalledWith(201, {
        status: "candidate_found",
        review_notes: "Found supplier SDS evidence",
        candidate: expect.objectContaining({
          schema_version: 1,
          review_required: true,
          approved_for_public_use: false,
          source: "admin-correction-request",
          candidate_type: "missing-chinese-name",
          cas_number: "64-17-5",
          name_en: "Ethanol",
          name_zh: "乙醇",
          evidence_url: "https://example.com/evidence",
          review_notes: "Found supplier SDS evidence",
        }),
      });
    });
  });

  it("renders stored correction candidate evidence as review-only", () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));

    expect(
      screen.getByTestId("correction-request-candidate-recent-202"),
    ).toHaveTextContent("pilot.candidateEvidenceTitle");
    expect(
      screen.getByTestId("correction-request-candidate-recent-202-en"),
    ).toHaveTextContent("Acetone");
    expect(
      screen.getByTestId("correction-request-candidate-recent-202-source"),
    ).toHaveTextContent("admin-correction-request");
  });

  it("creates a pending manual entry from stored correction candidate evidence", async () => {
    render(<PilotDashboardSidebar {...baseProps} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));
    fireEvent.click(
      screen.getByTestId("create-manual-entry-from-candidate-recent-202"),
    );

    await waitFor(() => {
      expect(baseProps.onSaveManualEntry).toHaveBeenCalledWith({
        cas_number: "67-64-1",
        name_en: "Acetone",
        name_zh: "丙酮",
        notes: expect.stringContaining("Correction request #202"),
        source: "correction-request",
        status: "pending",
      });
    });
    expect(baseProps.onUpdateCorrectionRequestStatus).toHaveBeenCalledWith(
      202,
      expect.objectContaining({
        status: "candidate_found",
        candidate: expect.objectContaining({
          cas_number: "67-64-1",
          converted_to_manual_entry: true,
          manual_entry_status: "pending",
          public_data_changed: false,
        }),
      }),
    );
  });

  it("does not create duplicate manual entries from converted candidates", () => {
    const props = {
      ...baseProps,
      correctionRequests: [
        {
          id: 303,
          issue_type: "missing-chinese-name",
          cas_number: "64-17-5",
          chemical_name: "Ethanol",
          candidate: {
            cas_number: "64-17-5",
            name_en: "Ethanol",
            name_zh: "\u4e59\u9187",
            source: "admin-correction-request",
            converted_to_manual_entry: true,
            manual_entry_status: "pending",
          },
          status: "candidate_found",
          updated_at: "2026-04-18T14:00:00+00:00",
        },
      ],
    };

    render(<PilotDashboardSidebar {...props} />);

    fireEvent.click(screen.getByTestId("pilot-tab-dictionary"));

    expect(
      screen.getByTestId("correction-request-candidate-recent-303-manual-pending"),
    ).toHaveTextContent("pilot.candidateManualEntryPendingHint");
    expect(
      screen.queryByTestId("create-manual-entry-from-candidate-recent-303"),
    ).not.toBeInTheDocument();
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

    const correctionRows = screen.getAllByTestId(/^correction-request-recent-row-/);
    expect(correctionRows[0]).toHaveTextContent("dataQuality.issue.sourceConflict");
    expect(correctionRows[0]).toHaveTextContent("source-conflict");
    expect(correctionRows[1]).toHaveTextContent(
      "dataQuality.issue.missingChineseName"
    );
    expect(correctionRows[1]).toHaveTextContent("missing-chinese-name");
    expect(screen.getByTestId("correction-request-recent-status-202")).toHaveTextContent(
      "pilot.correctionStatusCandidateFound"
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
