import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Clock, Star, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API } from "@/constants/ghs";

const isCasLike = (str) => /^[\d-]+$/.test(str.trim());

export default function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  history,
  favorites,
  searchInputRef,
  loading,
}) {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  // ── Server name search state ──
  const [serverResults, setServerResults] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // ── Local suggestions (history + favorites) ──
  const localSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    const seen = new Set();
    const results = [];

    const match = (item, source) => {
      if (seen.has(item.cas_number)) return;
      const cas = item.cas_number?.toLowerCase() || "";
      const nameEn = item.name_en?.toLowerCase() || "";
      const nameZh = item.name_zh || "";
      if (cas.includes(query) || nameEn.includes(query) || nameZh.includes(query)) {
        seen.add(item.cas_number);
        results.push({ ...item, _source: source });
      }
    };

    favorites.forEach((item) => match(item, "favorite"));
    history.forEach((item) => match(item, "history"));

    return results.slice(0, 8);
  }, [value, history, favorites]);

  // ── Deduplicated server results ──
  const dedupedServerResults = useMemo(() => {
    if (serverResults.length === 0) return [];
    const localCasSet = new Set(localSuggestions.map((s) => s.cas_number));
    return serverResults
      .filter((item) => !localCasSet.has(item.cas_number))
      .map((item) => ({ ...item, _source: "server" }));
  }, [serverResults, localSuggestions]);

  // ── Combined list for keyboard navigation ──
  const allSuggestions = useMemo(
    () => [...localSuggestions, ...dedupedServerResults],
    [localSuggestions, dedupedServerResults]
  );

  // ── Reset active index when suggestions change ──
  useEffect(() => {
    setActiveIndex(-1);
  }, [allSuggestions]);

  // ── Debounced server name search ──
  useEffect(() => {
    const query = value.trim();

    if (!query || query.length < 2 || isCasLike(query)) {
      setServerResults([]);
      setServerLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    setServerLoading(true);

    const timerId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      axios
        .get(`${API}/search-by-name/${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        .then((response) => {
          if (!controller.signal.aborted) {
            setServerResults(response.data.results || []);
            setServerLoading(false);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setServerResults([]);
            setServerLoading(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [value]);

  // ── Cleanup abort controller on unmount ──
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ── Click outside to close dropdown ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Delay closing so the external element's click event fires first
        requestAnimationFrame(() => {
          setShowSuggestions(false);
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback((item) => {
    onChange(item.cas_number);
    setShowSuggestions(false);
    setServerResults([]);
    onSearch(item.cas_number);
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === "Enter") onSearch();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allSuggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? allSuggestions.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allSuggestions.length) {
          handleSelect(allSuggestions[activeIndex]);
        } else {
          setShowSuggestions(false);
          onSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  }, [showSuggestions, allSuggestions, activeIndex, handleSelect, onSearch]);

  const hasDropdownContent = allSuggestions.length > 0 || serverLoading;

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={searchInputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => value.trim() && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={t("search.placeholder")}
        className="w-full px-4 py-3 pr-10 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
        data-testid="single-cas-input"
        role="combobox"
        aria-expanded={showSuggestions && hasDropdownContent}
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            setShowSuggestions(false);
            setServerResults([]);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {showSuggestions && hasDropdownContent && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-40 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-xl max-h-80 overflow-y-auto"
        >
          {/* Local suggestions (favorites + history) */}
          {localSuggestions.map((item, idx) => (
            <li
              key={item.cas_number}
              id={`suggestion-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onClick={() => handleSelect(item)}
              className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                idx === activeIndex
                  ? "bg-amber-500/20 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span className="text-slate-500 shrink-0">
                {item._source === "favorite" ? (
                  <Star className="w-4 h-4 text-amber-400" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 text-sm">{item.cas_number}</span>
                  <span className="text-white text-sm truncate">{item.name_en}</span>
                </div>
                {item.name_zh && (
                  <div className="text-slate-400 text-xs truncate">{item.name_zh}</div>
                )}
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {item._source === "favorite" ? t("autocomplete.favorite") : t("autocomplete.history")}
              </span>
            </li>
          ))}

          {/* Divider between local and server results */}
          {localSuggestions.length > 0 && dedupedServerResults.length > 0 && (
            <li className="border-t border-slate-700 mx-2" role="separator" />
          )}

          {/* Server results */}
          {dedupedServerResults.map((item, idx) => {
            const globalIdx = localSuggestions.length + idx;
            return (
              <li
                key={`server-${item.cas_number}`}
                id={`suggestion-${globalIdx}`}
                role="option"
                aria-selected={globalIdx === activeIndex}
                onClick={() => handleSelect(item)}
                className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                  globalIdx === activeIndex
                    ? "bg-amber-500/20 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span className="text-slate-500 shrink-0">
                  <Search className="w-4 h-4 text-sky-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 text-sm">{item.cas_number}</span>
                    <span className="text-white text-sm truncate">{item.name_en}</span>
                  </div>
                  {item.name_zh && (
                    <div className="text-slate-400 text-xs truncate">{item.name_zh}</div>
                  )}
                </div>
                <span className="text-xs text-sky-400/70 shrink-0">
                  {t("autocomplete.search")}
                </span>
              </li>
            );
          })}

          {/* Loading spinner */}
          {serverLoading && dedupedServerResults.length === 0 && (
            <li className="px-4 py-3 flex items-center gap-3 text-slate-400" role="presentation">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("autocomplete.searching")}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
