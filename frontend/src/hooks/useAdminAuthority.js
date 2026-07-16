import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearPilotAdminKey,
  PILOT_ADMIN_ABSOLUTE_LIFETIME_MS,
  PILOT_ADMIN_IDLE_TIMEOUT_MS,
} from "@/constants/admin";

const INITIAL_AUTHORITY = Object.freeze({
  adminKey: "",
  epoch: 0,
  unlockedAt: 0,
  lastActivityAt: 0,
  lockReason: "",
});

const boundedDuration = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : fallback;
};

export default function useAdminAuthority(options = {}) {
  const enabled = options.enabled !== false;
  const idleTimeoutMs = boundedDuration(
    options.idleTimeoutMs,
    PILOT_ADMIN_IDLE_TIMEOUT_MS,
  );
  const absoluteLifetimeMs = boundedDuration(
    options.absoluteLifetimeMs,
    PILOT_ADMIN_ABSOLUTE_LIFETIME_MS,
  );
  const [authority, setAuthority] = useState(INITIAL_AUTHORITY);
  const idleTimerRef = useRef(null);
  const absoluteTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (absoluteTimerRef.current != null) {
      window.clearTimeout(absoluteTimerRef.current);
      absoluteTimerRef.current = null;
    }
  }, []);

  const lock = useCallback(
    (reason = "manual") => {
      clearTimers();
      clearPilotAdminKey();
      setAuthority((current) => ({
        adminKey: "",
        epoch: current.epoch + 1,
        unlockedAt: 0,
        lastActivityAt: 0,
        lockReason: String(reason || "manual"),
      }));
    },
    [clearTimers],
  );

  const unlock = useCallback(
    (value) => {
      const adminKey = typeof value === "string" ? value.trim() : "";
      if (!enabled || !adminKey) return false;
      clearPilotAdminKey();
      const now = Date.now();
      setAuthority((current) => ({
        adminKey,
        epoch: current.epoch + 1,
        unlockedAt: now,
        lastActivityAt: now,
        lockReason: "",
      }));
      return true;
    },
    [enabled],
  );

  const touch = useCallback(() => {
    const now = Date.now();
    setAuthority((current) => {
      if (!current.adminKey || now - current.lastActivityAt < 250) {
        return current;
      }
      return { ...current, lastActivityAt: now };
    });
  }, []);

  useEffect(() => {
    // Remove keys written by releases before the memory-only authority model.
    clearPilotAdminKey();
  }, []);

  useEffect(() => {
    clearTimers();
    if (!authority.adminKey) return undefined;
    if (!enabled) {
      lock("disabled");
      return undefined;
    }

    const now = Date.now();
    const idleRemaining = Math.max(
      0,
      authority.lastActivityAt + idleTimeoutMs - now,
    );
    const absoluteRemaining = Math.max(
      0,
      authority.unlockedAt + absoluteLifetimeMs - now,
    );
    if (idleRemaining === 0) {
      lock("idle-timeout");
      return undefined;
    }
    if (absoluteRemaining === 0) {
      lock("absolute-timeout");
      return undefined;
    }

    idleTimerRef.current = window.setTimeout(
      () => lock("idle-timeout"),
      idleRemaining,
    );
    absoluteTimerRef.current = window.setTimeout(
      () => lock("absolute-timeout"),
      absoluteRemaining,
    );
    return clearTimers;
  }, [
    absoluteLifetimeMs,
    authority.adminKey,
    authority.lastActivityAt,
    authority.unlockedAt,
    clearTimers,
    enabled,
    idleTimeoutMs,
    lock,
  ]);

  useEffect(() => {
    if (!enabled || !authority.adminKey) return undefined;
    const markActivity = () => touch();
    const markVisibleActivity = () => {
      if (document.visibilityState === "visible") touch();
    };
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    document.addEventListener("visibilitychange", markVisibleActivity);
    return () => {
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      document.removeEventListener("visibilitychange", markVisibleActivity);
    };
  }, [authority.adminKey, enabled, touch]);

  useEffect(() => clearTimers, [clearTimers]);

  return useMemo(
    () => ({
      adminKey: enabled ? authority.adminKey : "",
      unlocked: enabled && Boolean(authority.adminKey),
      epoch: authority.epoch,
      lockReason: authority.lockReason,
      unlock,
      lock,
      touch,
    }),
    [authority, enabled, lock, touch, unlock],
  );
}
