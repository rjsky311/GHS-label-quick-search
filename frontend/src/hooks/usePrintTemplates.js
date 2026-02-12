import { useState, useEffect, useCallback } from "react";

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
        if (Array.isArray(parsed)) setTemplates(parsed);
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

      const newTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: name.trim().slice(0, 30),
        labelConfig: { ...labelConfig },
        customLabelFields: { ...customLabelFields },
        createdAt: new Date().toISOString(),
      };
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
