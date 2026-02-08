export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
