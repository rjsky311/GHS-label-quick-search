import { Clock3, FlaskConical, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import useFocusTrap from "@/hooks/useFocusTrap";
import { formatPreparedDisplayName } from "@/utils/preparedSolution";

function recentRowId(record, index) {
  return record?.createdAt || `recent-${index}`;
}

export default function PreparedSidebar({
  recents,
  onClose,
  onClearRecents,
  onReprint,
  reprintingId = null,
}) {
  const { t } = useTranslation();
  const panelRef = useFocusTrap(onClose);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("prepared.sidebarTitle")}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-96 overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <FlaskConical className="h-5 w-5 text-blue-700" />
            {t("prepared.sidebarTitle")}
          </h2>
          <div className="flex gap-2">
            {recents.length > 0 && (
              <button
                onClick={onClearRecents}
                className="text-sm font-medium text-red-600 hover:text-red-700"
                data-testid="clear-prepared-recents-btn"
              >
                {t("prepared.clearAll")}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
              data-testid="close-prepared-sidebar-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {recents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FlaskConical className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p>{t("prepared.sidebarEmpty")}</p>
            <p className="text-sm mt-2">{t("prepared.sidebarEmptyHint")}</p>
          </div>
        ) : (
          <div className="p-2">
            {recents.map((record, index) => {
              const rowId = recentRowId(record, index);
              const display =
                record.name ||
                formatPreparedDisplayName(record) ||
                t("prepared.labelMeta", {
                  concentration: record.concentration || "",
                  solvent: record.solvent || "",
                });
              const isBusy = reprintingId === rowId;

              return (
                <div
                  key={rowId}
                  className="mb-2 rounded-md border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                  data-testid={`prepared-recent-item-${index}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-950">
                        {display}
                      </div>
                      <div className="font-mono text-sm text-blue-700">
                        {record.parentCas}
                      </div>
                      {(record.parentNameEn || record.parentNameZh) && (
                        <div className="truncate text-sm text-slate-500">
                          {record.parentNameEn || record.parentNameZh}
                          {record.parentNameEn && record.parentNameZh
                            ? ` / ${record.parentNameZh}`
                            : ""}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {record.preparedBy && (
                          <span>
                            {t("prepared.preparedByShort")}: {record.preparedBy}
                          </span>
                        )}
                        {record.preparedDate && (
                          <span>
                            {t("prepared.preparedDateShort")}: {record.preparedDate}
                          </span>
                        )}
                        {record.expiryDate && (
                          <span>
                            {t("prepared.expiryDateShort")}: {record.expiryDate}
                          </span>
                        )}
                        {!record.preparedBy &&
                          !record.preparedDate &&
                          !record.expiryDate && (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              {t("prepared.sidebarWorkflowOnly")}
                            </span>
                          )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onReprint(record, rowId)}
                      disabled={isBusy}
                      className="flex shrink-0 items-center gap-1.5 rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid={`prepared-reprint-btn-${index}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isBusy
                        ? t("prepared.reprintLoading")
                        : t("prepared.reprint")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
