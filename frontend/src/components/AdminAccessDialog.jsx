import { useState } from "react";
import { KeyRound, ShieldAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function AdminAccessDialog({
  error = "",
  initialValue = "",
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation();
  const dialogRef = useFocusTrap(onClose);
  const [adminKey, setAdminKey] = useState(initialValue);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(adminKey);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("pilot.adminAccessTitle", {
        defaultValue: "Admin access",
      })}
      data-testid="pilot-admin-dialog"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white">
              <ShieldAlert className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-semibold">
                {t("pilot.adminAccessTitle", {
                  defaultValue: "Admin access",
                })}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {t("pilot.adminAccessHint", {
                defaultValue:
                  "Dictionary curation and pilot telemetry are now admin-only. Enter the server admin key for this session.",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
            data-testid="close-pilot-admin-dialog-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300" htmlFor="pilot-admin-key">
            {t("pilot.adminKeyLabel", {
              defaultValue: "Admin key",
            })}
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="pilot-admin-key"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 py-3 pl-10 pr-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder={t("pilot.adminKeyPlaceholder", {
                defaultValue: "Enter admin key",
              })}
              data-testid="pilot-admin-key-input"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600"
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-600"
              data-testid="pilot-admin-submit-btn"
            >
              {t("pilot.unlockAdmin", { defaultValue: "Unlock admin" })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
