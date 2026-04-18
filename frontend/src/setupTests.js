import '@testing-library/jest-dom';

if (typeof globalThis.__APP_BACKEND_URL__ !== "string") {
  globalThis.__APP_BACKEND_URL__ = "http://localhost:8001";
}
