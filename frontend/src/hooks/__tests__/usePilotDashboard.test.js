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
    axios.get.mockImplementation((url) => {
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
    queueDashboardResponse("stale-mutation-refresh");

    rerender({ enabled: false, adminKey: "key-a" });
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
      await expect(mutationPromise).rejects.toBe(staleAuthError);
    });

    expect(result.current.error).toBe("");
    expect(result.current.authError).toBe("");
    expectPrivilegedStateMasked(result);
  });

  it("refuses mutations when the current auth context is inactive", async () => {
    const { result } = renderDashboard({ enabled: false, adminKey: "key-a" });

    await expect(result.current.saveReferenceLink({ url: "https://example.test" }))
      .resolves.toBeNull();

    expect(axios.post).not.toHaveBeenCalled();
    expectPrivilegedStateMasked(result);
  });
});
