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
                    ].map(([nextStatus, label, className, testIdPrefix]) => (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() => onStatusUpdate?.(item, nextStatus)}
                        disabled={saving || !requestId}
                        className={className}
                        data-testid={`${testIdPrefix}-${requestId}`}
                      >
                        {label}
                      </button>
                    ))}
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
