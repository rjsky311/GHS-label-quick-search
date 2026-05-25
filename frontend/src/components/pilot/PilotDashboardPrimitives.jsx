import { useTranslation } from "react-i18next";

const CURATION_STATUS_META = {
  approved: {
    labelKey: "pilot.manualStatusApproved",
    defaultLabel: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pending: {
    labelKey: "pilot.manualStatusPending",
    defaultLabel: "Pending review",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  needs_evidence: {
    labelKey: "pilot.manualStatusNeedsEvidence",
    defaultLabel: "Needs evidence",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  rejected: {
    labelKey: "pilot.manualStatusRejected",
    defaultLabel: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  active: {
    labelKey: "pilot.referenceStatusActive",
    defaultLabel: "Active",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  inactive: {
    labelKey: "pilot.referenceStatusInactive",
    defaultLabel: "Inactive",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  open: {
    labelKey: "pilot.correctionStatusOpen",
    defaultLabel: "Open",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  candidate_found: {
    labelKey: "pilot.correctionStatusCandidateFound",
    defaultLabel: "Candidate found",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  ignored: {
    labelKey: "pilot.correctionStatusIgnored",
    defaultLabel: "Ignored",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export function SummaryCard({ label, value, accent = "text-blue-700", testId }) {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid={testId}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

export function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-slate-900">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

export function CurationStatusBadge({ status = "approved", testId }) {
  const { t } = useTranslation();
  const meta = CURATION_STATUS_META[status] || {
    labelKey: "",
    defaultLabel: status,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
      data-testid={testId}
    >
      {meta.labelKey ? t(meta.labelKey, { defaultValue: meta.defaultLabel }) : status}
    </span>
  );
}

export function CurationStatusSummary({
  title,
  options,
  counts = {},
  testIdPrefix,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
      <span className="font-medium text-slate-800">{title}</span>
      {options.map((option) => (
        <span
          key={option.value}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"
          data-testid={`${testIdPrefix}-${option.value}`}
        >
          {t(option.labelKey, { defaultValue: option.defaultLabel })}:{" "}
          {counts[option.value] || 0}
        </span>
      ))}
    </div>
  );
}
