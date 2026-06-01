import { BookPlus, ExternalLink, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import CorrectionCandidateEvidence from "@/components/pilot/CorrectionCandidateEvidence";
import {
  CurationStatusBadge,
  SectionHeading,
} from "@/components/pilot/PilotDashboardPrimitives";
import { curationTimestamp } from "@/components/pilot/pilotDashboardHelpers";
import { getDataQualityIssueDisplayLabel } from "@/utils/dataQuality";
import { formatRelativeTime } from "@/utils/formatDate";

const INVENTORY_HANDOFF_SOURCE = "inventory-workbook-audit";

const correctionRequestIdentity = (item = {}) => ({
  requestId: item.id,
  issueType: item.issue_type || item.issueType || "other",
  casNumber: item.cas_number || item.casNumber || "",
  chemicalName: item.chemical_name || item.chemicalName || item.query_text || "",
  status: item.status || "open",
});

function CorrectionTargetSummary({ casNumber, chemicalName }) {
  const { t } = useTranslation();
  const summary = [casNumber, chemicalName].filter(Boolean).join(" | ");

  return (
    <div className="mt-1 text-sm text-slate-700">
      {summary ||
        t("pilot.correctionUnknownTarget", {
          defaultValue: "No target identity provided",
        })}
    </div>
  );
}

function CorrectionSourceBadge({ source, requestId }) {
  const { t } = useTranslation();
  const normalizedSource = String(source || "").trim();
  if (!normalizedSource) {
    return null;
  }
  const isInventoryHandoff = normalizedSource === INVENTORY_HANDOFF_SOURCE;
  const label = isInventoryHandoff
    ? t("pilot.inventoryHandoffSource", {
        defaultValue: "Inventory workbook handoff",
      })
    : normalizedSource;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`rounded-full px-2 py-0.5 font-semibold ${
          isInventoryHandoff
            ? "bg-cyan-100 text-cyan-800"
            : "bg-slate-100 text-slate-600"
        }`}
        data-testid={`correction-request-source-${requestId}`}
      >
        {label}
      </span>
      {isInventoryHandoff ? (
        <span
          className="rounded-full border border-cyan-200 bg-white px-2 py-0.5 font-medium text-cyan-800"
          data-testid={`correction-request-source-review-only-${requestId}`}
        >
          {t("pilot.inventoryHandoffReviewOnly", {
            defaultValue:
              "Review-only; verify evidence before manual-entry approval.",
          })}
        </span>
      ) : null}
    </div>
  );
}

function CorrectionIssueTypeLabel({ issueType }) {
  const { t } = useTranslation();
  const normalizedIssueType = issueType || "other-data-quality";
  const label = getDataQualityIssueDisplayLabel(normalizedIssueType, t);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-slate-900">{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
        {normalizedIssueType}
      </span>
    </div>
  );
}

