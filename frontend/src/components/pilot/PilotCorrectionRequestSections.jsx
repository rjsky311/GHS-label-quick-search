import { BookPlus, ExternalLink, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import CorrectionCandidateEvidence from "@/components/pilot/CorrectionCandidateEvidence";
import {
  CurationStatusBadge,
  SectionHeading,
} from "@/components/pilot/PilotDashboardPrimitives";
import { curationTimestamp } from "@/components/pilot/pilotDashboardHelpers";
import { formatRelativeTime } from "@/utils/formatDate";

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
                      <span className="font-medium text-slate-900">
                        {issueType}
                      </span>
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
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <SectionHeading
        icon={ShieldAlert}
        title={t("pilot.correctionRequests", {
          defaultValue: "Correction requests",
        })}
        subtitle={t("pilot.correctionRequestsHint", {
          defaultValue:
            "Station and in-app reports land here first. Approve only after source evidence is reviewed.",
        })}
      />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          {t("pilot.noCorrectionRequests", {
            defaultValue: "No open correction requests yet.",
          })}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const { requestId, issueType, casNumber, chemicalName, status } =
              correctionRequestIdentity(item);
            const evidenceUrl = item.evidence_url || item.evidenceUrl || "";
            return (
              <div
                key={`correction-${requestId}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                data-testid={`correction-request-row-${requestId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {issueType}
                      </span>
                      <CurationStatusBadge
                        status={status}
                        testId={`correction-request-status-${requestId}`}
                      />
                    </div>
                    <CorrectionTargetSummary
                      casNumber={casNumber}
                      chemicalName={chemicalName}
                    />
                    {item.current_output || item.currentOutput ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {item.current_output || item.currentOutput}
                      </div>
                    ) : null}
                    {evidenceUrl ? (
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
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
                    <div className="font-medium text-slate-900">
                      {issueType}
                    </div>
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
