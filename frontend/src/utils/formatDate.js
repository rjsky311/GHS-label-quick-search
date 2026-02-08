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
