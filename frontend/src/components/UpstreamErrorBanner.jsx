import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Yellow warning banner surfaced when any result in the current search
 * had `upstream_error: true` — i.e. PubChem was transiently unavailable
 * (429/5xx/timeout) during the lookup.
 *
 * Visually distinct from the red error-message strip used for validation
 * / network failures: this is a partial-result warning, not a full
 * failure. Users can still see any rows that succeeded; the banner tells
 * them the rest are NOT confirmed as "no hazard data" — PubChem simply
 * couldn't be reached for those CAS numbers.
 *
 * Rendered above the results table. Hidden when no result has the flag.
 *
 * Props:
 *   - count: number of results that hit an upstream error
 */
export default function UpstreamErrorBanner({ count }) {
  const { t } = useTranslation();
  if (!count || count < 1) return null;

  return (
    <div
      role="alert"
      data-testid="upstream-error-banner"
      className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <div className="font-medium">
          {t("upstream.bannerTitle", { count })}
        </div>
        <div className="mt-1 text-sm text-amber-800">
          {t("upstream.bannerBody")}
        </div>
      </div>
    </div>
  );
}
