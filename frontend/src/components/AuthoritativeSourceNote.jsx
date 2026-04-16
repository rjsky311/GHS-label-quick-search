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
      ? "mt-2 p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-400 text-xs flex items-start gap-2"
      : "mt-4 p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-400 text-xs flex items-start gap-2";

  return (
    <div
      role="note"
      data-testid={`authoritative-source-note-${variant}`}
      className={wrapperClass}
    >
      <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
      <span>{t("trust.authoritativeNote")}</span>
    </div>
  );
}
