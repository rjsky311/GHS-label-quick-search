import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API } from "@/constants/ghs";
import { buildPilotAdminHeaders } from "@/constants/admin";

export default function usePilotDashboard(options = {}) {
  const config =
    typeof options === "boolean" ? { enabled: options } : options || {};
  const enabled = Boolean(config.enabled);
  const adminKey = typeof config.adminKey === "string" ? config.adminKey : "";

  const [report, setReport] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [manualEntries, setManualEntries] = useState([]);
  const [referenceLinks, setReferenceLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");

  const requestConfig = useMemo(
    () => ({ headers: buildPilotAdminHeaders(adminKey) }),
    [adminKey]
  );

  const refresh = useCallback(async () => {
    if (!enabled) return null;

    setLoading(true);
    setError("");
    setAuthError("");

    try {
      const [reportResponse, aliasesResponse, entriesResponse, linksResponse] =
        await Promise.all([
          axios.get(`${API}/ops/report`, requestConfig),
          axios.get(`${API}/dictionary/aliases`, requestConfig),
          axios.get(`${API}/dictionary/manual-entries`, requestConfig),
          axios.get(`${API}/dictionary/reference-links`, requestConfig),
        ]);
      setReport(reportResponse.data);
      setAliases(
        Array.isArray(aliasesResponse.data?.items) ? aliasesResponse.data.items : []
      );
      setManualEntries(
        Array.isArray(entriesResponse.data?.items) ? entriesResponse.data.items : []
      );
      setReferenceLinks(
        Array.isArray(linksResponse.data?.items) ? linksResponse.data.items : []
      );
      return reportResponse.data;
    } catch (fetchError) {
      const status = fetchError?.response?.status;
      const detail =
        fetchError?.response?.data?.detail ||
        fetchError?.message ||
        "Failed to load admin dashboard data.";

      if ([401, 403, 503].includes(status)) {
        setAuthError(detail);
      }
      setError(detail);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, requestConfig]);

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
      } catch (mutationError) {
        if ([401, 403, 503].includes(mutationError?.response?.status)) {
          setAuthError(
            mutationError?.response?.data?.detail ||
              mutationError?.message ||
              "Admin access failed."
          );
        }
        throw mutationError;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const saveManualEntry = useCallback(
    async (payload) =>
      performMutation(() =>
        axios.post(`${API}/dictionary/manual-entries`, payload, requestConfig)
      ),
    [performMutation, requestConfig]
  );

  const saveAlias = useCallback(
    async (payload) =>
      performMutation(() =>
        axios.post(`${API}/dictionary/aliases`, payload, requestConfig)
      ),
    [performMutation, requestConfig]
  );

  const saveReferenceLink = useCallback(
    async (payload) =>
      performMutation(() =>
        axios.post(`${API}/dictionary/reference-links`, payload, requestConfig)
      ),
    [performMutation, requestConfig]
  );

  return {
    report,
    aliases,
    manualEntries,
    referenceLinks,
    loading,
    saving,
    error,
    authError,
    refresh,
    saveManualEntry,
    saveAlias,
    saveReferenceLink,
  };
}
