import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Persistent disclaimer reminding users that SDS / supplier label /
 * local regulation is the authoritative source, not this tool.
 *
 * Part of the v1.8 M1 trust-boundary work. Shown in two places:
 *   - Below the results table (variant="results")
 *   - Inside DetailModal, below the SDS links (variant="detail")
 *
 * Short, operational wording — not a legal disclaimer. The tone should
 * read as "use this quickly, verify before finalizing labels", not as
 * "we disclaim all responsibility".
 *
 * Props:
 *   - variant: "results" | "detail" — controls spacing only; copy is
 *     identical across both to avoid a maintenance split.
 */
export default function AuthoritativeSourceNote({ variant = "results" }) {
  const { t } = useTranslation();

  const wrapperClass =
    variant === "detail"
      ? "mt-2 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
      : "mt-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600";

  return (
    <div
      role="note"
      data-testid={`authoritative-source-note-${variant}`}
      className={wrapperClass}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <span>{t("trust.authoritativeNote")}</span>
    </div>
  );
}
