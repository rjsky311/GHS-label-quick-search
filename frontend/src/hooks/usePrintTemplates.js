import { useState, useEffect, useCallback } from "react";
import {
  buildPrintTemplateRecord,
  normalizePrintTemplate,
} from "@/utils/printStorage";
import {
  fetchWorkspaceDocument,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";

const TEMPLATES_KEY = "ghs_print_templates";
const MAX_TEMPLATES = 10;

export default function usePrintTemplates() {
  const [templates, setTemplates] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const localTemplates = (() => {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      if (!saved) return [];
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizePrintTemplate).filter(Boolean);
      } catch (e) {
        console.error("Failed to parse print templates", e);
        return [];
      }
    })();

    if (localTemplates.length > 0) {
      setTemplates(localTemplates);
    }

    let cancelled = false;
    async function syncFromBackend() {
      try {
        const remote = await fetchWorkspaceDocument("print_templates");
        const remotePayload = Array.isArray(remote?.payload)
          ? remote.payload.map(normalizePrintTemplate).filter(Boolean)
          : [];

        if (remotePayload.length > 0) {
          if (!cancelled) {
            setTemplates(remotePayload);
            localStorage.setItem(TEMPLATES_KEY, JSON.stringify(remotePayload));
          }
          return;
        }

        if (localTemplates.length > 0) {
          await saveWorkspaceDocument("print_templates", localTemplates);
        }
      } catch {
        // Local fallback remains active when backend sync fails.
      }
    }

    syncFromBackend();
    return () => {
      cancelled = true;
    };
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
      void saveWorkspaceDocument("print_templates", updated).catch(() => {});
      saved = true;
      return updated;
    });
    return saved;
  }, []);

  const deleteTemplate = useCallback((templateId) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== templateId);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      void saveWorkspaceDocument("print_templates", updated).catch(() => {});
      return updated;
    });
  }, []);

  const clearTemplates = useCallback(() => {
    setTemplates([]);
    localStorage.removeItem(TEMPLATES_KEY);
    void saveWorkspaceDocument("print_templates", []).catch(() => {});
  }, []);

  return {
    templates,
    saveTemplate,
    deleteTemplate,
    clearTemplates,
  };
}
