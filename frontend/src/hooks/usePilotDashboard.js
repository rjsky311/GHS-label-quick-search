import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { API } from "@/constants/ghs";
import { buildPilotAdminHeaders } from "@/constants/admin";

const EMPTY_PRIVILEGED_STATE = {
  contextToken: null,
  report: null,
  aliases: [],
  manualEntries: [],
  referenceLinks: [],
  correctionRequests: [],
};

const EMPTY_REQUEST_STATE = {
  contextToken: null,
  loading: false,
  saving: false,
  error: "",
  authError: "",
};

const isAdminAccessError = (status) => [401, 403, 503].includes(status);

export default function usePilotDashboard(options = {}) {
  const config =
    typeof options === "boolean" ? { enabled: options } : options || {};
  const enabled = Boolean(config.enabled);
  const adminKey = typeof config.adminKey === "string" ? config.adminKey : "";
  const activeContext = enabled && Boolean(adminKey);

  const authContextToken = useMemo(
    () => ({ enabled, adminKey }),
    [adminKey, enabled]
  );
  const currentContextTokenRef = useRef(authContextToken);
  const generationRef = useRef(0);

  const [privilegedState, setPrivilegedState] = useState(
    EMPTY_PRIVILEGED_STATE
  );
  const [requestState, setRequestState] = useState(EMPTY_REQUEST_STATE);
  const mountedRef = useRef(false);
  const refreshRequestIdRef = useRef(0);
  const mutationRequestIdRef = useRef(0);
  const refreshControllerRef = useRef(null);
  const activeControllersRef = useRef(new Set());

  const requestConfig = useMemo(
    () => ({ headers: buildPilotAdminHeaders(adminKey) }),
    [adminKey]
  );

  const clearPrivilegedState = useCallback(() => {
    setPrivilegedState(EMPTY_PRIVILEGED_STATE);
  }, []);

  const updateRequestState = useCallback((contextToken, updates) => {
    setRequestState((current) => ({
      ...(current.contextToken === contextToken
        ? current
        : { ...EMPTY_REQUEST_STATE, contextToken }),
      ...updates,
      contextToken,
    }));
  }, []);

  const abortActiveRequests = useCallback(() => {
    activeControllersRef.current.forEach((controller) => controller.abort());
    activeControllersRef.current.clear();
    refreshControllerRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (currentContextTokenRef.current === authContextToken) return;

    currentContextTokenRef.current = authContextToken;
    generationRef.current += 1;
    abortActiveRequests();
    clearPrivilegedState();
    setRequestState(EMPTY_REQUEST_STATE);
  }, [abortActiveRequests, authContextToken, clearPrivilegedState]);

  const refresh = useCallback(async () => {
    if (
      !activeContext ||
      currentContextTokenRef.current !== authContextToken
    ) {
      return null;
    }

    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    activeControllersRef.current.add(controller);

    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const requestGeneration = generationRef.current;
    const isCurrentRequest = () =>
      mountedRef.current &&
      generationRef.current === requestGeneration &&
      currentContextTokenRef.current === authContextToken &&
      refreshRequestIdRef.current === requestId;

    updateRequestState(authContextToken, {
      loading: true,
      error: "",
      authError: "",
    });

    const axiosConfig = { ...requestConfig, signal: controller.signal };

    try {
      const [
        reportResponse,
        aliasesResponse,
        entriesResponse,
        linksResponse,
        correctionRequestsResponse,
      ] = await Promise.all([
        axios.get(`${API}/ops/report`, axiosConfig),
        axios.get(`${API}/dictionary/aliases`, axiosConfig),
        axios.get(`${API}/dictionary/manual-entries`, axiosConfig),
        axios.get(
          `${API}/dictionary/reference-links?include_inactive=true`,
          axiosConfig
        ),
        axios.get(`${API}/dictionary/correction-requests`, axiosConfig),
      ]);

      if (!isCurrentRequest()) return null;

      setPrivilegedState({
        contextToken: authContextToken,
        report: reportResponse.data,
        aliases: Array.isArray(aliasesResponse.data?.items)
          ? aliasesResponse.data.items
          : [],
        manualEntries: Array.isArray(entriesResponse.data?.items)
          ? entriesResponse.data.items
          : [],
        referenceLinks: Array.isArray(linksResponse.data?.items)
          ? linksResponse.data.items
          : [],
        correctionRequests: Array.isArray(
          correctionRequestsResponse.data?.items
        )
          ? correctionRequestsResponse.data.items
          : [],
      });
      return reportResponse.data;
    } catch (fetchError) {
      if (!isCurrentRequest()) return null;

      const status = fetchError?.response?.status;
      const detail =
        fetchError?.response?.data?.detail ||
        fetchError?.message ||
        "Failed to load admin dashboard data.";

      if (isAdminAccessError(status)) {
        clearPrivilegedState();
      }
      updateRequestState(authContextToken, {
        error: detail,
        authError: isAdminAccessError(status) ? detail : "",
      });
      return null;
    } finally {
      activeControllersRef.current.delete(controller);
      if (refreshControllerRef.current === controller) {
        refreshControllerRef.current = null;
      }
      if (isCurrentRequest()) {
        updateRequestState(authContextToken, { loading: false });
      }
    }
  }, [
    activeContext,
    authContextToken,
    clearPrivilegedState,
    requestConfig,
    updateRequestState,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      abortActiveRequests();
    };
  }, [abortActiveRequests]);

  useEffect(() => {
    if (activeContext) {
      refresh();
    }
  }, [activeContext, authContextToken, refresh]);

  const performMutation = useCallback(
    async (requestFactory) => {
      if (
        !activeContext ||
        currentContextTokenRef.current !== authContextToken
      ) {
        return null;
      }

      const controller = new AbortController();
      activeControllersRef.current.add(controller);
      const requestGeneration = generationRef.current;
      const requestId = mutationRequestIdRef.current + 1;
      mutationRequestIdRef.current = requestId;
      const isCurrentMutation = () =>
        mountedRef.current &&
        generationRef.current === requestGeneration &&
        currentContextTokenRef.current === authContextToken;
      const isLatestMutation = () =>
        isCurrentMutation() && mutationRequestIdRef.current === requestId;

      updateRequestState(authContextToken, {
        saving: true,
        error: "",
        authError: "",
      });

      try {
        const response = await requestFactory(controller.signal);
        if (!isCurrentMutation()) return null;

        await refresh();
        return isCurrentMutation() ? response.data : null;
      } catch (mutationError) {
        if (isCurrentMutation()) {
          const status = mutationError?.response?.status;
          const detail =
            mutationError?.response?.data?.detail ||
            mutationError?.message ||
            "Admin access failed.";
          if (isAdminAccessError(status)) {
            clearPrivilegedState();
          }
          updateRequestState(authContextToken, {
            error: detail,
            authError: isAdminAccessError(status) ? detail : "",
          });
        }
        throw mutationError;
      } finally {
        activeControllersRef.current.delete(controller);
        if (isLatestMutation()) {
          updateRequestState(authContextToken, { saving: false });
        }
      }
    },
    [
      activeContext,
      authContextToken,
      clearPrivilegedState,
      refresh,
      updateRequestState,
    ]
  );

  const saveManualEntry = useCallback(
    async (payload) =>
      performMutation((signal) =>
        axios.post(`${API}/dictionary/manual-entries`, payload, {
          ...requestConfig,
          signal,
        })
      ),
    [performMutation, requestConfig]
  );

  const saveAlias = useCallback(
    async (payload) =>
      performMutation((signal) =>
        axios.post(`${API}/dictionary/aliases`, payload, {
          ...requestConfig,
          signal,
        })
      ),
    [performMutation, requestConfig]
  );

  const saveReferenceLink = useCallback(
    async (payload) =>
      performMutation((signal) =>
        axios.post(`${API}/dictionary/reference-links`, payload, {
          ...requestConfig,
          signal,
        })
      ),
    [performMutation, requestConfig]
  );

  const resolveMissQuery = useCallback(
    async (missId, payload) =>
      performMutation((signal) =>
        axios.post(
          `${API}/dictionary/miss-queries/${missId}/resolution`,
          payload,
          { ...requestConfig, signal }
        )
      ),
    [performMutation, requestConfig]
  );

  const purgeStaleMissQueries = useCallback(
    async (payload = {}) =>
      performMutation((signal) =>
        axios.post(
          `${API}/dictionary/miss-queries/retention/purge`,
          payload,
          { ...requestConfig, signal }
        )
      ),
    [performMutation, requestConfig]
  );

  const updateCorrectionRequestStatus = useCallback(
    async (requestId, payload) =>
      performMutation((signal) =>
        axios.post(
          `${API}/dictionary/correction-requests/${requestId}/status`,
          payload,
          { ...requestConfig, signal }
        )
      ),
    [performMutation, requestConfig]
  );

  const canExposePrivilegedState =
    activeContext && privilegedState.contextToken === authContextToken;
  const canExposeRequestState =
    activeContext && requestState.contextToken === authContextToken;

  return {
    report: canExposePrivilegedState ? privilegedState.report : null,
    aliases: canExposePrivilegedState
      ? privilegedState.aliases
      : EMPTY_PRIVILEGED_STATE.aliases,
    manualEntries: canExposePrivilegedState
      ? privilegedState.manualEntries
      : EMPTY_PRIVILEGED_STATE.manualEntries,
    referenceLinks: canExposePrivilegedState
      ? privilegedState.referenceLinks
      : EMPTY_PRIVILEGED_STATE.referenceLinks,
    correctionRequests: canExposePrivilegedState
      ? privilegedState.correctionRequests
      : EMPTY_PRIVILEGED_STATE.correctionRequests,
    loading: canExposeRequestState ? requestState.loading : false,
    saving: canExposeRequestState ? requestState.saving : false,
    error: canExposeRequestState ? requestState.error : "",
    authError: canExposeRequestState ? requestState.authError : "",
    refresh,
    saveManualEntry,
    saveAlias,
    saveReferenceLink,
    resolveMissQuery,
    purgeStaleMissQueries,
    updateCorrectionRequestStatus,
  };
}
