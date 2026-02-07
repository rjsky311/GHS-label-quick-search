import { useState, useEffect, useCallback } from "react";

const CUSTOM_GHS_KEY = "ghs_custom_settings";

export default function useCustomGHS() {
  const [customGHSSettings, setCustomGHSSettings] = useState({});

  // Load custom GHS settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_GHS_KEY);
    if (saved) {
      try {
        setCustomGHSSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom GHS settings", e);
      }
    }
  }, []);

  // Get the effective GHS classification for a result (considering user customization)
  const getEffectiveClassification = useCallback(
    (result) => {
      if (!result || !result.found) return null;

      const customSetting = customGHSSettings[result.cas_number];

      if (customSetting && customSetting.selectedIndex !== undefined) {
        const allClassifications = [
          {
            pictograms: result.ghs_pictograms || [],
            hazard_statements: result.hazard_statements || [],
            signal_word: result.signal_word,
            signal_word_zh: result.signal_word_zh,
          },
          ...(result.other_classifications || []),
        ];

        if (customSetting.selectedIndex < allClassifications.length) {
          return {
            ...allClassifications[customSetting.selectedIndex],
            isCustom: true,
            customIndex: customSetting.selectedIndex,
            note: customSetting.note,
          };
        }
      }

      return {
        pictograms: result.ghs_pictograms || [],
        hazard_statements: result.hazard_statements || [],
        signal_word: result.signal_word,
        signal_word_zh: result.signal_word_zh,
        isCustom: false,
        customIndex: 0,
      };
    },
    [customGHSSettings]
  );

  const setCustomClassification = useCallback(
    (casNumber, selectedIndex, note = "") => {
      setCustomGHSSettings((prev) => {
        const newSettings = {
          ...prev,
          [casNumber]: {
            selectedIndex,
            note,
            updatedAt: new Date().toISOString(),
          },
        };
        localStorage.setItem(CUSTOM_GHS_KEY, JSON.stringify(newSettings));
        return newSettings;
      });
    },
    []
  );

  const clearCustomClassification = useCallback((casNumber) => {
    setCustomGHSSettings((prev) => {
      const newSettings = { ...prev };
      delete newSettings[casNumber];
      localStorage.setItem(CUSTOM_GHS_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const hasCustomClassification = useCallback(
    (casNumber) => customGHSSettings[casNumber]?.selectedIndex !== undefined,
    [customGHSSettings]
  );

  return {
    customGHSSettings,
    getEffectiveClassification,
    setCustomClassification,
    clearCustomClassification,
    hasCustomClassification,
  };
}
