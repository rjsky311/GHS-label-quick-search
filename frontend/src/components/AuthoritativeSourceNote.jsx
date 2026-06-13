import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Operational trust boundary shown near search results, detail references,
 * and print decisions. It keeps the product useful without implying that this
 * quick-search tool replaces the SDS, supplier label, or local requirements.
 */
export default function AuthoritativeSourceNote({
  variant = "results",
  mode = "general",
}) {
  const { t } = useTranslation();

  const isPrint = variant === "print";
  const titleKey =
    mode === "supplemental"
      ? "trust.supplementalTitle"
      : mode === "blocked"
        ? "trust.blockedTitle"
        : "trust.authoritativeTitle";
  const bodyKey =
    mode === "supplemental"
      ? "trust.supplementalNote"
      : mode === "blocked"
        ? "trust.blockedNote"
        : "trust.authoritativeNote";
  const toneClass =
    mode === "blocked"
      ? "border border-red-200 bg-red-50 text-red-900"
      : mode === "supplemental"
        ? "border border-amber-200 bg-amber-50 text-amber-900"
        : "notebook-note";
  const checklistItemClass =
    mode === "general"
      ? "notebook-chip inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium"
      : "inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 font-medium ring-1 ring-current/10";
  const wrapperClass = [
    variant === "detail" ? "mt-2" : isPrint ? "mt-3" : "mt-4",
    "flex items-start gap-3 rounded-md p-3 text-xs",
    toneClass,
  ].join(" ");
  const checklistItems = [
    "trust.verifySds",
    "trust.verifySupplier",
    "trust.verifyLocal",
  ];

  return (
    <div
      role="note"
      data-testid={`authoritative-source-note-${variant}`}
      data-mode={mode}
      className={wrapperClass}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0">
        <div className="font-semibold">{t(titleKey)}</div>
        <p className="mt-1 leading-5 opacity-90">{t(bodyKey)}</p>
        <div
          className={`mt-2 flex flex-wrap gap-1.5 ${
            isPrint ? "text-[11px]" : ""
          }`}
          data-testid={`authoritative-source-checklist-${variant}`}
        >
          {checklistItems.map((key) => (
            <span
              key={key}
              className={checklistItemClass}
            >
              <CheckCircle2 className="h-3 w-3" />
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
