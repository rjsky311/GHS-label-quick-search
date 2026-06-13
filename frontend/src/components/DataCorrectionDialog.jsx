import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  normalizeCorrectionRequestPayload,
  submitCorrectionRequest,
} from "@/utils/correctionRequests";

const ISSUE_GUIDANCE = {
  "missing-chinese-name": {
    title: "correctionDialog.guidance.missingChineseName.title",
    body: "correctionDialog.guidance.missingChineseName.body",
    expected: "correctionDialog.guidance.missingChineseName.expected",
    evidence: "correctionDialog.guidance.missingChineseName.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.missingChineseName.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.missingChineseName.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.missingChineseName.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.missingChineseName.contextPlaceholder",
  },
  "unresolved-search": {
    title: "correctionDialog.guidance.unresolvedSearch.title",
    body: "correctionDialog.guidance.unresolvedSearch.body",
    expected: "correctionDialog.guidance.unresolvedSearch.expected",
    evidence: "correctionDialog.guidance.unresolvedSearch.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.unresolvedSearch.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.unresolvedSearch.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.unresolvedSearch.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.unresolvedSearch.contextPlaceholder",
  },
  "no-ghs-data": {
    title: "correctionDialog.guidance.noGhsData.title",
    body: "correctionDialog.guidance.noGhsData.body",
    expected: "correctionDialog.guidance.noGhsData.expected",
    evidence: "correctionDialog.guidance.noGhsData.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.noGhsData.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.noGhsData.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.noGhsData.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.noGhsData.contextPlaceholder",
  },
  "ghs-text-no-pictograms": {
    title: "correctionDialog.guidance.ghsTextNoPictograms.title",
    body: "correctionDialog.guidance.ghsTextNoPictograms.body",
    expected: "correctionDialog.guidance.ghsTextNoPictograms.expected",
    evidence: "correctionDialog.guidance.ghsTextNoPictograms.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.ghsTextNoPictograms.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.ghsTextNoPictograms.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.ghsTextNoPictograms.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.ghsTextNoPictograms.contextPlaceholder",
  },
  "source-conflict": {
    title: "correctionDialog.guidance.sourceConflict.title",
    body: "correctionDialog.guidance.sourceConflict.body",
    expected: "correctionDialog.guidance.sourceConflict.expected",
    evidence: "correctionDialog.guidance.sourceConflict.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.sourceConflict.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.sourceConflict.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.sourceConflict.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.sourceConflict.contextPlaceholder",
  },
  "reference-link": {
    title: "correctionDialog.guidance.referenceLink.title",
    body: "correctionDialog.guidance.referenceLink.body",
    expected: "correctionDialog.guidance.referenceLink.expected",
    evidence: "correctionDialog.guidance.referenceLink.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.referenceLink.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.referenceLink.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.referenceLink.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.referenceLink.contextPlaceholder",
  },
  "other-data-quality": {
    title: "correctionDialog.guidance.otherDataQuality.title",
    body: "correctionDialog.guidance.otherDataQuality.body",
    expected: "correctionDialog.guidance.otherDataQuality.expected",
    evidence: "correctionDialog.guidance.otherDataQuality.evidence",
    expectedPlaceholder:
      "correctionDialog.guidance.otherDataQuality.expectedPlaceholder",
    evidenceUrlPlaceholder:
      "correctionDialog.guidance.otherDataQuality.evidenceUrlPlaceholder",
    evidenceTypePlaceholder:
      "correctionDialog.guidance.otherDataQuality.evidenceTypePlaceholder",
    contextPlaceholder:
      "correctionDialog.guidance.otherDataQuality.contextPlaceholder",
  },
};

const getIssueGuidance = (issueType) =>
  ISSUE_GUIDANCE[issueType] || ISSUE_GUIDANCE["other-data-quality"];

const NOTEBOOK_FIELD_CLASS = "notebook-field mt-1 w-full rounded-md px-3 py-2 text-sm";
const NOTEBOOK_TEXTAREA_CLASS = `${NOTEBOOK_FIELD_CLASS} leading-6`;
const NOTEBOOK_MONO_FIELD_CLASS = `${NOTEBOOK_FIELD_CLASS} font-mono`;

const textFromError = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || "")
      .filter(Boolean)
      .join(" ");
  }
  return "";
};

