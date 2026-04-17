import { useCallback, useState } from "react";

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

  const setLabProfile = useCallback((nextProfile) => {
    setLabProfileState((prev) => {
      const resolved =
        typeof nextProfile === "function" ? nextProfile(prev) : nextProfile;
      const sanitized = sanitizeProfile(resolved);
      persist(sanitized);
      return sanitized;
    });
  }, []);

  const clearLabProfile = useCallback(() => {
    const empty = { ...EMPTY_PROFILE };
    persist(empty);
    setLabProfileState(empty);
  }, []);

  return {
    labProfile,
    setLabProfile,
    clearLabProfile,
  };
}
