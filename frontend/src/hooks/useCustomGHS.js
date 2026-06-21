import { useState, useEffect, useCallback } from "react";
import {
  readJsonStorage,
  removeStorageItem,
  writeJsonStorage,
} from "@/utils/localStorageJson";
import { resolveSelectedGhsClassification } from "@/utils/selectedGhsClassification";

const CUSTOM_GHS_KEY = "ghs_custom_settings";

function normalizeCustomSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

export default function useCustomGHS() {
  const [customGHSSettings, setCustomGHSSettings] = useState({});

  // Load custom GHS settings from localStorage on mount
  useEffect(() => {
    setCustomGHSSettings(
      readJsonStorage(CUSTOM_GHS_KEY, {}, {
        normalize: normalizeCustomSettings,
        validate: (value) => Object.keys(value).length > 0,
      })
    );
  }, []);

  // Get the effective GHS classification for a result (considering user customization)
  const getEffectiveClassification = useCallback(
    (result) => {
      if (!result || !result.found) return null;
      return resolveSelectedGhsClassification(result, customGHSSettings);
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
        writeJsonStorage(CUSTOM_GHS_KEY, newSettings);
        return newSettings;
      });
    },
    []
  );

  const clearCustomClassification = useCallback((casNumber) => {
    setCustomGHSSettings((prev) => {
      const newSettings = { ...prev };
      delete newSettings[casNumber];
      if (Object.keys(newSettings).length > 0) {
        writeJsonStorage(CUSTOM_GHS_KEY, newSettings);
      } else {
        removeStorageItem(CUSTOM_GHS_KEY);
      }
      return newSettings;
    });
  }, []);

  const hasCustomClassification = useCallback(
    (casNumber) => customGHSSettings[casNumber]?.selectedIndex != null,
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
