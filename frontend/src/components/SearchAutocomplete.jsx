import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Clock, Star, X, Loader2, Tag } from "lucide-react";
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
  // Tracks the most recent query string the user has typed. A second
  // guard (in addition to AbortController) that filters out stale
  // responses if the abort raced the network layer.
  const latestQueryRef = useRef("");

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
  //
  // Previous implementation's cleanup only cleared the debounce timer,
  // so a request already in flight (dispatched 0–300ms ago) could
  // continue to completion and overwrite `serverResults` with stale
  // data after the user had already typed something else. Two guards:
  //
  //   1. Cleanup aborts the in-flight controller immediately, so the
  //      current effect body's request is cancelled the moment `value`
  //      changes.
  //   2. Before `setServerResults`, check `latestQueryRef.current` in
  //      case the abort loses the race with the network layer (the
  //      `aborted` check is best-effort in some transports).
  useEffect(() => {
    const query = value.trim();
    latestQueryRef.current = query;

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
      const controller = new AbortController();
      abortControllerRef.current = controller;

      axios
        .get(`${API}/search-by-name/${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        .then((response) => {
          if (controller.signal.aborted) return;
          if (latestQueryRef.current !== query) return;
          setServerResults(response.data.results || []);
          setServerLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          if (latestQueryRef.current !== query) return;
          setServerResults([]);
          setServerLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timerId);
      // Abort whatever request is currently in flight (or about to
      // be dispatched by the pending timer). This is the critical
      // fix — without it, an in-flight request for a superseded
      // query could resolve and overwrite state.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [value]);

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
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 pr-10 font-mono text-slate-950 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {showSuggestions && hasDropdownContent && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl"
        >
          {/* Local suggestions (favorites + history) */}
          {localSuggestions.map((item, idx) => (
            <li
              key={item.cas_number}
              id={`suggestion-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onClick={() => handleSelect(item)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                idx === activeIndex
                  ? "bg-blue-50 text-slate-950"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="shrink-0 text-slate-400">
                {item._source === "favorite" ? (
                  <Star className="w-4 h-4 text-amber-400" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-blue-700">{item.cas_number}</span>
                  <span className="truncate text-sm text-slate-950">{item.name_en}</span>
                </div>
                {item.name_zh && (
                  <div className="truncate text-xs text-slate-500">{item.name_zh}</div>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {item._source === "favorite" ? t("autocomplete.favorite") : t("autocomplete.history")}
              </span>
            </li>
          ))}

          {/* Divider between local and server results */}
          {localSuggestions.length > 0 && dedupedServerResults.length > 0 && (
            <li className="mx-2 border-t border-slate-200" role="separator" />
          )}

          {/* Server results */}
          {dedupedServerResults.map((item, idx) => {
            const globalIdx = localSuggestions.length + idx;
            const isAlias = !!item.alias;
            return (
              <li
                key={`server-${item.cas_number}`}
                id={`suggestion-${globalIdx}`}
                role="option"
                aria-selected={globalIdx === activeIndex}
                onClick={() => handleSelect(item)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  globalIdx === activeIndex
                    ? "bg-blue-50 text-slate-950"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="shrink-0 text-slate-400">
                  {isAlias ? (
                    <Tag className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Search className="w-4 h-4 text-blue-600" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-700">{item.cas_number}</span>
                    <span className="truncate text-sm text-slate-950">{item.name_en}</span>
                  </div>
                  {item.name_zh && (
                    <div className="truncate text-xs text-slate-500">
                      {item.name_zh}
                      {isAlias && (
                        <span className="ml-1 text-emerald-700">← {item.alias}</span>
                      )}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 text-xs ${isAlias ? "text-emerald-700" : "text-blue-700"}`}>
                  {isAlias ? t("autocomplete.alias") : t("autocomplete.search")}
                </span>
              </li>
            );
          })}

          {/* Loading spinner */}
          {serverLoading && dedupedServerResults.length === 0 && (
            <li className="flex items-center gap-3 px-4 py-3 text-slate-500" role="presentation">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("autocomplete.searching")}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
