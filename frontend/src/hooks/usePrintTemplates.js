import { useState, useEffect, useCallback } from "react";
import {
  buildPrintTemplateRecord,
  normalizePrintTemplate,
} from "@/utils/printStorage";

const TEMPLATES_KEY = "ghs_print_templates";
const MAX_TEMPLATES = 10;

export default function usePrintTemplates() {
  const [templates, setTemplates] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTemplates(parsed.map(normalizePrintTemplate).filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to parse print templates", e);
      }
    }
  }, []);

  const saveTemplate = useCallback((name, labelConfig, customLabelFields) => {
    if (!name || !name.trim()) return false;

    let saved = false;
    setTemplates((prev) => {
      if (prev.length >= MAX_TEMPLATES) return prev;

      const newTemplate = buildPrintTemplateRecord(
        name,
        labelConfig,
        customLabelFields
      );
      if (!newTemplate) return prev;
      const updated = [newTemplate, ...prev];
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      saved = true;
      return updated;
    });
    return saved;
  }, []);

  const deleteTemplate = useCallback((templateId) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== templateId);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearTemplates = useCallback(() => {
    setTemplates([]);
    localStorage.removeItem(TEMPLATES_KEY);
  }, []);

  return {
    templates,
    saveTemplate,
    deleteTemplate,
    clearTemplates,
  };
}
