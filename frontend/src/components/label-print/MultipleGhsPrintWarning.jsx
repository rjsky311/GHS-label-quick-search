import { AlertTriangle } from "lucide-react";

export default function MultipleGhsPrintWarning({
  items = [],
  examples = [],
  remainingCount = 0,
  tx,
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-amber-950"
      data-testid="print-multiple-ghs-warning"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {tx(
              "label.multipleGhsPrintWarningTitle",
              "{{count}} item(s) have multiple GHS versions",
              { count: items.length },
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-900">
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
                  className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200"
                >
                  {item}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                  {tx("label.multipleGhsPrintWarningMore", "+{{count}} more", {
                    count: remainingCount,
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
