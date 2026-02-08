import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/utils/formatDate";

export default function HistorySidebar({
  history,
  onClose,
  onClearHistory,
  onSelectHistoryItem,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("history.title")}
    >
      <div
        className="absolute right-0 top-0 h-full w-80 bg-slate-800 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
          <h2 className="text-lg font-semibold text-white">{t("history.title")}</h2>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-sm text-red-400 hover:text-red-300"
                data-testid="clear-history-btn"
              >
                {t("history.clearAll")}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
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
                className="w-full p-3 text-left hover:bg-slate-700 rounded-lg transition-colors mb-1"
                data-testid={`history-item-${idx}`}
              >
                <div className="font-mono text-amber-400 text-sm">
                  {item.cas_number}
                </div>
                <div className="text-white text-sm truncate">
                  {item.name_en}
                </div>
                {item.name_zh && (
                  <div className="text-slate-400 text-xs truncate">
                    {item.name_zh}
                  </div>
                )}
                <div className="text-slate-500 text-xs mt-1">
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
