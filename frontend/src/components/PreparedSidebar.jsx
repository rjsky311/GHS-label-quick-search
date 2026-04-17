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
        className="absolute right-0 top-0 h-full w-96 bg-slate-800 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
            {t("prepared.sidebarTitle")}
          </h2>
          <div className="flex gap-2">
            {recents.length > 0 && (
              <button
                onClick={onClearRecents}
                className="text-sm text-red-400 hover:text-red-300"
                data-testid="clear-prepared-recents-btn"
              >
                {t("prepared.clearAll")}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              data-testid="close-prepared-sidebar-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {recents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 text-slate-600" />
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
                  className="p-3 hover:bg-slate-700 rounded-lg transition-colors mb-2 border border-slate-600"
                  data-testid={`prepared-recent-item-${index}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">
                        {display}
                      </div>
                      <div className="font-mono text-amber-400 text-sm">
                        {record.parentCas}
                      </div>
                      {(record.parentNameEn || record.parentNameZh) && (
                        <div className="text-slate-400 text-sm truncate">
                          {record.parentNameEn || record.parentNameZh}
                          {record.parentNameEn && record.parentNameZh
                            ? ` / ${record.parentNameZh}`
                            : ""}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
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
                      className="shrink-0 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white rounded flex items-center gap-1.5"
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
