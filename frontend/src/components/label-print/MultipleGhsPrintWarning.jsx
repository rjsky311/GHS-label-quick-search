import { AlertTriangle } from "lucide-react";

export default function MultipleGhsPrintWarning({
  items = [],
  examples = [],
  remainingCount = 0,
  tx,
}) {
  if (items.length === 0) return null;

  return (
    <details
      className="notebook-print-stage-section mt-3 rounded-md border-[hsl(var(--notebook-warning)/0.44)] p-3 text-[hsl(var(--notebook-ink))]"
      data-testid="print-multiple-ghs-warning"
    >
      <summary className="flex cursor-pointer list-none items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-warning))]" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[hsl(var(--notebook-warning))]">
            {tx(
              "label.multipleGhsPrintWarningTitle",
              "{{count}} item(s) have multiple GHS versions",
              { count: items.length },
            )}
          </div>
        </div>
      </summary>
      <div className="mt-2 pl-6">
        <p className="text-xs leading-5 text-[hsl(var(--notebook-ink))]">
          {tx(
            "label.multipleGhsPrintWarningBody",
            "This print will use the system-suggested primary classification unless you confirm a different version in the result row or detail view before printing.",
          )}
        </p>
        {examples.length > 0 && (
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            data-testid="print-multiple-ghs-warning-items"
          >
            {examples.map((item) => (
              <span
                key={item}
                className="notebook-print-stage-fact rounded-full border-[hsl(var(--notebook-warning)/0.34)] px-2 py-1 text-xs font-medium text-[hsl(var(--notebook-warning))]"
              >
                {item}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="notebook-print-stage-fact rounded-full border-[hsl(var(--notebook-warning)/0.34)] px-2 py-1 text-xs font-medium text-[hsl(var(--notebook-warning))]">
                {tx("label.multipleGhsPrintWarningMore", "+{{count}} more", {
                  count: remainingCount,
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
