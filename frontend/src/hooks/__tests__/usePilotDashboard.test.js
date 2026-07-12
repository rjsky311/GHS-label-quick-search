import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import usePilotDashboard from "../usePilotDashboard";

jest.mock("axios");

const DASHBOARD_ENDPOINTS = [
  {
    matches: "/ops/report",
    response: (owner) => ({ data: { owner, total: 1 } }),
  },
  {
    matches: "/dictionary/aliases",
    response: (owner) => ({ data: { items: [{ owner, kind: "alias" }] } }),
  },
  {
    matches: "/dictionary/manual-entries",
    response: (owner) => ({ data: { items: [{ owner, kind: "manual" }] } }),
  },
  {
    matches: "/dictionary/reference-links",
    response: (owner) => ({ data: { items: [{ owner, kind: "link" }] } }),
  },
  {
    matches: "/dictionary/correction-requests",
    response: (owner) => ({ data: { items: [{ owner, kind: "correction" }] } }),
  },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function axiosError(status, detail = `status-${status}`) {
  const error = new Error(detail);
  error.response = { status, data: { detail } };
  return error;
}

function responseForEndpoint(url, owner) {
  const endpoint = DASHBOARD_ENDPOINTS.find(({ matches }) =>
    url.includes(matches)
  );
  if (!endpoint) {
    throw new Error(`Unexpected Pilot endpoint: ${url}`);
  }
  return endpoint.response(owner);
}

let dashboardBatches;
let dashboardGetIndex;
let dashboardGetConfigs;

function queueDashboardResponse(source) {
  dashboardBatches.push(source?.promise || Promise.resolve(source));
}

function renderDashboard(initialProps) {
  const renderedValues = [];
  const hook = renderHook(
    (props) => {
      const value = usePilotDashboard(props);
      renderedValues.push(value);
      return value;
    },
    { initialProps }
  );
  return { ...hook, renderedValues };
}

function expectPrivilegedStateMasked(subject) {
  const value = subject?.current || subject;
  expect(value.report).toBeNull();
  expect(value.aliases).toEqual([]);
  expect(value.manualEntries).toEqual([]);
  expect(value.referenceLinks).toEqual([]);
  expect(value.correctionRequests).toEqual([]);
}

function expectDatasetOwner(result, owner) {
  expect(result.current.report?.owner).toBe(owner);
  expect(result.current.aliases[0]?.owner).toBe(owner);
  expect(result.current.manualEntries[0]?.owner).toBe(owner);
  expect(result.current.referenceLinks[0]?.owner).toBe(owner);
  expect(result.current.correctionRequests[0]?.owner).toBe(owner);
}

async function waitForDatasetOwner(result, owner) {
  await waitFor(() => expectDatasetOwner(result, owner));
}

describe("usePilotDashboard auth-context isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dashboardBatches = [];
    dashboardGetIndex = 0;
    dashboardGetConfigs = [];
    axios.get.mockImplementation((url, config) => {
      dashboardGetConfigs.push(config);
      const batchIndex = Math.floor(
        dashboardGetIndex / DASHBOARD_ENDPOINTS.length
      );
      dashboardGetIndex += 1;
      const batch = dashboardBatches[batchIndex];
      if (!batch) {
        return Promise.reject(
          new Error(`No queued Pilot response batch for ${url}`)
        );
      }
      return batch.then((owner) => responseForEndpoint(url, owner));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("masks every privileged field immediately when Pilot is disabled", async () => {
    queueDashboardResponse("key-a");
    const { result, renderedValues, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    await waitForDatasetOwner(result, "key-a");
    const renderCountBeforeTransition = renderedValues.length;

    rerender({ enabled: false, adminKey: "key-a" });

    expectPrivilegedStateMasked(renderedValues[renderCountBeforeTransition]);
    expectPrivilegedStateMasked(result);
  });

  it("masks previous-key data immediately while the replacement request is pending", async () => {
    queueDashboardResponse("key-a");
    const replacement = deferred();
    const { result, renderedValues, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    await waitForDatasetOwner(result, "key-a");
    queueDashboardResponse(replacement);
    const renderCountBeforeTransition = renderedValues.length;

    rerender({ enabled: true, adminKey: "key-b" });

    expectPrivilegedStateMasked(renderedValues[renderCountBeforeTransition]);
    expectPrivilegedStateMasked(result);
  });

  it("ignores a late success from an older admin key", async () => {
    const olderKey = deferred();
    queueDashboardResponse(olderKey);
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    queueDashboardResponse("key-b-current");

    rerender({ enabled: true, adminKey: "key-b" });
    await waitForDatasetOwner(result, "key-b-current");

    await act(async () => {
      olderKey.resolve("key-a-late");
      await olderKey.promise;
    });

    expectDatasetOwner(result, "key-b-current");
    expect(result.current.error).toBe("");
    expect(result.current.authError).toBe("");
  });

  it("ignores a late success from a superseded refresh in the same context", async () => {
    const olderRefresh = deferred();
    queueDashboardResponse(olderRefresh);
    const { result } = renderDashboard({ enabled: true, adminKey: "key-a" });
    queueDashboardResponse("newer-refresh");

    await act(async () => {
      await result.current.refresh();
    });
    expectDatasetOwner(result, "newer-refresh");

    await act(async () => {
      olderRefresh.resolve("older-refresh-late");
      await olderRefresh.promise;
    });

    expectDatasetOwner(result, "newer-refresh");
  });

  it("ignores a late auth failure from a superseded refresh", async () => {
    const olderRefresh = deferred();
    queueDashboardResponse(olderRefresh);
    const { result } = renderDashboard({ enabled: true, adminKey: "key-a" });
    queueDashboardResponse("newer-refresh");

    await act(async () => {
      await result.current.refresh();
    });
    expectDatasetOwner(result, "newer-refresh");

    await act(async () => {
      olderRefresh.reject(axiosError(401, "stale auth failure"));
      await Promise.allSettled([olderRefresh.promise]);
    });

    expectDatasetOwner(result, "newer-refresh");
    expect(result.current.error).toBe("");
    expect(result.current.authError).toBe("");
  });

  it("passes one GET signal per refresh and releases a superseded controller immediately", async () => {
    const olderRefresh = deferred();
    const newerRefresh = deferred();
    const abortSpy = jest.spyOn(AbortController.prototype, "abort");
    queueDashboardResponse(olderRefresh);
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledTimes(DASHBOARD_ENDPOINTS.length)
    );

    queueDashboardResponse(newerRefresh);
    let newerRefreshPromise;
    act(() => {
      newerRefreshPromise = result.current.refresh();
    });
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledTimes(DASHBOARD_ENDPOINTS.length * 2)
    );

    const olderConfigs = dashboardGetConfigs.slice(0, DASHBOARD_ENDPOINTS.length);
    const newerConfigs = dashboardGetConfigs.slice(DASHBOARD_ENDPOINTS.length);
    const olderSignal = olderConfigs[0].signal;
    const newerSignal = newerConfigs[0].signal;
    expect(new Set(olderConfigs.map(({ signal }) => signal))).toEqual(
      new Set([olderSignal])
    );
    expect(new Set(newerConfigs.map(({ signal }) => signal))).toEqual(
      new Set([newerSignal])
    );
    expect(olderSignal).toBeDefined();
    expect(newerSignal).toBeDefined();
    expect(olderSignal.aborted).toBe(true);
    expect(newerSignal.aborted).toBe(false);
    expect(abortSpy).toHaveBeenCalledTimes(1);

    rerender({ enabled: false, adminKey: "key-a" });

    expect(newerSignal.aborted).toBe(true);
    expect(abortSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      olderRefresh.resolve("older-late");
      newerRefresh.resolve("newer-late");
      await Promise.all([olderRefresh.promise, newerRefreshPromise]);
    });
    abortSpy.mockRestore();
  });

  it("survives StrictMode effect replay and aborts both replayed and unmounted GET signals", async () => {
    const replayedRefresh = deferred();
    const currentRefresh = deferred();
    queueDashboardResponse(replayedRefresh);
    queueDashboardResponse(currentRefresh);

    const { unmount } = renderHook(
      (props) => usePilotDashboard(props),
      {
        initialProps: { enabled: true, adminKey: "key-a" },
        wrapper: StrictMode,
      }
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledTimes(DASHBOARD_ENDPOINTS.length * 2)
    );
    const replayedSignal = dashboardGetConfigs[0].signal;
    const currentSignal = dashboardGetConfigs[DASHBOARD_ENDPOINTS.length].signal;
    expect(replayedSignal).toBeDefined();
    expect(currentSignal).toBeDefined();
    expect(replayedSignal.aborted).toBe(true);
    expect(currentSignal.aborted).toBe(false);

    unmount();

    expect(currentSignal.aborted).toBe(true);
    await act(async () => {
      replayedRefresh.resolve("strict-replayed-late");
      currentRefresh.resolve("strict-current-late");
      await Promise.all([replayedRefresh.promise, currentRefresh.promise]);
    });
  });

  it("treats enabled A to disabled to enabled A as a new generation for late success", async () => {
    const priorActivation = deferred();
    queueDashboardResponse(priorActivation);
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });

    rerender({ enabled: false, adminKey: "key-a" });
    expectPrivilegedStateMasked(result);

    queueDashboardResponse("key-a-current");
    rerender({ enabled: true, adminKey: "key-a" });
    await waitForDatasetOwner(result, "key-a-current");

    await act(async () => {
      priorActivation.resolve("key-a-prior-activation");
      await priorActivation.promise;
    });

    expectDatasetOwner(result, "key-a-current");
  });

  it("treats enabled A to disabled to enabled A as a new generation for late auth errors", async () => {
    const priorActivation = deferred();
    queueDashboardResponse(priorActivation);
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });

    rerender({ enabled: false, adminKey: "key-a" });
    queueDashboardResponse("key-a-current");
    rerender({ enabled: true, adminKey: "key-a" });
    await waitForDatasetOwner(result, "key-a-current");

    await act(async () => {
      priorActivation.reject(axiosError(401, "prior activation rejected"));
      await Promise.allSettled([priorActivation.promise]);
    });

    expectDatasetOwner(result, "key-a-current");
    expect(result.current.error).toBe("");
    expect(result.current.authError).toBe("");
  });

  it.each([401, 403, 503])(
    "clears privileged data before exposing a %s refresh error",
    async (status) => {
      queueDashboardResponse("key-a");
      const { result } = renderDashboard({ enabled: true, adminKey: "key-a" });
      await waitForDatasetOwner(result, "key-a");

      const failedRefresh = deferred();
      queueDashboardResponse(failedRefresh);
      let refreshPromise;
      act(() => {
        refreshPromise = result.current.refresh();
      });
      await act(async () => {
        failedRefresh.reject(axiosError(status));
        await refreshPromise;
      });

      expectPrivilegedStateMasked(result);
      expect(result.current.error).toBe(`status-${status}`);
      expect(result.current.authError).toBe(`status-${status}`);
    }
  );

  it("does not refresh or repopulate after a mutation outlives its auth context", async () => {
    queueDashboardResponse("key-a");
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    await waitForDatasetOwner(result, "key-a");

    const mutation = deferred();
    axios.post.mockReturnValueOnce(mutation.promise);
    let mutationPromise;
    act(() => {
      mutationPromise = result.current.saveManualEntry({ cas_number: "64-17-5" });
    });
    const mutationSignal = axios.post.mock.calls[0][2].signal;
    expect(mutationSignal).toBeDefined();
    expect(mutationSignal.aborted).toBe(false);
    queueDashboardResponse("stale-mutation-refresh");

    rerender({ enabled: false, adminKey: "key-a" });
    expect(mutationSignal.aborted).toBe(true);
    expectPrivilegedStateMasked(result);

    await act(async () => {
      mutation.resolve({ data: { id: "saved" } });
      await mutationPromise;
    });

    expect(axios.get).toHaveBeenCalledTimes(DASHBOARD_ENDPOINTS.length);
    expectPrivilegedStateMasked(result);
    expect(result.current.authError).toBe("");
  });

  it("ignores a stale mutation auth error after the context is disabled", async () => {
    queueDashboardResponse("key-a");
    const { result, rerender } = renderDashboard({
      enabled: true,
      adminKey: "key-a",
    });
    await waitForDatasetOwner(result, "key-a");

    const mutation = deferred();
    axios.post.mockReturnValueOnce(mutation.promise);
    let mutationPromise;
    act(() => {
      mutationPromise = result.current.saveAlias({ alias: "EtOH" });
    });
    rerender({ enabled: false, adminKey: "key-a" });

    const staleAuthError = axiosError(403, "stale mutation rejected");
    await act(async () => {
      mutation.reject(staleAuthError);
      await expect(mutationPromise).resolves.toBeNull();
    });

    expect(result.current.error).toBe("");
    expect(result.current.authError).toBe("");
    expectPrivilegedStateMasked(result);
  });

  it("keeps current-context mutation errors rejecting with current auth detail", async () => {
    queueDashboardResponse("key-a");
    const { result } = renderDashboard({ enabled: true, adminKey: "key-a" });
    await waitForDatasetOwner(result, "key-a");

    const currentAuthError = axiosError(403, "current mutation rejected");
    axios.post.mockRejectedValueOnce(currentAuthError);

    await act(async () => {
      await expect(
        result.current.saveAlias({ alias_text: "EtOH" })
      ).rejects.toBe(currentAuthError);
    });

    expect(result.current.error).toBe("current mutation rejected");
    expect(result.current.authError).toBe("current mutation rejected");
  });

  it("refuses mutations when the current auth context is inactive", async () => {
    const { result } = renderDashboard({ enabled: false, adminKey: "key-a" });

    await expect(result.current.saveReferenceLink({ url: "https://example.test" }))
      .resolves.toBeNull();

    expect(axios.post).not.toHaveBeenCalled();
    expectPrivilegedStateMasked(result);
  });
});
