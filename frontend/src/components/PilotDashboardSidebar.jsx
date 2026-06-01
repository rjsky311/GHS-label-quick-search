import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  ShieldAlert,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  ConvertedCorrectionCandidatesSection,
  InventoryHandoffQueueSummary,
  RecentCorrectionRequestsSection,
  TopCorrectionRequestsSection,
} from "@/components/pilot/PilotCorrectionRequestSections";
import PilotDictionaryForms from "@/components/pilot/PilotDictionaryForms";
import PilotRecentCurationLists from "@/components/pilot/PilotRecentCurationLists";
import PilotTriagePanel from "@/components/pilot/PilotTriagePanel";
import {
  CurationStatusSummary,
  SectionHeading,
  SummaryCard,
} from "@/components/pilot/PilotDashboardPrimitives";
import {
  ALIAS_STATUS_OPTIONS,
  CORRECTION_REQUEST_STATUS_OPTIONS,
  MANUAL_ENTRY_STATUS_OPTIONS,
  REFERENCE_LINK_STATUS_OPTIONS,
  curationTimestamp,
  sortNewestFirst,
} from "@/components/pilot/pilotDashboardHelpers";
import {
  buildCorrectionCandidateEvidence,
  buildCorrectionRequestManualEntryConversionPayload,
  buildManualEntryPayloadFromCorrectionCandidate,
} from "@/utils/correctionCandidates";
import { formatRelativeTime } from "@/utils/formatDate";
import { hasCjkText } from "@/utils/ghsText";

const TRIAGE_TARGET_TABS = {
  correction_requests: "overview",
  inventory_handoff: "overview",
  converted_candidates: "overview",
  manual_entries: "overview",
  needs_evidence: "overview",
  miss_queries: "overview",
  alias_review: "overview",
  reference_links: "dictionary",
};

const INVENTORY_HANDOFF_SOURCE = "inventory-workbook-audit";
const CORRECTION_REQUEST_REVIEW_STATUSES = new Set(["open", "candidate_found"]);
const INVENTORY_HANDOFF_ISSUE_PRIORITY = {
  "missing-chinese-name": 0,
  "unresolved-search": 1,
  "no-ghs-data": 2,
  "source-conflict": 3,
  "reference-link": 4,
  "ghs-text-no-pictograms": 5,
  "other-data-quality": 6,
};

const normalizeTriageTargetKey = (targetKey = "") =>
  String(targetKey).replace(/[^A-Za-z0-9_-]/g, "");

const correctionRequestIssueType = (item = {}) =>
  item.issue_type || item.issueType || "other-data-quality";

const correctionRequestStatus = (item = {}) => item.status || "open";

const isInventoryHandoffCorrectionRequest = (item = {}) =>
  item.source === INVENTORY_HANDOFF_SOURCE &&
  CORRECTION_REQUEST_REVIEW_STATUSES.has(correctionRequestStatus(item));

const sortInventoryHandoffCorrectionRequests = (items = []) =>
  [...items].sort((a, b) => {
    const issuePriorityDiff =
      (INVENTORY_HANDOFF_ISSUE_PRIORITY[correctionRequestIssueType(a)] ?? 99) -
      (INVENTORY_HANDOFF_ISSUE_PRIORITY[correctionRequestIssueType(b)] ?? 99);
    if (issuePriorityDiff !== 0) return issuePriorityDiff;

    const duplicateDiff =
      Number(b.duplicate_count || b.duplicateCount || 1) -
      Number(a.duplicate_count || a.duplicateCount || 1);
    if (duplicateDiff !== 0) return duplicateDiff;

    const timeDiff =
      Date.parse(curationTimestamp(b) || "") -
      Date.parse(curationTimestamp(a) || "");
    if (!Number.isNaN(timeDiff) && timeDiff !== 0) return timeDiff;

    return String(a.cas_number || a.casNumber || "").localeCompare(
      String(b.cas_number || b.casNumber || ""),
    );
  });

