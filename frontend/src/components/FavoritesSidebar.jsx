import { useEffect } from "react";
import { Star, X } from "lucide-react";
import GHSImage from "@/components/GHSImage";

export default function FavoritesSidebar({
  favorites,
  onClose,
  onClearFavorites,
  onToggleFavorite,
  onViewDetail,
  onPrintLabel,
}) {
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
      aria-label="我的收藏"
    >
      <div
        className="absolute right-0 top-0 h-full w-96 bg-slate-800 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" /> 我的收藏
          </h2>
          <div className="flex gap-2">
            {favorites.length > 0 && (
              <button
                onClick={onClearFavorites}
                className="text-sm text-red-400 hover:text-red-300"
                data-testid="clear-favorites-btn"
              >
                清除全部
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
        {favorites.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Star className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p>尚無收藏的化學品</p>
            <p className="text-sm mt-2">點擊查詢結果中的 ☆ 即可收藏，下次打開時自動載入</p>
          </div>
        ) : (
          <div className="p-2">
            {favorites.map((item, idx) => (
              <div
                key={idx}
                className="p-3 hover:bg-slate-700 rounded-lg transition-colors mb-2 border border-slate-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-mono text-amber-400 text-sm">
                      {item.cas_number}
                    </div>
                    <div className="text-white font-medium">
                      {item.name_en}
                    </div>
                    {item.name_zh && (
                      <div className="text-slate-400 text-sm">
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
                    className="text-amber-400 hover:text-amber-300"
                    title="取消收藏"
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                  >
                    詳細資訊
                  </button>
                  <button
                    onClick={() => onPrintLabel(item)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    列印標籤
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
