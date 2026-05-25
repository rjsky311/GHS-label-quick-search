/**
 * Escape a single CSV cell value.
 *
 * - Leading formula-trigger characters (=, +, -, @, tab, CR) are
 *   prefixed with an apostrophe so spreadsheet applications treat
 *   the value as literal text. Matches the backend's
 *   `spreadsheet_safe()` so the client-side fallback cannot be
 *   turned into an exfiltration vector.
 * - Values containing a comma, quote, CR, or LF are wrapped in
 *   double quotes with any internal quotes doubled (RFC 4180).
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (text.length > 0 && "=+-@\t\r".includes(text[0])) {
    text = "'" + text;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
