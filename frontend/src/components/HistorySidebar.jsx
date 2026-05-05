import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/utils/formatDate";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function HistorySidebar({
  history,
  onClose,
  onClearHistory,
  onSelectHistoryItem,
}) {
  const { t } = useTranslation();
  // Handles Escape-to-close, initial focus, Tab trap, and focus
  // restore on close. Ref goes on the inner panel so the backdrop's
  // click-to-close handler doesn't fight the trap.
  const panelRef = useFocusTrap(onClose);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("history.title")}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-950">{t("history.title")}</h2>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-sm font-medium text-red-600 hover:text-red-700"
                data-testid="clear-history-btn"
              >
                {t("history.clearAll")}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>{t("history.empty")}</p>
          </div>
        ) : (
          <div className="p-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectHistoryItem(item.cas_number)}
                className="mb-1 w-full rounded-md p-3 text-left transition-colors hover:bg-slate-50"
                data-testid={`history-item-${idx}`}
              >
                <div className="font-mono text-sm text-blue-700">
                  {item.cas_number}
                </div>
                <div className="truncate text-sm text-slate-950">
                  {item.name_en}
                </div>
                {item.name_zh && (
                  <div className="truncate text-xs text-slate-500">
                    {item.name_zh}
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  {formatDate(item.timestamp)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
