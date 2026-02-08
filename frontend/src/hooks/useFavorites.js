import { useState, useCallback, useEffect } from "react";

const FAVORITES_KEY = "ghs_favorites";

export default function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const toggleFavorite = useCallback((chemical) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.cas_number === chemical.cas_number);
      let updated;
      if (exists) {
        updated = prev.filter((f) => f.cas_number !== chemical.cas_number);
      } else {
        const favoriteItem = {
          cas_number: chemical.cas_number,
          cid: chemical.cid,
          name_en: chemical.name_en,
          name_zh: chemical.name_zh,
          ghs_pictograms: chemical.ghs_pictograms,
          hazard_statements: chemical.hazard_statements,
          signal_word: chemical.signal_word,
          signal_word_zh: chemical.signal_word_zh,
          found: true,
          other_classifications: chemical.other_classifications || [],
          has_multiple_classifications: chemical.has_multiple_classifications || false,
          added_at: new Date().toISOString(),
        };
        updated = [favoriteItem, ...prev];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorited = useCallback(
    (cas_number) => favorites.some((f) => f.cas_number === cas_number),
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem(FAVORITES_KEY);
  }, []);

  return { favorites, toggleFavorite, isFavorited, clearFavorites };
}