export default function DataCorrectionDialog({
  context,
  onClose,
  onSubmitted,
}) {
  const { t } = useTranslation();
  const dialogRef = useFocusTrap(onClose);
  const initialPayload = useMemo(
    () => normalizeCorrectionRequestPayload(context?.payload || {}),
    [context],
  );
  const [form, setForm] = useState(initialPayload);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedRecord, setSubmittedRecord] = useState(null);

  useEffect(() => {
    setForm(initialPayload);
    setSubmitError("");
    setSubmittedRecord(null);
  }, [initialPayload]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [dialogRef]);

  if (!context) return null;

  const guidance = getIssueGuidance(context.issueType || form.issue_type);

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await submitCorrectionRequest(form);
      const record = response?.record || null;
      setSubmittedRecord(record);
      toast.success(t("correctionDialog.successToast"));
      onSubmitted?.(record);
    } catch (error) {
      const message =
        textFromError(error) || t("correctionDialog.submitFailed");
      setSubmitError(message);
      toast.error(t("correctionDialog.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-correction-dialog-title"
      data-testid="data-correction-dialog"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl outline-none sm:max-h-[90vh]"
        data-testid="data-correction-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              {t("correctionDialog.kicker")}
            </p>
            <h2
              id="data-correction-dialog-title"
              className="mt-1 text-lg font-semibold text-slate-950"
            >
              {t("correctionDialog.title")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("correctionDialog.body")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            data-testid="data-correction-close"
            aria-label={t("common.close", { defaultValue: "Close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedRecord ? (
          <div className="space-y-4 px-5 py-5">
            <div
              className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
              data-testid="data-correction-success"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <div className="font-semibold">
                  {t("correctionDialog.successTitle")}
                </div>
                <div className="mt-1 text-sm leading-6 text-emerald-900">
                  {t("correctionDialog.successBody", {
                    id: submittedRecord.request_id || submittedRecord.id || "",
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="notebook-control notebook-control-primary px-4 py-2 text-sm font-semibold transition-colors"
                data-testid="data-correction-done"
              >
                {t("correctionDialog.done")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                <span>{t("correctionDialog.casLabel")}</span>
                <input
                  value={form.cas_number || ""}
                  onChange={updateField("cas_number")}
                  className={NOTEBOOK_MONO_FIELD_CLASS}
                  data-testid="data-correction-cas"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span>{t("correctionDialog.nameLabel")}</span>
                <input
                  value={form.chemical_name || ""}
                  onChange={updateField("chemical_name")}
                  className={NOTEBOOK_FIELD_CLASS}
                  data-testid="data-correction-name"
                />
              </label>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-medium text-slate-950">
                {t("correctionDialog.issueTypeLabel")}
              </span>
              <span className="ml-2 font-mono text-xs text-slate-600">
                {form.issue_type}
              </span>
            </div>

            <div
              className="notebook-note rounded-md p-3 text-sm"
              data-testid="data-correction-guidance"
            >
              <div className="font-semibold">{t(guidance.title)}</div>
              <p className="mt-1 leading-6 text-[hsl(var(--notebook-muted-ink))]">
                {t(guidance.body)}
              </p>
              <ul className="mt-2 space-y-1 text-[hsl(var(--notebook-muted-ink))]">
                <li>{t(guidance.expected)}</li>
                <li>{t(guidance.evidence)}</li>
              </ul>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              <span>{t("correctionDialog.currentOutputLabel")}</span>
              <textarea
                value={form.current_output || ""}
                onChange={updateField("current_output")}
                rows={3}
                className={NOTEBOOK_TEXTAREA_CLASS}
                data-testid="data-correction-current-output"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span>{t("correctionDialog.expectedOutputLabel")}</span>
              <textarea
                value={form.expected_output || ""}
                onChange={updateField("expected_output")}
                rows={3}
                required
                placeholder={t(guidance.expectedPlaceholder)}
                className={NOTEBOOK_TEXTAREA_CLASS}
                data-testid="data-correction-expected-output"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                <span>{t("correctionDialog.evidenceUrlLabel")}</span>
                <input
                  value={form.evidence_url || ""}
                  onChange={updateField("evidence_url")}
                  placeholder={t(guidance.evidenceUrlPlaceholder)}
                  className={NOTEBOOK_FIELD_CLASS}
                  data-testid="data-correction-evidence-url"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span>{t("correctionDialog.evidenceTypeLabel")}</span>
                <input
                  value={form.evidence_type || ""}
                  onChange={updateField("evidence_type")}
                  placeholder={t(guidance.evidenceTypePlaceholder)}
                  className={NOTEBOOK_FIELD_CLASS}
                  data-testid="data-correction-evidence-type"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              <span>{t("correctionDialog.localContextLabel")}</span>
              <textarea
                value={form.local_context || ""}
                onChange={updateField("local_context")}
                rows={2}
                placeholder={t(guidance.contextPlaceholder)}
                className={NOTEBOOK_TEXTAREA_CLASS}
                data-testid="data-correction-local-context"
              />
            </label>

            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                data-testid="data-correction-error"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                <span className="flex-1">
                  {submitError}
                  {context.fallbackUrl && (
                    <a
                      href={context.fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 font-semibold text-red-800 underline"
                      data-testid="data-correction-fallback-link"
                    >
                      {t("correctionDialog.fallbackLink")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
              {context.fallbackUrl && (
                <a
                  href={context.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="notebook-control notebook-control-secondary inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors sm:w-auto"
                  data-testid="data-correction-github-fallback"
                >
                  {t("correctionDialog.githubFallback")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="notebook-control notebook-control-secondary w-full justify-center px-4 py-2 text-sm font-medium transition-colors sm:w-auto"
                data-testid="data-correction-cancel"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="notebook-control notebook-control-primary inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                data-testid="data-correction-submit"
              >
                <Send className="h-4 w-4" />
                {submitting
                  ? t("correctionDialog.submitting")
                  : t("correctionDialog.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
