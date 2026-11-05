// True on phones and tablets, where a PDF is the primary print path and the
// share sheet is how a file leaves the browser. Desktop browsers can also report
// that they share files, but there a person pressing "Download PDF" wants a file.
export const isMobilePdfPreferredEnvironment = () => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  } catch {
    // Fall back to user agent below.
  }
  const ua = window.navigator?.userAgent || "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
};
