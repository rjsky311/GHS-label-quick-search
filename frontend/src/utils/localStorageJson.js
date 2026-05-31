function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readJsonStorage(
  key,
  fallbackValue,
  { normalize = (value) => value, validate = () => true, removeOnInvalid = true } = {},
) {
  const storage = getLocalStorage();
  if (!storage) return fallbackValue;

  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return fallbackValue;
  }
  if (!raw) return fallbackValue;

  try {
    const normalized = normalize(JSON.parse(raw));
    if (!validate(normalized)) {
      if (removeOnInvalid) removeStorageItem(key);
      return fallbackValue;
    }
    return normalized;
  } catch {
    if (removeOnInvalid) removeStorageItem(key);
    return fallbackValue;
  }
}

export function writeJsonStorage(key, value) {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key) {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
