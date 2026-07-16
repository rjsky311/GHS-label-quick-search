import { useCallback, useEffect, useState } from "react";
import {
  fetchWorkspaceDocument,
  hasMeaningfulWorkspacePayload,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";
import {
  readJsonStorage,
  writeJsonStorage,
} from "@/utils/localStorageJson";

export const LAB_PROFILE_KEY = "ghs_lab_profile";
export const LAB_PROFILE_LIMITS = Object.freeze({
  organization: 120,
  phone: 60,
  address: 240,
});

const EMPTY_PROFILE = Object.freeze({
  organization: "",
  phone: "",
  address: "",
});

function sanitizeProfile(raw) {
  const boundedString = (value, key) =>
    typeof value === "string"
      ? Array.from(value).slice(0, LAB_PROFILE_LIMITS[key]).join("")
      : "";
  return {
    organization: boundedString(raw?.organization, "organization"),
    phone: boundedString(raw?.phone, "phone"),
    address: boundedString(raw?.address, "address"),
  };
}

function loadLegacyLabName() {
  const parsed = readJsonStorage("ghs_custom_label_fields", null, {
    validate: (value) =>
      value && typeof value === "object" && !Array.isArray(value),
  });
  return {
    ...EMPTY_PROFILE,
    organization:
      typeof parsed?.labName === "string" ? parsed.labName : "",
  };
}

function loadFromStorage() {
  return readJsonStorage(LAB_PROFILE_KEY, loadLegacyLabName(), {
    normalize: (value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? sanitizeProfile(value)
        : null,
    validate: Boolean,
  });
}

function persist(profile) {
  writeJsonStorage(LAB_PROFILE_KEY, profile);
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