function InventoryHandoffNextAction({ item = {} }) {
  const { t } = useTranslation();
  const { requestId, issueType, status } = correctionRequestIdentity(item);
  const candidate =
    item.candidate && typeof item.candidate === "object" ? item.candidate : {};
  const convertedToManualEntry = Boolean(candidate.converted_to_manual_entry);
  const hasCandidateEvidence = Object.keys(candidate).length > 0;

  let title = t("pilot.inventoryHandoffNextActionReviewEvidence", {
    defaultValue: "Review evidence before changing public data",
  });
  let detail = t("pilot.inventoryHandoffNextActionGenericDetail", {
    defaultValue:
      "Keep this row review-only until the CAS, identity, and supporting source are clear.",
  });

  if (convertedToManualEntry) {
    title = t("pilot.inventoryHandoffNextActionManualReview", {
      defaultValue: "Manual dictionary review is now the next owner",
    });
    detail = t("pilot.inventoryHandoffNextActionManualReviewDetail", {
      defaultValue:
        "Finish or reject the pending manual entry before treating this handoff item as resolved.",
    });
  } else if (issueType === "missing-chinese-name" && hasCandidateEvidence) {
    title = t("pilot.inventoryHandoffNextActionCreateManual", {
      defaultValue: "Verify the Chinese-name evidence, then create review entry",
    });
    detail = t("pilot.inventoryHandoffNextActionCreateManualDetail", {
      defaultValue:
        "A workbook candidate is present, but it is not public data. Create a pending manual entry only after checking a trusted source.",
    });
  } else if (issueType === "missing-chinese-name") {
    title = t("pilot.inventoryHandoffNextActionCreateCandidate", {
      defaultValue: "Create candidate evidence first",
    });
    detail = t("pilot.inventoryHandoffNextActionCreateCandidateDetail", {
      defaultValue:
        "Use Candidate after adding review notes or evidence; do not approve this request directly from workbook text.",
    });
  } else if (issueType === "unresolved-search") {
    title = t("pilot.inventoryHandoffNextActionResolveSearch", {
      defaultValue: "Confirm the CAS/name pair before dictionary work",
    });
    detail = t("pilot.inventoryHandoffNextActionResolveSearchDetail", {
      defaultValue:
        "If the row is a real chemical, capture evidence and create a reviewed entry; otherwise reject or ignore it.",
    });
  } else if (issueType === "no-ghs-data") {
    title = t("pilot.inventoryHandoffNextActionNoGhs", {
      defaultValue: "Check whether this is missing data or genuinely non-GHS",
    });
    detail = t("pilot.inventoryHandoffNextActionNoGhsDetail", {
      defaultValue:
        "Do not mark missing upstream data as safe. Keep the row in review until SDS or another trusted source is checked.",
    });
  }

  return (
    <div
      className="mt-2 rounded-md border border-cyan-200 bg-white px-2 py-1.5 text-xs text-cyan-950"
      data-testid={`correction-request-next-action-${requestId}`}
    >
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5 text-cyan-800">{detail}</div>
      {status === "candidate_found" && !hasCandidateEvidence ? (
        <div
          className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900"
          data-testid={`correction-request-next-action-missing-candidate-${requestId}`}
        >
          {t("pilot.inventoryHandoffMissingCandidatePayload", {
            defaultValue:
              "Status says candidate found, but no candidate payload is attached. Recreate candidate evidence before manual review.",
          })}
        </div>
      ) : null}
    </div>
  );
}

function inventoryHandoffIssueRows(items, issueTypeCounts) {
  const counts =
    issueTypeCounts && Object.keys(issueTypeCounts).length > 0
      ? { ...issueTypeCounts }
      : items.reduce((acc, item) => {
          const issueType = item.issue_type || item.issueType || "other";
          acc[issueType] = (acc[issueType] || 0) + 1;
          return acc;
        }, {});

  return Object.entries(counts)
    .map(([issueType, count]) => ({
      issueType,
      count: Number(count) || 0,
    }))
    .filter((row) => row.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.issueType.localeCompare(b.issueType),
    );
}

