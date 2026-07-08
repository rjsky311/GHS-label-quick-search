import { CheckCircle2, ShieldAlert } from "@/components/icons";
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
      ? "notebook-source-note notebook-source-note-blocked"
      : mode === "supplemental"
        ? "notebook-source-note notebook-source-note-warning"
        : "notebook-source-note";
  const checklistItemClass =
    isPrint
      ? "notebook-status-chip inline-flex items-center gap-1 rounded px-2 py-1 font-medium"
      : mode === "general"
      ? "notebook-status-chip inline-flex items-center gap-1 rounded px-2 py-1 font-medium"
      : "notebook-status-chip inline-flex items-center gap-1 rounded px-2 py-1 font-medium";
  const wrapperClass = [
    variant === "detail" ? "mt-2" : isPrint ? "mt-3" : "mt-4",
    isPrint ? "notebook-source-note-print" : "",
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
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-danger))]" />
      <div className="min-w-0">
        <div className="font-[var(--font-display)] text-sm font-extrabold">
          {t(titleKey)}
        </div>
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
