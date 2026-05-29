import { lazy } from "react";

const TRANSIENT_MODULE_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
  /ChunkLoadError/i,
  /dynamically imported module/i,
];

const sleep = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const isTransientModuleLoadError = (error) => {
  const message = [error?.message, error?.name, error?.stack]
    .filter(Boolean)
    .join("\n");
  return TRANSIENT_MODULE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const retryDynamicImport = async (
  loader,
  {
    retries = 2,
    baseDelayMs = 500,
    shouldRetry = isTransientModuleLoadError,
    chunkName = "lazy chunk",
  } = {},
) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      console.warn(
        `Retrying ${chunkName} after transient dynamic import failure (${attempt + 1}/${retries}).`,
        error,
      );
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastError;
};

export const lazyWithRetry = (loader, options = {}) =>
  lazy(() => retryDynamicImport(loader, options));
