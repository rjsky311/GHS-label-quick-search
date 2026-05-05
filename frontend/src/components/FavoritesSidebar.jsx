import { Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import GHSImage from "@/components/GHSImage";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function FavoritesSidebar({
  favorites,
  onClose,
  onClearFavorites,
  onToggleFavorite,
  onViewDetail,
  onPrintLabel,
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
      aria-label={t("favorites.title")}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-96 overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <Star className="h-5 w-5 text-amber-500" /> {t("favorites.title")}
          </h2>
          <div className="flex gap-2">
            {favorites.length > 0 && (
              <button
                onClick={onClearFavorites}
                className="text-sm font-medium text-red-600 hover:text-red-700"
                data-testid="clear-favorites-btn"
              >
                {t("favorites.clearAll")}
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
        {favorites.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Star className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p>{t("favorites.empty")}</p>
            <p className="text-sm mt-2">{t("favorites.emptyHint")}</p>
          </div>
        ) : (
          <div className="p-2">
            {favorites.map((item, idx) => (
              <div
                key={idx}
                className="mb-2 rounded-md border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-blue-700">
                      {item.cas_number}
                    </div>
                    <div className="font-medium text-slate-950">
                      {item.name_en}
                    </div>
                    {item.name_zh && (
                      <div className="text-sm text-slate-500">
                        {item.name_zh}
                      </div>
                    )}
                    {item.ghs_pictograms?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {item.ghs_pictograms.map((pic, pIdx) => (
                          <GHSImage
                            key={pIdx}
                            code={pic.code}
                            name={pic.name_zh}
                            className="w-8 h-8"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleFavorite(item)}
                    className="text-amber-500 hover:text-amber-600"
                    title={t("favorites.removeFavorite")}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t("favorites.detail")}
                  </button>
                  <button
                    onClick={() => onPrintLabel(item)}
                    className="rounded bg-blue-700 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800"
                  >
                    {t("favorites.printLabel")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
