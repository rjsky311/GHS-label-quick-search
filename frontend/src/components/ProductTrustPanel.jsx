import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ISSUE_URL = "https://github.com/rjsky311/GHS-label-quick-search/issues";

export default function ProductTrustPanel({ variant = "empty" }) {
  const { t } = useTranslation();
  const isCompact = variant === "results";

  const cards = [
    {
      icon: ShieldCheck,
      titleKey: "productTrust.sourceTitle",
      bodyKey: "productTrust.sourceBody",
    },
    {
      icon: FileCheck2,
      titleKey: "productTrust.noAdsTitle",
      bodyKey: "productTrust.noAdsBody",
    },
    {
      icon: MessageSquarePlus,
      titleKey: "productTrust.feedbackTitle",
      bodyKey: "productTrust.feedbackBody",
    },
  ];

  return (
    <section
      className={`mx-auto border-slate-200 bg-white/80 ${
        isCompact
          ? "mt-4 border-t py-4"
          : "mt-8 max-w-5xl rounded-md border px-5 py-5 text-left shadow-sm"
      }`}
      aria-label={t("productTrust.ariaLabel")}
      data-testid={`product-trust-panel-${variant}`}
    >
      <div className={isCompact ? "grid gap-4 lg:grid-cols-[1fr_1.7fr]" : "space-y-4"}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            {t("productTrust.kicker")}
          </p>
          <h2 className={`${isCompact ? "mt-1 text-base" : "mt-2 text-lg"} font-semibold text-slate-950`}>
            {t(isCompact ? "productTrust.resultsTitle" : "productTrust.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t(isCompact ? "productTrust.resultsBody" : "productTrust.body")}
          </p>
          <a
            href={ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {t("productTrust.cta")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div
          className={`grid gap-3 ${isCompact ? "sm:grid-cols-3" : "md:grid-cols-3"}`}
          data-testid={`product-trust-proof-list-${variant}`}
        >
          {cards.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="flex min-w-0 items-start gap-2 text-sm text-slate-600"
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                {isCompact ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-slate-950">{t(titleKey)}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