export function InventoryHandoffQueueSummary({
  items = [],
  issueTypeCounts = {},
  totalCount,
  activeIssueType = "all",
  filteredCount,
  onIssueTypeChange,
}) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return null;
  }

  const issueRows = inventoryHandoffIssueRows(items, issueTypeCounts);
  const parsedTotalCount = Number(totalCount);
  const totalItemCount =
    Number.isFinite(parsedTotalCount) && parsedTotalCount > items.length
      ? parsedTotalCount
      : items.length;
  const visibleItemCount = items.length;
  const parsedFilteredCount = Number(filteredCount);
  const activeFilteredCount = Number.isFinite(parsedFilteredCount)
    ? parsedFilteredCount
    : visibleItemCount;
  const filterButtonClass = (isActive) =>
    `inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
      isActive
        ? "border-cyan-700 bg-cyan-700 text-white"
        : "border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
    }`;

  return (
    <section
      className="rounded-lg border border-cyan-200 bg-cyan-50 p-4"
      data-testid="inventory-handoff-queue-summary"
    >
      <SectionHeading
        icon={ShieldAlert}
        title={t("pilot.inventoryHandoffQueueSummaryTitle", {
          defaultValue: "Inventory handoff review plan",
        })}
        subtitle={t("pilot.inventoryHandoffQueueSummarySubtitle", {
          defaultValue:
            "Use this queue as a review checklist. Nothing here changes public lookup, labels, exports, or QR targets until a maintainer approves the evidence.",
        })}
      />
      <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg border border-cyan-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
            {t("pilot.inventoryHandoffQueueSummaryTotal", {
              defaultValue: "Review queue",
            })}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-950">
            <span data-testid="inventory-handoff-queue-total">
              {totalItemCount}
            </span>
          </div>
          <p
            className="mt-1 text-xs text-cyan-900"
            data-testid="inventory-handoff-queue-visible-count"
          >
            {t("pilot.inventoryHandoffQueueSummaryVisibleRows", {
              visible: visibleItemCount,
              total: totalItemCount,
              defaultValue:
                "Showing {{visible}} of {{total}} review item(s) in this dashboard snapshot.",
            })}
          </p>
          <p className="mt-1 text-xs text-cyan-900">
            {t("pilot.inventoryHandoffQueueSummaryReviewOnly", {
              defaultValue:
                "Review-only import. Workbook Chinese names are candidate evidence, not approved public data.",
            })}
          </p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
            {t("pilot.inventoryHandoffQueueSummaryIssueBreakdown", {
              defaultValue: "Issue breakdown",
            })}
          </div>
          <div
            className="mt-2 flex flex-wrap gap-2"
            data-testid="inventory-handoff-queue-filters"
          >
            <button
              type="button"
              className={filterButtonClass(activeIssueType === "all")}
              onClick={() => onIssueTypeChange?.("all")}
              data-testid="inventory-handoff-filter-all"
            >
              {t("pilot.inventoryHandoffQueueSummaryFilterAll", {
                defaultValue: "All review items",
              })}
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-cyan-900">
                {totalItemCount}
              </span>
            </button>
            {issueRows.map((row) => (
              <button
                key={`filter-${row.issueType}`}
                type="button"
                className={filterButtonClass(activeIssueType === row.issueType)}
                onClick={() => onIssueTypeChange?.(row.issueType)}
                data-testid={`inventory-handoff-filter-${row.issueType}`}
              >
                {getDataQualityIssueDisplayLabel(row.issueType, t)}
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-cyan-900">
                  {row.count}
                </span>
              </button>
            ))}
          </div>
          <p
            className="mt-2 text-xs text-cyan-900"
            data-testid="inventory-handoff-queue-active-filter"
          >
            {activeIssueType === "all"
              ? t("pilot.inventoryHandoffQueueSummaryActiveFilterAll", {
                  count: activeFilteredCount,
                  defaultValue: "Showing all {{count}} visible review item(s).",
                })
              : t("pilot.inventoryHandoffQueueSummaryActiveFilterIssue", {
                  count: activeFilteredCount,
                  issue: getDataQualityIssueDisplayLabel(activeIssueType, t),
                  defaultValue:
                    "Showing {{count}} visible {{issue}} review item(s).",
                })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {issueRows.map((row) => (
              <span
                key={row.issueType}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-900"
                data-testid={`inventory-handoff-queue-issue-${row.issueType}`}
              >
                {getDataQualityIssueDisplayLabel(row.issueType, t)}
                <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[11px] text-cyan-800">
                  {row.count}
                </span>
              </span>
            ))}
          </div>
          <ol
            className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-700"
            data-testid="inventory-handoff-queue-next-steps"
          >
            <li>
              {t("pilot.inventoryHandoffQueueStepCandidate", {
                defaultValue:
                  "For candidate Chinese names, verify SDS, supplier label, or another trusted source before creating or approving a manual entry.",
              })}
            </li>
            <li>
              {t("pilot.inventoryHandoffQueueStepUnknownSeed", {
                defaultValue:
                  "For unknown seed-dictionary gaps, confirm the CAS/name pair first; leave it review-only when evidence is weak.",
              })}
            </li>
            <li>
              {t("pilot.inventoryHandoffQueueStepRerun", {
                defaultValue:
                  "After triage, rerun the inventory audit/import dry-run and expect this queue to shrink.",
              })}
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export function ConvertedCorrectionCandidatesSection({
  items = [],
  saving = false,
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <SectionHeading
        icon={BookPlus}
        title={t("pilot.convertedCorrectionCandidateList", {
          defaultValue: "Corrections in manual review",
        })}
        subtitle={t("pilot.convertedCorrectionCandidateListHint", {
          defaultValue:
            "These reports already created pending manual dictionary entries. Public lookup, labels, and exports are unchanged until the manual entry is approved.",
        })}
      />
      {items.length === 0 ? (
        <p className="text-sm text-amber-800">
          {t("pilot.noConvertedCorrectionCandidates", {
            defaultValue:
              "No converted correction candidates are waiting in manual review.",
          })}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const { requestId, issueType, casNumber, chemicalName, status } =
              correctionRequestIdentity({
                ...item,
                status: item.status || "candidate_found",
              });
            return (
              <div
                key={`converted-correction-${requestId}`}
                className="rounded-lg border border-amber-200 bg-white p-3"
                data-testid={`converted-correction-candidate-row-${requestId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CorrectionIssueTypeLabel issueType={issueType} />
                      <CurationStatusBadge
                        status={status}
                        testId={`converted-correction-candidate-status-${requestId}`}
                      />
                    </div>
                    <CorrectionTargetSummary
                      casNumber={casNumber}
                      chemicalName={chemicalName}
                    />
                    <CorrectionCandidateEvidence
                      candidate={item.candidate}
                      requestId={`converted-${requestId}`}
                      saving={saving}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatRelativeTime(item.updated_at || item.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TopCorrectionRequestsSection({
  items = [],
  saving = false,
  correctionReviewDrafts = {},
  setCorrectionReviewDrafts,
  onStatusUpdate,
  onCreateManualEntry,
  title,
  subtitle,
  emptyText,
  sectionClassName = "rounded-lg border border-slate-200 bg-white p-4",
  showInventoryHandoffGuidance = false,
}) {
  const { t } = useTranslation();

  return (
    <section className={sectionClassName}>
      <SectionHeading
        icon={ShieldAlert}
        title={
          title ||
          t("pilot.correctionRequests", {
            defaultValue: "Correction requests",
          })
        }
        subtitle={
          subtitle ||
          t("pilot.correctionRequestsHint", {
            defaultValue:
              "Station and in-app reports land here first. Approve only after source evidence is reviewed.",
          })
        }
      />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          {emptyText ||
            t("pilot.noCorrectionRequests", {
              defaultValue: "No open correction requests yet.",
            })}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const { requestId, issueType, casNumber, chemicalName, status } =
              correctionRequestIdentity(item);
            const evidenceUrl = item.evidence_url || item.evidenceUrl || "";
            const currentOutput = item.current_output || item.currentOutput || "";
            const expectedOutput =
              item.expected_output || item.expectedOutput || "";
            const source = item.source || item.sourceLabel || "";
            const duplicateCount = Number(
              item.duplicate_count || item.duplicateCount || 1,
            );
            const isInventoryHandoff = source === INVENTORY_HANDOFF_SOURCE;
            const inventoryCandidate =
              item.candidate && typeof item.candidate === "object"
                ? item.candidate
                : {};
            const inventoryHandoffConverted = Boolean(
              inventoryCandidate.converted_to_manual_entry,
            );
            const inventoryHandoffManualApproved =
              inventoryCandidate.manual_entry_status === "approved";
            const inventoryHandoffApproveBlocked =
              showInventoryHandoffGuidance &&
              isInventoryHandoff &&
              (!inventoryHandoffConverted || !inventoryHandoffManualApproved);
            const inventoryHandoffApproveBlockedTitle =
              !inventoryHandoffConverted
                ? t("pilot.inventoryHandoffApproveBlocked", {
                    defaultValue:
                      "Convert this handoff row into a manual review entry before approving the correction request.",
                  })
                : t("pilot.inventoryHandoffManualApprovalBlocked", {
                    defaultValue:
                      "Approve the pending manual entry before approving this handoff correction request.",
                  });
            return (
              <div
                key={`correction-${requestId}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                data-testid={`correction-request-row-${requestId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CorrectionIssueTypeLabel issueType={issueType} />
                      <CurationStatusBadge
                        status={status}
                        testId={`correction-request-status-${requestId}`}
                      />
                    </div>
                    <CorrectionSourceBadge
                      source={source}
                      requestId={requestId}
                    />
                    {showInventoryHandoffGuidance && isInventoryHandoff ? (
                      <InventoryHandoffNextAction item={item} />
                    ) : null}
                    {duplicateCount > 1 ? (
                      <span
                        className="mt-1 inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                        data-testid={`correction-request-duplicate-count-${requestId}`}
                      >
                        {t("pilot.correctionDuplicateCount", {
                          count: duplicateCount,
                          defaultValue: "{{count}} reports",
                        })}
                      </span>
                    ) : null}
                    <CorrectionTargetSummary
                      casNumber={casNumber}
                      chemicalName={chemicalName}
                    />
                    {currentOutput ? (
                      <div className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                        <span className="mr-1 font-semibold text-slate-800">
                          {t("pilot.correctionCurrentOutput", {
                            defaultValue: "Current",
                          })}
                          :
                        </span>
                        <span data-testid={`correction-request-current-${requestId}`}>
                          {currentOutput}
                        </span>
                      </div>
                    ) : null}
                    {expectedOutput ? (
                      <div className="mt-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
                        <span className="mr-1 font-semibold">
                          {t("pilot.correctionExpectedOutput", {
                            defaultValue: "Expected",
                          })}
                          :
                        </span>
                        <span data-testid={`correction-request-expected-${requestId}`}>
                          {expectedOutput}
                        </span>
                      </div>
                    ) : null}
                    {evidenceUrl ? (
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                        data-testid={`correction-request-evidence-link-${requestId}`}
                      >
                        {t("pilot.evidenceLink", {
                          defaultValue: "Evidence link",
                        })}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    <CorrectionCandidateEvidence
                      candidate={item.candidate}
                      requestId={requestId}
                      saving={saving}
                      onCreateManualEntry={() => onCreateManualEntry?.(item)}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatRelativeTime(item.updated_at || item.updatedAt)}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={correctionReviewDrafts[requestId] || ""}
                    onChange={(event) =>
                      setCorrectionReviewDrafts?.((prev) => ({
                        ...prev,
                        [requestId]: event.target.value,
                      }))
                    }
                    placeholder={t("pilot.correctionReviewNotesPlaceholder", {
                      defaultValue: "Review note",
                    })}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    data-testid={`correction-request-notes-${requestId}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      [
                        "candidate_found",
                        t("pilot.candidateFound", { defaultValue: "Candidate" }),
                        "rounded bg-amber-600 px-3 py-2 text-xs text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40",
                        "candidate-correction-request",
                      ],
                      [
                        "approved",
                        t("pilot.approve", { defaultValue: "Approve" }),
                        "rounded bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40",
                        "approve-correction-request",
                      ],
                      [
                        "rejected",
                        t("pilot.reject", { defaultValue: "Reject" }),
                        "rounded bg-red-700 px-3 py-2 text-xs text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40",
                        "reject-correction-request",
                      ],
                      [
                        "ignored",
                        t("pilot.ignoreMiss", { defaultValue: "Ignore" }),
                        "rounded bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40",
                        "ignore-correction-request",
                      ],
                    ].map(([nextStatus, label, className, testIdPrefix]) => {
                      const approvalBlocked =
                        nextStatus === "approved" &&
                        inventoryHandoffApproveBlocked;
                      return (
                        <button
                          key={nextStatus}
                          type="button"
                          onClick={() => onStatusUpdate?.(item, nextStatus)}
                          disabled={saving || !requestId || approvalBlocked}
                          title={
                            approvalBlocked
                              ? inventoryHandoffApproveBlockedTitle
                              : undefined
                          }
                          className={className}
                          data-testid={`${testIdPrefix}-${requestId}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RecentCorrectionRequestsSection({
  items = [],
  saving = false,
  onCreateManualEntry,
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <SectionHeading
        icon={ShieldAlert}
        title={t("pilot.correctionRequestList", {
          defaultValue: "Recent correction requests",
        })}
        subtitle={t("pilot.correctionRequestListHint", {
          defaultValue:
            "Data-quality reports stay here until an admin finds evidence and applies the approved dictionary or reference change.",
        })}
      />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          {t("pilot.noCorrectionRequests", {
            defaultValue: "No open correction requests yet.",
          })}
        </p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {items.map((item, index) => {
            const requestId = item.id || index;
            const issueType = item.issue_type || item.issueType || "other";
            const casNumber = item.cas_number || item.casNumber || "";
            const chemicalName =
              item.chemical_name || item.chemicalName || item.query_text || "";
            const expectedOutput =
              item.expected_output || item.expectedOutput || "";
            const status = item.status || "open";
            return (
              <div
                key={`recent-correction-${requestId}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                data-testid={`correction-request-recent-row-${requestId}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CorrectionIssueTypeLabel issueType={issueType} />
                    <div className="mt-1 font-mono text-blue-700">
                      {casNumber ||
                        t("pilot.noCasProvided", {
                          defaultValue: "No CAS provided",
                        })}
                    </div>
                  </div>
                  <CurationStatusBadge
                    status={status}
                    testId={`correction-request-recent-status-${requestId}`}
                  />
                </div>
                {chemicalName ? (
                  <div className="mt-1 text-slate-700">{chemicalName}</div>
                ) : null}
                {expectedOutput ? (
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {expectedOutput}
                  </div>
                ) : null}
                <CorrectionCandidateEvidence
                  candidate={item.candidate}
                  requestId={`recent-${requestId}`}
                  saving={saving}
                  onCreateManualEntry={() => onCreateManualEntry?.(item)}
                />
                {curationTimestamp(item) ? (
                  <div className="mt-2 text-xs text-slate-500">
                    {formatRelativeTime(curationTimestamp(item))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
