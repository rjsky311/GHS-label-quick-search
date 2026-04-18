import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/constants/ghs";

export default function usePilotDashboard(enabled = false) {
  const [report, setReport] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [manualEntries, setManualEntries] = useState([]);
  const [referenceLinks, setReferenceLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reportResponse, aliasesResponse, entriesResponse, linksResponse] = await Promise.all([
        axios.get(`${API}/ops/report`),
        axios.get(`${API}/dictionary/aliases`),
        axios.get(`${API}/dictionary/manual-entries`),
        axios.get(`${API}/dictionary/reference-links`),
      ]);
      setReport(reportResponse.data);
      setAliases(Array.isArray(aliasesResponse.data?.items) ? aliasesResponse.data.items : []);
      setManualEntries(Array.isArray(entriesResponse.data?.items) ? entriesResponse.data.items : []);
      setReferenceLinks(Array.isArray(linksResponse.data?.items) ? linksResponse.data.items : []);
    } catch (fetchError) {
      setError(
        fetchError?.response?.data?.detail ||
          fetchError?.message ||
          "Failed to load pilot dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  const performMutation = useCallback(
    async (requestFactory) => {
      setSaving(true);
      try {
        const response = await requestFactory();
        await refresh();
        return response.data;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const saveManualEntry = useCallback(
    async (payload) =>
      performMutation(() => axios.post(`${API}/dictionary/manual-entries`, payload)),
    [performMutation]
  );

  const saveAlias = useCallback(
    async (payload) =>
      performMutation(() => axios.post(`${API}/dictionary/aliases`, payload)),
    [performMutation]
  );

  const saveReferenceLink = useCallback(
    async (payload) =>
      performMutation(() => axios.post(`${API}/dictionary/reference-links`, payload)),
    [performMutation]
  );

  return {
    report,
    aliases,
    manualEntries,
    referenceLinks,
    loading,
    saving,
    error,
    refresh,
    saveManualEntry,
    saveAlias,
    saveReferenceLink,
  };
}
