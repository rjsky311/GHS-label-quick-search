import i18n from "@/i18n";

export function formatDate(isoString) {
  const date = new Date(isoString);
  const locale = i18n.language === "zh-TW" ? "zh-TW" : "en-US";
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a localized relative-time string for an ISO-8601 timestamp
 * using the browser's Intl.RelativeTimeFormat. Falls back to the
 * absolute date string if the input is invalid.
 *
 * Used by M1 provenance display to render "data fetched 5 minutes ago"
 * rather than raw UTC strings. The absolute timestamp is still shown
 * as a tooltip so precision isn't lost.
 *
 * @param {string} isoString  ISO-8601 timestamp (UTC or with offset)
 * @param {Date}   [now]      Optional reference time (for testing)
 * @returns {string}          Localized relative-time phrase
 */
export function formatRelativeTime(isoString, now = new Date()) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const locale = i18n.language === "zh-TW" ? "zh-TW" : "en-US";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  // Progressive thresholds; each tier is chosen so the resulting
  // phrasing stays natural ("5 minutes ago", "2 hours ago", "3 days ago")
  // and never uses "seconds" — a safety lookup doesn't update fast
  // enough for sub-minute precision to matter.
  if (absSeconds < 60) {
    // Treat sub-minute as "just now"; Intl doesn't have a perfect
    // shorthand, so use 0 minutes which yields "now" / "剛才".
    return rtf.format(0, "minute");
  }
  if (absSeconds < 3600) {
    return rtf.format(Math.round(diffSeconds / 60), "minute");
  }
  if (absSeconds < 86400) {
    return rtf.format(Math.round(diffSeconds / 3600), "hour");
  }
  if (absSeconds < 86400 * 30) {
    return rtf.format(Math.round(diffSeconds / 86400), "day");
  }
  if (absSeconds < 86400 * 365) {
    return rtf.format(Math.round(diffSeconds / (86400 * 30)), "month");
  }
  return rtf.format(Math.round(diffSeconds / (86400 * 365)), "year");
}
