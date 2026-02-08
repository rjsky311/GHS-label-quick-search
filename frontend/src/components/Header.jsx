import { AlertTriangle, Star, ClipboardList } from "lucide-react";

export default function Header({
  favorites,
  history,
  showFavorites,
  showHistory,
  onToggleFavorites,
  onToggleHistory,
}) {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                GHS Label Quick Search
              </h1>
              <p className="text-xs text-slate-400">化學品危險標籤快速查詢</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Favorites Button */}
            <button
              onClick={onToggleFavorites}
              className="relative px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
              data-testid="favorites-toggle-btn"
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">收藏</span>
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
            {/* History Button */}
            <button
              onClick={onToggleHistory}
              className="relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
              data-testid="history-toggle-btn"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">搜尋紀錄</span>
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