export default function PilotDashboardSidebar(props) {
  const {
    report,
    aliases = [],
    manualEntries = [],
    referenceLinks = [],
    correctionRequests = [],
    loading,
    saving = false,
    error = "",
    onClose,
    onRefresh,
    onExportObservabilityReport,
    onSaveManualEntry,
    onSaveAlias,
    onSaveReferenceLink,
    onResolveMissQuery,
    onPurgeStaleMissQueries,
    onUpdateCorrectionRequestStatus,
  } = props;
  const { t } = useTranslation();
  const panelRef = useFocusTrap(onClose);
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingTriageTarget, setPendingTriageTarget] = useState("");
  const [manualEntryForm, setManualEntryForm] = useState({
    cas_number: "",
    name_en: "",
    name_zh: "",
    notes: "",
    status: "approved",
  });
  const [aliasForm, setAliasForm] = useState({
    alias_text: "",
    locale: "en",
    cas_number: "",
    status: "approved",
    notes: "",
  });
  const [referenceForm, setReferenceForm] = useState({
    cas_number: "",
    label: "",
    url: "",
    link_type: "reference",
    priority: "50",
    status: "active",
  });
  const [missResolutionDrafts, setMissResolutionDrafts] = useState({});
  const [correctionReviewDrafts, setCorrectionReviewDrafts] = useState({});
  const [inventoryHandoffIssueFilter, setInventoryHandoffIssueFilter] =
    useState("all");

  const dictionary = report?.dictionary || {};
  const counters = report?.counters || {};
  const recentEvents = report?.recentEvents || [];
  const missQueries = dictionary.topMissQueries || [];
  const missStatusCounts = dictionary.missQueryStatusCounts || {};
  const pilotTriage = dictionary.pilotTriage || {};
  const manualEntryStatusCounts = dictionary.manualEntryStatusCounts || {};
  const aliasStatusCounts = dictionary.aliasStatusCounts || {};
  const referenceLinkStatusCounts = dictionary.referenceLinkStatusCounts || {};
  const correctionRequestStatusCounts =
    dictionary.correctionRequestStatusCounts || {};
  const inventoryHandoffIssueTypeCounts =
    pilotTriage.inventoryHandoffIssueTypeCounts || {};
  const missRetention = dictionary.missQueryRetention || {};
  const pendingAliases = dictionary.pendingAliases || [];
  const pendingManualEntries = dictionary.pendingManualEntries || [];
  const correctionRequestById = useMemo(
    () =>
      new Map(
        correctionRequests
          .map((item) => [item?.id || item?.requestId, item])
          .filter(([id]) => id != null),
      ),
    [correctionRequests],
  );
  const topCorrectionRequests = useMemo(
    () =>
      (dictionary.topCorrectionRequests || []).map((item) => {
        const fallback = correctionRequestById.get(item?.id || item?.requestId);
        if (!fallback) return item;
        return {
          ...fallback,
          ...item,
          duplicate_count:
            item.duplicate_count ??
            item.duplicateCount ??
            fallback.duplicate_count ??
            fallback.duplicateCount,
        };
      }),
    [correctionRequestById, dictionary.topCorrectionRequests],
  );
  const inventoryHandoffCorrectionRequests = useMemo(() => {
    const fullInventoryQueue = correctionRequests.filter(
      (item) => item.source === INVENTORY_HANDOFF_SOURCE,
    );
    if (fullInventoryQueue.length > 0) {
      return sortInventoryHandoffCorrectionRequests(
        fullInventoryQueue.filter(isInventoryHandoffCorrectionRequest),
      );
    }
    const summaryQueue =
      dictionary.inventoryHandoffCorrectionRequests?.length > 0
        ? dictionary.inventoryHandoffCorrectionRequests
        : topCorrectionRequests.filter(
            (item) => item.source === INVENTORY_HANDOFF_SOURCE
          );
    return sortInventoryHandoffCorrectionRequests(
      summaryQueue.filter(isInventoryHandoffCorrectionRequest),
    );
  }, [
    correctionRequests,
    dictionary.inventoryHandoffCorrectionRequests,
    topCorrectionRequests,
  ]);
  const inventoryHandoffTotalCount =
    pilotTriage.attentionCounts?.inventoryHandoffRequests ||
    inventoryHandoffCorrectionRequests.length;
  const visibleInventoryHandoffCorrectionRequests =
    inventoryHandoffIssueFilter === "all"
      ? inventoryHandoffCorrectionRequests
      : inventoryHandoffCorrectionRequests.filter(
          (item) =>
            correctionRequestIssueType(item) === inventoryHandoffIssueFilter
        );
  const inventoryHandoffRequestIds = new Set(
    inventoryHandoffCorrectionRequests.map((item) => item.id).filter(Boolean)
  );
  const generalTopCorrectionRequests = topCorrectionRequests.filter(
    (item) =>
      item.source !== INVENTORY_HANDOFF_SOURCE &&
      !inventoryHandoffRequestIds.has(item.id)
  );
  const convertedCorrectionCandidates =
    dictionary.convertedCorrectionCandidates || [];
  const recentManualEntries = useMemo(
    () => sortNewestFirst(manualEntries, (entry) => entry.cas_number).slice(0, 8),
    [manualEntries]
  );
  const recentAliases = useMemo(
    () =>
      sortNewestFirst(
        aliases,
        (alias) => `${alias.alias_text || ""}-${alias.cas_number || ""}`
      ).slice(0, 8),
    [aliases]
  );
  const recentReferenceLinks = useMemo(
    () =>
      sortNewestFirst(referenceLinks, (link) => link.casNumber || link.cas_number).slice(
        0,
        8
      ),
    [referenceLinks]
  );
  const recentCorrectionRequests = useMemo(
    () =>
      sortNewestFirst(
        correctionRequests,
        (item) =>
          `${item.issue_type || item.issueType || ""}-${item.cas_number || item.casNumber || ""}`
      ).slice(0, 8),
    [correctionRequests]
  );

  const openTriageTarget = (targetKey) => {
    const normalizedTargetKey = normalizeTriageTargetKey(targetKey);
    if (!normalizedTargetKey) {
      return;
    }
    setPendingTriageTarget(normalizedTargetKey);
    setActiveTab(TRIAGE_TARGET_TABS[normalizedTargetKey] || "overview");
  };

  useEffect(() => {
    if (!pendingTriageTarget) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const target = document.querySelector(
        `[data-triage-targets~="${pendingTriageTarget}"]`
      );
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
        if (typeof target.focus === "function") {
          target.focus({ preventScroll: true });
        }
      }
      setPendingTriageTarget("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, pendingTriageTarget]);

  const submitManualEntry = async (event) => {
    event.preventDefault();
    const trimmedChineseName = manualEntryForm.name_zh.trim();
    if (trimmedChineseName && !hasCjkText(trimmedChineseName)) {
      toast.error(
        t("pilot.manualChineseNameRequiresCjk", {
          defaultValue:
            "Chinese name must contain Chinese characters. Put English aliases in the English name or alias fields.",
        })
      );
      return;
    }

    try {
      const payload = {
        cas_number: manualEntryForm.cas_number.trim(),
        name_en: manualEntryForm.name_en.trim() || null,
        name_zh: trimmedChineseName || null,
        notes: manualEntryForm.notes.trim(),
      };
      if (manualEntryForm.status !== "approved") {
        payload.status = manualEntryForm.status;
      }
      await onSaveManualEntry(payload);
      toast.success(
        t("pilot.manualEntrySaved", { defaultValue: "Manual dictionary entry saved." })
      );
      setManualEntryForm({
        cas_number: "",
        name_en: "",
        name_zh: "",
        notes: "",
        status: "approved",
      });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.manualEntryFailed", {
            defaultValue: "Failed to save manual dictionary entry.",
          })
      );
    }
  };

  const submitAlias = async (event) => {
    event.preventDefault();
    try {
      await onSaveAlias({
        alias_text: aliasForm.alias_text.trim(),
        locale: aliasForm.locale,
        cas_number: aliasForm.cas_number.trim(),
        status: aliasForm.status,
        notes: aliasForm.notes.trim(),
      });
      toast.success(t("pilot.aliasSaved", { defaultValue: "Alias saved." }));
      setAliasForm({
        alias_text: "",
        locale: aliasForm.locale,
        cas_number: "",
        status: "approved",
        notes: "",
      });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.aliasFailed", { defaultValue: "Failed to save alias." })
      );
    }
  };

  const submitReferenceLink = async (event) => {
    event.preventDefault();
    try {
      await onSaveReferenceLink({
        cas_number: referenceForm.cas_number.trim(),
        label: referenceForm.label.trim(),
        url: referenceForm.url.trim(),
        link_type: referenceForm.link_type,
        priority: Number(referenceForm.priority || 50),
        status: referenceForm.status,
      });
      toast.success(
        t("pilot.referenceSaved", { defaultValue: "Reference link saved." })
      );
      setReferenceForm({
        cas_number: "",
        label: "",
        url: "",
        link_type: referenceForm.link_type,
        priority: "50",
        status: "active",
      });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.referenceFailed", {
            defaultValue: "Failed to save reference link.",
          })
      );
    }
  };

  const handleReferenceLinkStatusUpdate = async (link, status) => {
    try {
      await onSaveReferenceLink({
        cas_number: link.casNumber,
        label: link.label,
        url: link.url,
        link_type: link.linkType || "reference",
        priority: Number(link.priority ?? 50),
        status,
        cid: link.cid ?? undefined,
      });
      toast.success(
        status === "active"
          ? t("pilot.referenceActivated", {
              defaultValue: "Reference link activated.",
            })
          : t("pilot.referenceDeactivated", {
              defaultValue: "Reference link deactivated.",
            })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.referenceStatusFailed", {
            defaultValue: "Failed to update reference link status.",
          })
      );
    }
  };

  const handlePendingAliasDecision = async (alias, status) => {
    try {
      await onSaveAlias({
        alias_text: alias.alias_text,
        locale: alias.locale,
        cas_number: alias.cas_number,
        status,
        notes: alias.notes || "",
      });
      if (status === "approved") {
        toast.success(t("pilot.aliasApproved", { defaultValue: "Alias approved." }));
      } else if (status === "needs_evidence") {
        toast.success(
          t("pilot.aliasNeedsEvidence", {
            defaultValue: "Alias marked as needs evidence.",
          })
        );
      } else {
        toast.success(t("pilot.aliasRejected", { defaultValue: "Alias rejected." }));
      }
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.aliasDecisionFailed", {
            defaultValue: "Failed to update alias status.",
          })
      );
    }
  };

  const handleAliasStatusUpdate = async (alias, status) => {
    try {
      await onSaveAlias({
        alias_text: alias.alias_text,
        locale: alias.locale,
        cas_number: alias.cas_number,
        status,
        notes: alias.notes || "",
      });
      if (status === "approved") {
        toast.success(t("pilot.aliasApproved", { defaultValue: "Alias approved." }));
      } else if (status === "needs_evidence") {
        toast.success(
          t("pilot.aliasNeedsEvidence", {
            defaultValue: "Alias marked as needs evidence.",
          })
        );
      } else {
        toast.success(t("pilot.aliasRejected", { defaultValue: "Alias rejected." }));
      }
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.aliasDecisionFailed", {
            defaultValue: "Failed to update alias status.",
          })
      );
    }
  };

  const handlePendingManualEntryDecision = async (entry, status) => {
    if (!entry?.cas_number || !onSaveManualEntry) return;
    try {
      await onSaveManualEntry({
        cas_number: entry.cas_number,
        name_en: entry.name_en || null,
        name_zh: entry.name_zh || null,
        notes: entry.notes || "",
        source: entry.source || "manual",
        status,
      });
      toast.success(
        status === "approved"
          ? t("pilot.manualEntryApproved", {
              defaultValue: "Manual dictionary entry approved.",
            })
          : status === "needs_evidence"
            ? t("pilot.manualEntryNeedsEvidence", {
                defaultValue: "Manual dictionary entry marked as needs evidence.",
              })
            : t("pilot.manualEntryRejected", {
                defaultValue: "Manual dictionary entry rejected.",
              })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.manualEntryDecisionFailed", {
            defaultValue: "Failed to update manual dictionary entry status.",
          })
      );
    }
  };

  const handleMissQueryResolution = async (item, status) => {
    const missId = item?.id;
    if (!missId || !onResolveMissQuery) return;
    const resolvedCas =
      status === "resolved" ? (missResolutionDrafts[missId] || "").trim() : null;
    if (status === "resolved" && !resolvedCas) {
      toast.error(
        t("pilot.missResolvedCasRequired", {
          defaultValue: "Enter a CAS number before marking this query resolved.",
        })
      );
      return;
    }

    try {
      await onResolveMissQuery(missId, {
        resolution_status: status,
        resolved_cas: resolvedCas,
      });
      if (status === "resolved") {
        setMissResolutionDrafts((prev) => ({ ...prev, [missId]: "" }));
      }
      toast.success(
        status === "resolved"
          ? t("pilot.missResolved", { defaultValue: "Miss query marked resolved." })
          : status === "needs_evidence"
            ? t("pilot.missNeedsEvidence", {
                defaultValue: "Miss query marked as needs evidence.",
              })
            : t("pilot.missIgnored", { defaultValue: "Miss query ignored." })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.missDecisionFailed", {
            defaultValue: "Failed to update miss query.",
          })
      );
    }
  };

  const handleCorrectionRequestStatusUpdate = async (item, status) => {
    const requestId = item?.id;
    if (!requestId || !onUpdateCorrectionRequestStatus) return;
    const draftNotes = (correctionReviewDrafts[requestId] || "").trim();
    try {
      const payload = {
        status,
        review_notes: draftNotes || item?.review_notes || item?.reviewNotes || null,
      };
      if (status === "candidate_found") {
        payload.candidate = buildCorrectionCandidateEvidence(item, draftNotes);
      }
      await onUpdateCorrectionRequestStatus(requestId, payload);
      if (draftNotes) {
        setCorrectionReviewDrafts((prev) => ({ ...prev, [requestId]: "" }));
      }
      toast.success(
        t("pilot.correctionRequestUpdated", {
          defaultValue: "Correction request updated.",
        })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.correctionRequestUpdateFailed", {
            defaultValue: "Failed to update correction request.",
          })
      );
    }
  };

  const handleCreateManualEntryFromCandidate = async (item) => {
    if (!onSaveManualEntry) return;
    const requestId = item?.id;
    const draftNotes = requestId
      ? (correctionReviewDrafts[requestId] || "").trim()
      : "";
    const payload = buildManualEntryPayloadFromCorrectionCandidate(
      item,
      draftNotes,
    );
    if (!payload) {
      toast.error(
        t("pilot.candidateManualEntryMissingIdentity", {
          defaultValue:
            "Candidate needs a CAS number and at least one name before it can become a review entry.",
        })
      );
      return;
    }

    try {
      await onSaveManualEntry(payload);
      if (requestId && onUpdateCorrectionRequestStatus) {
        const statusPayload = buildCorrectionRequestManualEntryConversionPayload(
          item,
          draftNotes,
        );
        await onUpdateCorrectionRequestStatus(requestId, statusPayload);
        if (draftNotes) {
          setCorrectionReviewDrafts((prev) => ({ ...prev, [requestId]: "" }));
        }
      }
      toast.success(
        t("pilot.candidateManualEntryCreated", {
          defaultValue: "Pending manual dictionary review entry created.",
        })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.candidateManualEntryFailed", {
            defaultValue:
              "Failed to create or link the pending manual dictionary entry.",
          })
      );
    }
  };

  const handlePurgeStaleMissQueries = async () => {
    if (!onPurgeStaleMissQueries) return;
    const purgeableCount = Number(missRetention.purgeableCount || 0);
    if (purgeableCount <= 0) {
      toast.success(
        t("pilot.noStaleMissQueries", {
          defaultValue: "No stale miss-query rows need cleanup.",
        })
      );
      return;
    }
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        t("pilot.purgeMissConfirm", {
          defaultValue:
            "Delete stale miss-query telemetry outside the retention window?",
        })
      );
    if (!confirmed) return;

    try {
      const result = await onPurgeStaleMissQueries({
        retention_days: missRetention.retentionDays || 90,
      });
      toast.success(
        t("pilot.purgeMissDone", {
          count: result?.retention?.deletedCount || 0,
          defaultValue: "Stale miss-query rows cleaned up.",
        })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.purgeMissFailed", {
            defaultValue: "Failed to clean up stale miss-query rows.",
          })
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("pilot.sidebarTitle", { defaultValue: "Pilot dashboard" })}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2 text-slate-950">
                <Activity className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">
                  {t("pilot.sidebarTitle", { defaultValue: "Admin dashboard" })}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {t("pilot.sidebarSubtitle", {
                  defaultValue:
                    "Review pilot health, unresolved lookups, and dictionary growth tasks. This surface is for admin-only curation.",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                data-testid="pilot-refresh-btn"
              >
                <RefreshCw className="mr-1 inline h-4 w-4" />
                {t("pilot.refresh", { defaultValue: "Refresh" })}
              </button>
              <button
                type="button"
                onClick={onExportObservabilityReport}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-800"
                data-testid="pilot-export-report-btn"
              >
                {t("pilot.export", { defaultValue: "Export report" })}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900"
                data-testid="close-pilot-dashboard-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {[
              ["overview", t("pilot.overview", { defaultValue: "Overview" })],
              ["dictionary", t("pilot.dictionary", { defaultValue: "Curation" })],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
                data-testid={`pilot-tab-${tab}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-4">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
              {t("pilot.loading", { defaultValue: "Loading pilot dashboard..." })}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && activeTab === "overview" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryCard
                  label={t("pilot.pendingAliases", { defaultValue: "Pending aliases" })}
                  value={dictionary.pendingAliasCount || 0}
                  accent="text-blue-700"
                  testId="pilot-summary-pending-aliases"
                />
                <SummaryCard
                  label={t("pilot.openMissQueries", { defaultValue: "Open miss queries" })}
                  value={dictionary.openMissQueryCount || 0}
                  accent="text-amber-700"
                  testId="pilot-summary-open-miss-queries"
                />
                <SummaryCard
                  label={t("pilot.openCorrectionRequests", {
                    defaultValue: "Open corrections",
                  })}
                  value={dictionary.openCorrectionRequestCount || 0}
                  accent="text-orange-700"
                  testId="pilot-summary-open-correction-requests"
                />
                <SummaryCard
                  label={t("pilot.manualEntries", { defaultValue: "Manual entries" })}
                  value={dictionary.manualEntryCount || 0}
                  accent="text-emerald-700"
                  testId="pilot-summary-manual-entries"
                />
                <SummaryCard
                  label={t("pilot.pendingManualEntries", {
                    defaultValue: "Manual entries in review",
                  })}
                  value={dictionary.pendingManualEntryCount || 0}
                  accent="text-orange-700"
                  testId="pilot-summary-pending-manual-entries"
                />
                <SummaryCard
                  label={t("pilot.convertedCorrectionCandidates", {
                    defaultValue: "Corrections in manual review",
                  })}
                  value={dictionary.convertedCorrectionCandidateCount || 0}
                  accent="text-amber-700"
                  testId="pilot-summary-converted-correction-candidates"
                />
                <SummaryCard
                  label={t("pilot.referenceLinks", { defaultValue: "Reference links" })}
                  value={dictionary.referenceLinkCount || 0}
                  accent="text-violet-700"
                  testId="pilot-summary-reference-links"
                />
                <SummaryCard
                  label={t("pilot.cacheStaleHits", { defaultValue: "Stale cache hits" })}
                  value={counters["cache.ghs.stale_hit"] || 0}
                  testId="pilot-summary-cache-stale-hits"
                />
                <SummaryCard
                  label={t("pilot.upstreamErrors", { defaultValue: "Upstream errors" })}
                  value={counters["upstream.total"] || 0}
                  accent="text-red-700"
                  testId="pilot-summary-upstream-errors"
                />
                <SummaryCard
                  label={t("pilot.staleMissRows", { defaultValue: "Stale miss rows" })}
                  value={missRetention.purgeableCount || 0}
                  accent="text-orange-700"
                  testId="pilot-summary-stale-miss-rows"
                />
              </div>
              <PilotTriagePanel
                pilotTriage={pilotTriage}
                observabilityCounters={counters}
                onOpenFocusTarget={openTriageTarget}
              />
              <CurationStatusSummary
                title={t("pilot.manualEntryStatusSummary", {
                  defaultValue: "Manual entry review",
                })}
                options={MANUAL_ENTRY_STATUS_OPTIONS}
                counts={manualEntryStatusCounts}
                testIdPrefix="manual-entry-status-count"
              />
              <CurationStatusSummary
                title={t("pilot.aliasStatusSummary", {
                  defaultValue: "Alias review",
                })}
                options={ALIAS_STATUS_OPTIONS}
                counts={aliasStatusCounts}
                testIdPrefix="alias-status-count"
              />
              <CurationStatusSummary
                title={t("pilot.referenceLinkStatusSummary", {
                  defaultValue: "Reference link status",
                })}
                options={REFERENCE_LINK_STATUS_OPTIONS}
                counts={referenceLinkStatusCounts}
                testIdPrefix="reference-link-status-count"
              />
              <CurationStatusSummary
                title={t("pilot.correctionRequestStatusSummary", {
                  defaultValue: "Correction intake",
                })}
                options={CORRECTION_REQUEST_STATUS_OPTIONS}
                counts={correctionRequestStatusCounts}
                testIdPrefix="correction-request-status-count"
              />

              <div
                data-triage-targets="converted_candidates candidate_found"
                tabIndex={-1}
              >
                <ConvertedCorrectionCandidatesSection
                  items={convertedCorrectionCandidates}
                  saving={saving}
                />
              </div>
              {inventoryHandoffCorrectionRequests.length > 0 ? (
                <div
                  className="space-y-3"
                  data-triage-targets="inventory_handoff correction_requests correction_intake missing_chinese_names no_ghs_gaps source_conflicts needs_evidence"
                  tabIndex={-1}
                >
                  <InventoryHandoffQueueSummary
                    items={inventoryHandoffCorrectionRequests}
                    issueTypeCounts={inventoryHandoffIssueTypeCounts}
                    totalCount={inventoryHandoffTotalCount}
                    activeIssueType={inventoryHandoffIssueFilter}
                    filteredCount={visibleInventoryHandoffCorrectionRequests.length}
                    onIssueTypeChange={setInventoryHandoffIssueFilter}
                  />
                  <TopCorrectionRequestsSection
                    items={visibleInventoryHandoffCorrectionRequests}
                    saving={saving}
                    correctionReviewDrafts={correctionReviewDrafts}
                    setCorrectionReviewDrafts={setCorrectionReviewDrafts}
                    onStatusUpdate={handleCorrectionRequestStatusUpdate}
                    onCreateManualEntry={handleCreateManualEntryFromCandidate}
                    title={t("pilot.inventoryHandoffQueue", {
                      defaultValue: "Inventory handoff queue",
                    })}
                    subtitle={t("pilot.inventoryHandoffQueueHint", {
                      defaultValue:
                        "Workbook candidates and seed-dictionary gaps imported for review only. Verify evidence before converting anything into public dictionary data.",
                    })}
                    emptyText={t("pilot.noInventoryHandoffRequests", {
                      defaultValue: "No inventory handoff items are waiting.",
                    })}
                    sectionClassName="rounded-lg border border-cyan-200 bg-cyan-50 p-4"
                  />
                </div>
              ) : null}
              {generalTopCorrectionRequests.length > 0 ||
              inventoryHandoffCorrectionRequests.length === 0 ? (
                <div
                  data-triage-targets="correction_requests correction_intake missing_chinese_names no_ghs_gaps source_conflicts needs_evidence"
                  tabIndex={-1}
                >
                  <TopCorrectionRequestsSection
                    items={generalTopCorrectionRequests}
                    saving={saving}
                    correctionReviewDrafts={correctionReviewDrafts}
                    setCorrectionReviewDrafts={setCorrectionReviewDrafts}
                    onStatusUpdate={handleCorrectionRequestStatusUpdate}
                    onCreateManualEntry={handleCreateManualEntryFromCandidate}
                  />
                </div>
              ) : null}

              <section
                className="rounded-lg border border-slate-200 bg-white p-4"
                data-triage-targets="miss_queries unresolved_searches telemetry_retention"
                tabIndex={-1}
              >
                <SectionHeading
                  icon={ShieldAlert}
                  title={t("pilot.missQueries", { defaultValue: "Top miss queries" })}
                  subtitle={t("pilot.missQueriesHint", {
                    defaultValue:
                      "These are the unresolved searches that are most worth backfilling into the dictionary.",
                  })}
                />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div>
                    <div className="font-medium text-slate-800">
                      {t("pilot.missRetentionTitle", {
                        defaultValue: "Telemetry retention",
                      })}
                    </div>
                    <div className="mt-1">
                      {t("pilot.missRetentionSummary", {
                        count: missRetention.purgeableCount || 0,
                        days: missRetention.retentionDays || 90,
                        retained: missRetention.retainedNeedsEvidenceCount || 0,
                        defaultValue:
                          "{{count}} stale row(s) outside {{days}} days; {{retained}} needs-evidence row(s) retained.",
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePurgeStaleMissQueries}
                    disabled={saving || !onPurgeStaleMissQueries}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    data-testid="purge-stale-miss-queries-btn"
                  >
                    <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                    {t("pilot.purgeStaleMissQueries", {
                      defaultValue: "Clean stale rows",
                    })}
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  {[
                    ["open", t("pilot.missStatusOpen", { defaultValue: "Open" })],
                    [
                      "needs_evidence",
                      t("pilot.missStatusNeedsEvidence", {
                        defaultValue: "Needs evidence",
                      }),
                    ],
                    ["resolved", t("pilot.missStatusResolved", { defaultValue: "Resolved" })],
                    ["ignored", t("pilot.missStatusIgnored", { defaultValue: "Ignored" })],
                  ].map(([status, label]) => (
                    <span
                      key={status}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600"
                      data-testid={`miss-query-status-count-${status}`}
                    >
                      {label}: {missStatusCounts[status] || 0}
                    </span>
                  ))}
                </div>
                {missQueries.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t("pilot.noMissQueries", {
                      defaultValue: "No unresolved queries recorded yet.",
                    })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missQueries.map((item, index) => {
                      const missId = item.id || `${item.query_text}-${index}`;
                      return (
                      <div
                        key={`${item.query_text}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{item.query_text}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.query_kind} | {item.endpoint} | {item.hit_count}x
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {t("pilot.missStatus", { defaultValue: "Status" })}:{" "}
                              {item.resolution_status || "open"}
                              {item.resolved_cas ? ` | ${item.resolved_cas}` : ""}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatRelativeTime(item.last_seen_at)}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            value={missResolutionDrafts[missId] || ""}
                            onChange={(event) =>
                              setMissResolutionDrafts((prev) => ({
                                ...prev,
                                [missId]: event.target.value,
                              }))
                            }
                            placeholder={t("pilot.missResolvedCasPlaceholder", {
                              defaultValue: "Resolved CAS",
                            })}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            data-testid={`miss-query-resolved-cas-${missId}`}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleMissQueryResolution(item, "resolved")}
                              disabled={saving || !item.id}
                              className="rounded bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`resolve-miss-query-${missId}`}
                            >
                              {t("pilot.resolveMiss", { defaultValue: "Resolve" })}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMissQueryResolution(item, "needs_evidence")}
                              disabled={saving || !item.id}
                              className="rounded bg-amber-600 px-3 py-2 text-xs text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`needs-evidence-miss-query-${missId}`}
                            >
                              {t("pilot.needsEvidence", { defaultValue: "Needs evidence" })}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMissQueryResolution(item, "ignored")}
                              disabled={saving || !item.id}
                              className="rounded bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`ignore-miss-query-${missId}`}
                            >
                              {t("pilot.ignoreMiss", { defaultValue: "Ignore" })}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </section>

              <section
                className="rounded-lg border border-slate-200 bg-white p-4"
                data-triage-targets="alias_review"
                tabIndex={-1}
              >
                <SectionHeading
                  icon={Tags}
                  title={t("pilot.pendingAliasReview", { defaultValue: "Pending alias review" })}
                  subtitle={t("pilot.pendingAliasReviewHint", {
                    defaultValue:
                      "PubChem synonym candidates land here first. Approve only the ones you actually want to resolve in-app.",
                  })}
                />
                {pendingAliases.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t("pilot.noPendingAliases", {
                      defaultValue: "No pending aliases right now.",
                    })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingAliases.map((alias) => (
                      <div
                        key={`${alias.locale}-${alias.alias_text}-${alias.cas_number}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">{alias.alias_text}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {alias.cas_number} | {alias.locale} | {alias.hit_count}x
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handlePendingAliasDecision(alias, "approved")}
                              disabled={saving}
                              className="rounded bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`approve-alias-${alias.alias_text}`}
                            >
                              {t("pilot.approve", { defaultValue: "Approve" })}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePendingAliasDecision(alias, "needs_evidence")}
                              disabled={saving}
                              className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`needs-evidence-alias-${alias.alias_text}`}
                            >
                              {t("pilot.needsEvidence", { defaultValue: "Needs evidence" })}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePendingAliasDecision(alias, "rejected")}
                              disabled={saving}
                              className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`reject-alias-${alias.alias_text}`}
                            >
                              {t("pilot.reject", { defaultValue: "Reject" })}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {pendingManualEntries.length > 0 ? (
                <section
                  className="rounded-lg border border-orange-200 bg-orange-50 p-4"
                  data-triage-targets="manual_entries manual_review needs_evidence"
                  tabIndex={-1}
                >
                  <SectionHeading
                    icon={Database}
                    title={t("pilot.manualEntriesNeedReview", {
                      defaultValue: "Manual entries need review",
                    })}
                    subtitle={t("pilot.manualEntriesNeedReviewHint", {
                      defaultValue:
                        "Pending entries are kept for curation, but do not affect public lookup, labels, or exports until approved.",
                    })}
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    {pendingManualEntries.map((entry) => (
                      <div
                        key={`${entry.cas_number}-${entry.status}`}
                        className="rounded-lg border border-orange-200 bg-white p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono font-medium text-orange-800">
                              {entry.cas_number}
                            </div>
                            <div className="mt-1 text-slate-900">{entry.name_en || "-"}</div>
                            <div className="text-slate-500">{entry.name_zh || "-"}</div>
                            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-700">
                              {entry.status}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handlePendingManualEntryDecision(entry, "approved")
                              }
                              disabled={saving}
                              className="rounded bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`approve-manual-entry-${entry.cas_number}`}
                            >
                              {t("pilot.approve", { defaultValue: "Approve" })}
                            </button>
                            {entry.status !== "needs_evidence" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePendingManualEntryDecision(entry, "needs_evidence")
                                }
                                disabled={saving}
                                className="rounded bg-amber-700 px-3 py-1 text-xs text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
                                data-testid={`needs-evidence-manual-entry-${entry.cas_number}`}
                              >
                                {t("pilot.needsEvidence", {
                                  defaultValue: "Needs evidence",
                                })}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                handlePendingManualEntryDecision(entry, "rejected")
                              }
                              disabled={saving}
                              className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                              data-testid={`reject-manual-entry-${entry.cas_number}`}
                            >
                              {t("pilot.reject", { defaultValue: "Reject" })}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <SectionHeading
                  icon={Database}
                  title={t("pilot.recentOps", { defaultValue: "Recent backend events" })}
                />
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t("pilot.noRecentOps", {
                      defaultValue: "No backend events recorded yet.",
                    })}
                  </p>
                ) : (
                  <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-900">
                      {t("pilot.recentOpsSummary", {
                        defaultValue: "Show raw backend events",
                      })}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {recentEvents.slice(0, 8).map((item, index) => (
                        <div
                          key={`${item.ts}-${item.type}-${index}`}
                          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{item.type}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {JSON.stringify(item)}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatRelativeTime(item.ts)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            </>
          ) : null}

          {!loading && activeTab === "dictionary" ? (
            <>
              <div data-triage-targets="reference_links reference_link_review" tabIndex={-1}>
                <PilotDictionaryForms
                  manualEntryForm={manualEntryForm}
                  setManualEntryForm={setManualEntryForm}
                  submitManualEntry={submitManualEntry}
                  aliasForm={aliasForm}
                  setAliasForm={setAliasForm}
                  submitAlias={submitAlias}
                  referenceForm={referenceForm}
                  setReferenceForm={setReferenceForm}
                  submitReferenceLink={submitReferenceLink}
                  saving={saving}
                />
              </div>

              <RecentCorrectionRequestsSection
                items={recentCorrectionRequests}
                saving={saving}
                onCreateManualEntry={handleCreateManualEntryFromCandidate}
              />

              <PilotRecentCurationLists
                recentAliases={recentAliases}
                recentManualEntries={recentManualEntries}
                recentReferenceLinks={recentReferenceLinks}
                saving={saving}
                onAliasStatusUpdate={handleAliasStatusUpdate}
                onManualEntryStatusUpdate={handlePendingManualEntryDecision}
                onReferenceLinkStatusUpdate={handleReferenceLinkStatusUpdate}
                t={t}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
