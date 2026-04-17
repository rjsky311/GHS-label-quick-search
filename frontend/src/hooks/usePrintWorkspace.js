import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LABEL_CONFIG,
  normalizePrintLabelConfig,
} from "@/constants/labelStocks";
import useLabProfile from "@/hooks/useLabProfile";
import usePrintRecents from "@/hooks/usePrintRecents";
import usePrintTemplates from "@/hooks/usePrintTemplates";
import {
  EMPTY_CUSTOM_LABEL_FIELDS,
  normalizeCustomLabelFields,
} from "@/utils/printStorage";

const CUSTOM_FIELDS_KEY = "ghs_custom_label_fields";

function loadCustomLabelFields() {
  try {
    const raw = localStorage.getItem(CUSTOM_FIELDS_KEY);
    if (!raw) return { ...EMPTY_CUSTOM_LABEL_FIELDS };
    return normalizeCustomLabelFields(JSON.parse(raw));
  } catch {
    return { ...EMPTY_CUSTOM_LABEL_FIELDS };
  }
}

export default function usePrintWorkspace() {
  const [labelConfig, setLabelConfigState] = useState(() =>
    normalizePrintLabelConfig(DEFAULT_LABEL_CONFIG)
  );
  const [customLabelFields, setCustomLabelFieldsState] = useState(() =>
    loadCustomLabelFields()
  );
  const [labelQuantities, setLabelQuantities] = useState({});
  const { templates, saveTemplate: persistTemplate, deleteTemplate } = usePrintTemplates();
  const { labProfile, setLabProfile, clearLabProfile } = useLabProfile();
  const { recentPrints, addRecentPrint, clearRecentPrints } = usePrintRecents();

  const setLabelConfig = useCallback((nextConfig) => {
    setLabelConfigState((prev) => {
      const resolved =
        typeof nextConfig === "function" ? nextConfig(prev) : nextConfig;
      return normalizePrintLabelConfig(resolved);
    });
  }, []);

  const setCustomLabelFields = useCallback((nextFields) => {
    setCustomLabelFieldsState((prev) => {
      const resolved =
        typeof nextFields === "function" ? nextFields(prev) : nextFields;
      return normalizeCustomLabelFields(resolved);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(customLabelFields));
  }, [customLabelFields]);

  const saveTemplate = useCallback(
    (name) => persistTemplate(name, labelConfig, customLabelFields),
    [persistTemplate, labelConfig, customLabelFields]
  );

  const loadTemplate = useCallback(
    (template) => {
      setLabelConfig(template?.labelConfig || DEFAULT_LABEL_CONFIG);
      setCustomLabelFields(template?.customLabelFields || EMPTY_CUSTOM_LABEL_FIELDS);
    },
    [setLabelConfig, setCustomLabelFields]
  );

  const loadRecentPrint = useCallback(
    (record) => {
      if (!record) return [];
      setLabelConfig(record.labelConfig || DEFAULT_LABEL_CONFIG);
      setCustomLabelFields(record.customLabelFields || EMPTY_CUSTOM_LABEL_FIELDS);
      setLabProfile(record.labProfile || {});
      setLabelQuantities(record.labelQuantities || {});
      return Array.isArray(record.items) ? record.items : [];
    },
    [setLabelConfig, setCustomLabelFields, setLabProfile]
  );

  return {
    labelConfig,
    setLabelConfig,
    customLabelFields,
    setCustomLabelFields,
    labelQuantities,
    setLabelQuantities,
    templates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    labProfile,
    setLabProfile,
    clearLabProfile,
    recentPrints,
    addRecentPrint,
    clearRecentPrints,
    loadRecentPrint,
  };
}
