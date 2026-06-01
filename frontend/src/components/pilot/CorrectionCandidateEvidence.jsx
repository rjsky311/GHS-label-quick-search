import { useTranslation } from "react-i18next";

import {
  getCorrectionCandidateDisplayRows,
  getCorrectionCandidateManualEntryReadiness,
} from "@/utils/correctionCandidates";

export default function CorrectionCandidateEvidence({
  candidate,
  requestId,
  onCreateManualEntry,
  saving = false,
}) {
  const { t } = useTranslation();
  const rows = getCorrectionCandidateDisplayRows(candidate);
  if (rows.length === 0) return null;
  const isConvertedToManualEntry = Boolean(candidate?.converted_to_manual_entry);
  const manualEntryReadiness =
    getCorrectionCandidateManualEntryReadiness(candidate);
  const canCreateManualEntry =
    !isConvertedToManualEntry &&
    manualEntryReadiness.canCreate &&
    typeof onCreateManualEntry === "function";

  return (
    <div
      className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
      data-testid={`correction-request-candidate-${requestId}`}
    >
      <div className="font-semibold">
        {t("pilot.candidateEvidenceTitle", {
          defaultValue: "Candidate evidence",
        })}
      </div>
      <div className="mt-1 text-amber-800">
        {t("pilot.candidateEvidenceHint", {
          defaultValue:
            "Review-only. This does not affect public lookup, labels, or exports until approved into a curated record.",
        })}
      </div>
      {isConvertedToManualEntry ? (
        <div
          className="mt-2 rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900"
          data-testid={`correction-request-candidate-${requestId}-manual-pending`}
        >
          {t("pilot.candidateManualEntryPendingHint", {
            defaultValue:
              "A pending manual dictionary review entry has already been created from this candidate.",
          })}
        </div>
      ) : null}
      <dl className="mt-2 grid gap-1">
        {rows.map(([label, value]) => (
          <div
            key={`${label}-${value}`}
            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2"
            data-testid={`correction-request-candidate-${requestId}-${label.toLowerCase()}`}
          >
            <dt className="font-mono font-semibold text-amber-900">{label}</dt>
            <dd className="min-w-0 break-words text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {canCreateManualEntry ? (
        <button
          type="button"
          onClick={onCreateManualEntry}
          disabled={saving}
          className="mt-3 rounded bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
          data-testid={`create-manual-entry-from-candidate-${requestId}`}
        >
          {t("pilot.createManualEntryFromCandidate", {
            defaultValue: "Create review entry",
          })}
        </button>
      ) : !isConvertedToManualEntry &&
        typeof onCreateManualEntry === "function" ? (
        <div
          className="mt-3 rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900"
          data-testid={`correction-request-candidate-${requestId}-manual-blocked`}
        >
          {manualEntryReadiness.reason === "missing-cjk-chinese-name"
            ? t("pilot.candidateManualEntryMissingChineseName", {
                defaultValue:
                  "A missing-Chinese-name request needs a reviewed Chinese name before it can become a manual dictionary review entry.",
              })
            : t("pilot.candidateManualEntryMissingIdentity", {
                defaultValue:
                  "Candidate needs a CAS number and at least one name before it can become a review entry.",
              })}
        </div>
      ) : null}
    </div>
  );
}
