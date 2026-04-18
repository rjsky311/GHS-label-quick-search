import { useCallback, useEffect, useState } from "react";
import {
  fetchWorkspaceDocument,
  hasMeaningfulWorkspacePayload,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";

export const LAB_PROFILE_KEY = "ghs_lab_profile";

const EMPTY_PROFILE = Object.freeze({
  organization: "",
  phone: "",
  address: "",
});

function sanitizeProfile(raw) {
  return {
    organization:
      typeof raw?.organization === "string" ? raw.organization : "",
    phone: typeof raw?.phone === "string" ? raw.phone : "",
    address: typeof raw?.address === "string" ? raw.address : "",
  };
}

function loadLegacyLabName() {
  try {
    const raw = localStorage.getItem("ghs_custom_label_fields");
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_PROFILE,
      organization:
        typeof parsed?.labName === "string" ? parsed.labName : "",
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LAB_PROFILE_KEY);
    if (!raw) return loadLegacyLabName();
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function persist(profile) {
  localStorage.setItem(LAB_PROFILE_KEY, JSON.stringify(profile));
}

export default function useLabProfile() {
  const [labProfile, setLabProfileState] = useState(() => loadFromStorage());

  useEffect(() => {
    let cancelled = false;
    const localSnapshot = loadFromStorage();

    async function syncFromBackend() {
      try {
        const remote = await fetchWorkspaceDocument("lab_profile");
        const remoteProfile = sanitizeProfile(remote?.payload);

        if (hasMeaningfulWorkspacePayload(remoteProfile)) {
          if (!cancelled) {
            setLabProfileState(remoteProfile);
            persist(remoteProfile);
          }
          return;
        }

        if (hasMeaningfulWorkspacePayload(localSnapshot)) {
          await saveWorkspaceDocument("lab_profile", localSnapshot);
        }
      } catch {
        // Keep local fallback behaviour if the pilot backend is unreachable.
      }
    }

    syncFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLabProfile = useCallback((nextProfile) => {
    setLabProfileState((prev) => {
      const resolved =
        typeof nextProfile === "function" ? nextProfile(prev) : nextProfile;
      const sanitized = sanitizeProfile(resolved);
      persist(sanitized);
      void saveWorkspaceDocument("lab_profile", sanitized).catch(() => {});
      return sanitized;
    });
  }, []);

  const clearLabProfile = useCallback(() => {
    const empty = { ...EMPTY_PROFILE };
    persist(empty);
    setLabProfileState(empty);
    void saveWorkspaceDocument("lab_profile", empty).catch(() => {});
  }, []);

  return {
    labProfile,
    setLabProfile,
    clearLabProfile,
  };
}
