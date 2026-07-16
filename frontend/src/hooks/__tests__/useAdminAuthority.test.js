import { act, renderHook } from "@testing-library/react";
import useAdminAuthority from "../useAdminAuthority";
import { PILOT_ADMIN_SESSION_KEY } from "@/constants/admin";

describe("useAdminAuthority", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-16T00:00:00Z"));
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts locked, deletes a legacy persisted key, and never persists unlocks", () => {
    sessionStorage.setItem(PILOT_ADMIN_SESSION_KEY, "legacy-secret");
    const { result, unmount } = renderHook(() => useAdminAuthority());

    expect(result.current.unlocked).toBe(false);
    expect(result.current.adminKey).toBe("");
    expect(sessionStorage.getItem(PILOT_ADMIN_SESSION_KEY)).toBeNull();

    act(() => result.current.unlock(" new-secret "));

    expect(result.current.unlocked).toBe(true);
    expect(result.current.adminKey).toBe("new-secret");
    expect(result.current.epoch).toBe(1);
    expect(sessionStorage.getItem(PILOT_ADMIN_SESSION_KEY)).toBeNull();

    unmount();
    const reloaded = renderHook(() => useAdminAuthority());
    expect(reloaded.result.current.unlocked).toBe(false);
    expect(reloaded.result.current.adminKey).toBe("");
  });

  it("locks after idle timeout and lets activity extend only the idle window", () => {
    const { result } = renderHook(() =>
      useAdminAuthority({ idleTimeoutMs: 1_000, absoluteLifetimeMs: 10_000 }),
    );
    act(() => result.current.unlock("secret"));

    act(() => jest.advanceTimersByTime(800));
    act(() => result.current.touch());
    act(() => jest.advanceTimersByTime(800));
    expect(result.current.unlocked).toBe(true);

    act(() => jest.advanceTimersByTime(200));
    expect(result.current.unlocked).toBe(false);
    expect(result.current.lockReason).toBe("idle-timeout");
    expect(result.current.epoch).toBe(2);
  });

  it("enforces absolute lifetime even when activity keeps resetting idle", () => {
    const { result } = renderHook(() =>
      useAdminAuthority({ idleTimeoutMs: 1_000, absoluteLifetimeMs: 2_000 }),
    );
    act(() => result.current.unlock("secret"));

    act(() => jest.advanceTimersByTime(800));
    act(() => result.current.touch());
    act(() => jest.advanceTimersByTime(800));
    act(() => result.current.touch());
    act(() => jest.advanceTimersByTime(400));

    expect(result.current.unlocked).toBe(false);
    expect(result.current.lockReason).toBe("absolute-timeout");
    expect(result.current.adminKey).toBe("");
  });

  it("explicit lock immediately clears the key and invalidates the epoch", () => {
    const { result } = renderHook(() => useAdminAuthority());
    act(() => result.current.unlock("secret"));
    const unlockedEpoch = result.current.epoch;

    act(() => result.current.lock("manual"));

    expect(result.current.unlocked).toBe(false);
    expect(result.current.adminKey).toBe("");
    expect(result.current.lockReason).toBe("manual");
    expect(result.current.epoch).toBe(unlockedEpoch + 1);
  });

  it("cannot unlock authority while the admin feature is disabled", () => {
    const { result } = renderHook(() => useAdminAuthority({ enabled: false }));

    act(() => expect(result.current.unlock("secret")).toBe(false));

    expect(result.current.unlocked).toBe(false);
    expect(result.current.adminKey).toBe("");
    expect(result.current.epoch).toBe(0);
  });
});
