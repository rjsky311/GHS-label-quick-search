import { useMemo, useState } from "react";
import {
  Activity,
  BookPlus,
  Database,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldAlert,
  Tags,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useFocusTrap from "@/hooks/useFocusTrap";
import { formatRelativeTime } from "@/utils/formatDate";

function SummaryCard({ label, value, accent = "text-amber-300", testId }) {
  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"
      data-testid={testId}
    >
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-white">
        <Icon className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export default function PilotDashboardSidebar(props) {
  const {
    report,
    aliases = [],
    manualEntries = [],
    referenceLinks = [],
    loading,
    saving = false,
    error = "",
    onClose,
    onRefresh,
    onExportObservabilityReport,
    onSaveManualEntry,
    onSaveAlias,
    onSaveReferenceLink,
  } = props;
  const { t } = useTranslation();
  const panelRef = useFocusTrap(onClose);
  const [activeTab, setActiveTab] = useState("overview");
  const [manualEntryForm, setManualEntryForm] = useState({
    cas_number: "",
    name_en: "",
    name_zh: "",
    notes: "",
  });
  const [aliasForm, setAliasForm] = useState({
    alias_text: "",
    locale: "en",
    cas_number: "",
    status: "approved",
    notes: "",
  });
  const [referenceForm, setReferenceForm] = useState({
    cas_number: "",
    label: "",
    url: "",
    link_type: "reference",
    priority: "50",
  });

  const dictionary = report?.dictionary || {};
  const counters = report?.counters || {};
  const recentEvents = report?.recentEvents || [];
  const missQueries = dictionary.topMissQueries || [];
  const pendingAliases = dictionary.pendingAliases || [];
  const recentManualEntries = useMemo(() => [...manualEntries].slice(0, 8), [manualEntries]);
  const recentAliases = useMemo(() => [...aliases].slice(0, 8), [aliases]);
  const recentReferenceLinks = useMemo(
    () => [...referenceLinks].slice(0, 8),
    [referenceLinks]
  );

  const submitManualEntry = async (event) => {
    event.preventDefault();
    try {
      await onSaveManualEntry({
        cas_number: manualEntryForm.cas_number.trim(),
        name_en: manualEntryForm.name_en.trim() || null,
        name_zh: manualEntryForm.name_zh.trim() || null,
        notes: manualEntryForm.notes.trim(),
      });
      toast.success(
        t("pilot.manualEntrySaved", { defaultValue: "Manual dictionary entry saved." })
      );
      setManualEntryForm({ cas_number: "", name_en: "", name_zh: "", notes: "" });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.manualEntryFailed", {
            defaultValue: "Failed to save manual dictionary entry.",
          })
      );
    }
  };

  const submitAlias = async (event) => {
    event.preventDefault();
    try {
      await onSaveAlias({
        alias_text: aliasForm.alias_text.trim(),
        locale: aliasForm.locale,
        cas_number: aliasForm.cas_number.trim(),
        status: aliasForm.status,
        notes: aliasForm.notes.trim(),
      });
      toast.success(t("pilot.aliasSaved", { defaultValue: "Alias saved." }));
      setAliasForm({
        alias_text: "",
        locale: aliasForm.locale,
        cas_number: "",
        status: "approved",
        notes: "",
      });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.aliasFailed", { defaultValue: "Failed to save alias." })
      );
    }
  };

  const submitReferenceLink = async (event) => {
    event.preventDefault();
    try {
      await onSaveReferenceLink({
        cas_number: referenceForm.cas_number.trim(),
        label: referenceForm.label.trim(),
        url: referenceForm.url.trim(),
        link_type: referenceForm.link_type,
        priority: Number(referenceForm.priority || 50),
      });
      toast.success(
        t("pilot.referenceSaved", { defaultValue: "Reference link saved." })
      );
      setReferenceForm({
        cas_number: "",
        label: "",
        url: "",
        link_type: referenceForm.link_type,
        priority: "50",
      });
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.referenceFailed", {
            defaultValue: "Failed to save reference link.",
          })
      );
    }
  };

  const handlePendingAliasDecision = async (alias, status) => {
    try {
      await onSaveAlias({
        alias_text: alias.alias_text,
        locale: alias.locale,
        cas_number: alias.cas_number,
        status,
        notes: alias.notes || "",
      });
      toast.success(
        status === "approved"
          ? t("pilot.aliasApproved", { defaultValue: "Alias approved." })
          : t("pilot.aliasRejected", { defaultValue: "Alias rejected." })
      );
    } catch (submitError) {
      toast.error(
        submitError?.response?.data?.detail ||
          submitError?.message ||
          t("pilot.aliasDecisionFailed", {
            defaultValue: "Failed to update alias status.",
          })
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("pilot.sidebarTitle", { defaultValue: "Pilot dashboard" })}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-slate-800 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800/95 backdrop-blur">
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">
                  {t("pilot.sidebarTitle", { defaultValue: "Admin dashboard" })}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {t("pilot.sidebarSubtitle", {
                  defaultValue:
                    "Review pilot health, unresolved lookups, and dictionary growth tasks. This surface is for admin-only curation.",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition-colors hover:bg-slate-600"
                data-testid="pilot-refresh-btn"
              >
                <RefreshCw className="mr-1 inline h-4 w-4" />
                {t("pilot.refresh", { defaultValue: "Refresh" })}
              </button>
              <button
                type="button"
                onClick={onExportObservabilityReport}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white transition-colors hover:bg-emerald-600"
                data-testid="pilot-export-report-btn"
              >
                {t("pilot.export", { defaultValue: "Export report" })}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
                data-testid="close-pilot-dashboard-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {[
              ["overview", t("pilot.overview", { defaultValue: "Overview" })],
              ["dictionary", t("pilot.dictionary", { defaultValue: "Curation" })],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                data-testid={`pilot-tab-${tab}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-4">
          {loading ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-slate-300">
              {t("pilot.loading", { defaultValue: "Loading pilot dashboard..." })}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {!loading && activeTab === "overview" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryCard
                  label={t("pilot.pendingAliases", { defaultValue: "Pending aliases" })}
                  value={dictionary.pendingAliasCount || 0}
                  accent="text-cyan-300"
                  testId="pilot-summary-pending-aliases"
                />
                <SummaryCard
                  label={t("pilot.openMissQueries", { defaultValue: "Open miss queries" })}
                  value={dictionary.openMissQueryCount || 0}
                  accent="text-amber-300"
                  testId="pilot-summary-open-miss-queries"
                />
                <SummaryCard
                  label={t("pilot.manualEntries", { defaultValue: "Manual entries" })}
                  value={dictionary.manualEntryCount || 0}
                  accent="text-emerald-300"
                  testId="pilot-summary-manual-entries"
                />
                <SummaryCard
                  label={t("pilot.referenceLinks", { defaultValue: "Reference links" })}
                  value={dictionary.referenceLinkCount || 0}
                  accent="text-fuchsia-300"
                  testId="pilot-summary-reference-links"
                />
                <SummaryCard
                  label={t("pilot.cacheStaleHits", { defaultValue: "Stale cache hits" })}
                  value={counters["cache.ghs.stale_hit"] || 0}
                  testId="pilot-summary-cache-stale-hits"
                />
                <SummaryCard
                  label={t("pilot.upstreamErrors", { defaultValue: "Upstream errors" })}
                  value={counters["upstream.total"] || 0}
                  accent="text-rose-300"
                  testId="pilot-summary-upstream-errors"
                />
              </div>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={ShieldAlert}
                  title={t("pilot.missQueries", { defaultValue: "Top miss queries" })}
                  subtitle={t("pilot.missQueriesHint", {
                    defaultValue:
                      "These are the unresolved searches that are most worth backfilling into the dictionary.",
                  })}
                />
                {missQueries.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {t("pilot.noMissQueries", {
                      defaultValue: "No unresolved queries recorded yet.",
                    })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missQueries.map((item, index) => (
                      <div
                        key={`${item.query_text}-${index}`}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-white">{item.query_text}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.query_kind} | {item.endpoint} | {item.hit_count}x
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatRelativeTime(item.last_seen_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={Tags}
                  title={t("pilot.pendingAliasReview", { defaultValue: "Pending alias review" })}
                  subtitle={t("pilot.pendingAliasReviewHint", {
                    defaultValue:
                      "PubChem synonym candidates land here first. Approve only the ones you actually want to resolve in-app.",
                  })}
                />
                {pendingAliases.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {t("pilot.noPendingAliases", {
                      defaultValue: "No pending aliases right now.",
                    })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingAliases.map((alias) => (
                      <div
                        key={`${alias.locale}-${alias.alias_text}-${alias.cas_number}`}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-white">{alias.alias_text}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {alias.cas_number} | {alias.locale} | {alias.hit_count}x
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handlePendingAliasDecision(alias, "approved")}
                              disabled={saving}
                              className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-600/40"
                              data-testid={`approve-alias-${alias.alias_text}`}
                            >
                              {t("pilot.approve", { defaultValue: "Approve" })}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePendingAliasDecision(alias, "rejected")}
                              disabled={saving}
                              className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-700/40"
                              data-testid={`reject-alias-${alias.alias_text}`}
                            >
                              {t("pilot.reject", { defaultValue: "Reject" })}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={Database}
                  title={t("pilot.recentOps", { defaultValue: "Recent backend events" })}
                />
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {t("pilot.noRecentOps", {
                      defaultValue: "No backend events recorded yet.",
                    })}
                  </p>
                ) : (
                  <details className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-white">
                      {t("pilot.recentOpsSummary", {
                        defaultValue: "Show raw backend events",
                      })}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {recentEvents.slice(0, 8).map((item, index) => (
                        <div
                          key={`${item.ts}-${item.type}-${index}`}
                          className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm"
                        >
                          <div>
                            <div className="font-medium text-white">{item.type}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {JSON.stringify(item)}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatRelativeTime(item.ts)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            </>
          ) : null}

          {!loading && activeTab === "dictionary" ? (
            <>
              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={BookPlus}
                  title={t("pilot.addManualEntry", { defaultValue: "Add manual entry" })}
                  subtitle={t("pilot.addManualEntryHint", {
                    defaultValue:
                      "Use this when the static seed dictionary needs a lab-specific name override or missing chemical.",
                  })}
                />
                <form className="grid gap-3 md:grid-cols-2" onSubmit={submitManualEntry}>
                  <input
                    value={manualEntryForm.cas_number}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, cas_number: event.target.value }))
                    }
                    placeholder={t("pilot.casPlaceholder", { defaultValue: "CAS number" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                    data-testid="manual-entry-cas-input"
                  />
                  <input
                    value={manualEntryForm.name_en}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, name_en: event.target.value }))
                    }
                    placeholder={t("pilot.englishNamePlaceholder", { defaultValue: "English name" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    data-testid="manual-entry-name-en-input"
                  />
                  <input
                    value={manualEntryForm.name_zh}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, name_zh: event.target.value }))
                    }
                    placeholder={t("pilot.chineseNamePlaceholder", { defaultValue: "Chinese name" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    data-testid="manual-entry-name-zh-input"
                  />
                  <input
                    value={manualEntryForm.notes}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder={t("pilot.notesPlaceholder", { defaultValue: "Notes" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    data-testid="manual-entry-notes-input"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-700/40"
                      data-testid="manual-entry-submit-btn"
                    >
                      {t("pilot.saveEntry", { defaultValue: "Save manual entry" })}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={Tags}
                  title={t("pilot.addAlias", { defaultValue: "Add or approve alias" })}
                />
                <form className="grid gap-3 md:grid-cols-2" onSubmit={submitAlias}>
                  <input
                    value={aliasForm.alias_text}
                    onChange={(event) =>
                      setAliasForm((prev) => ({ ...prev, alias_text: event.target.value }))
                    }
                    placeholder={t("pilot.aliasPlaceholder", { defaultValue: "Alias text" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                  <input
                    value={aliasForm.cas_number}
                    onChange={(event) =>
                      setAliasForm((prev) => ({ ...prev, cas_number: event.target.value }))
                    }
                    placeholder={t("pilot.casPlaceholder", { defaultValue: "CAS number" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                  <select
                    value={aliasForm.locale}
                    onChange={(event) =>
                      setAliasForm((prev) => ({ ...prev, locale: event.target.value }))
                    }
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="en">English</option>
                    <option value="zh">Chinese</option>
                  </select>
                  <select
                    value={aliasForm.status}
                    onChange={(event) =>
                      setAliasForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="approved">approved</option>
                    <option value="pending">pending</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <input
                    value={aliasForm.notes}
                    onChange={(event) =>
                      setAliasForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder={t("pilot.notesPlaceholder", { defaultValue: "Notes" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white md:col-span-2"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-700/40"
                    >
                      {t("pilot.saveAlias", { defaultValue: "Save alias" })}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <SectionHeading
                  icon={Link2}
                  title={t("pilot.addReference", { defaultValue: "Add reference link" })}
                />
                <form className="grid gap-3 md:grid-cols-2" onSubmit={submitReferenceLink}>
                  <input
                    value={referenceForm.cas_number}
                    onChange={(event) =>
                      setReferenceForm((prev) => ({ ...prev, cas_number: event.target.value }))
                    }
                    placeholder={t("pilot.casPlaceholder", { defaultValue: "CAS number" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                  <input
                    value={referenceForm.label}
                    onChange={(event) =>
                      setReferenceForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder={t("pilot.referenceLabelPlaceholder", { defaultValue: "Link label" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                  <input
                    value={referenceForm.url}
                    onChange={(event) =>
                      setReferenceForm((prev) => ({ ...prev, url: event.target.value }))
                    }
                    placeholder="https://..."
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white md:col-span-2"
                    required
                  />
                  <select
                    value={referenceForm.link_type}
                    onChange={(event) =>
                      setReferenceForm((prev) => ({ ...prev, link_type: event.target.value }))
                    }
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="reference">reference</option>
                    <option value="sds">sds</option>
                    <option value="regulatory">regulatory</option>
                    <option value="occupational">occupational</option>
                  </select>
                  <input
                    value={referenceForm.priority}
                    onChange={(event) =>
                      setReferenceForm((prev) => ({ ...prev, priority: event.target.value }))
                    }
                    inputMode="numeric"
                    placeholder={t("pilot.priorityPlaceholder", { defaultValue: "Priority" })}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-fuchsia-700 px-4 py-2 text-sm text-white transition-colors hover:bg-fuchsia-600 disabled:cursor-not-allowed disabled:bg-fuchsia-700/40"
                    >
                      {t("pilot.saveReference", { defaultValue: "Save reference link" })}
                    </button>
                  </div>
                </form>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <SectionHeading
                    icon={Tags}
                    title={t("pilot.aliasList", { defaultValue: "Recent aliases" })}
                  />
                  {recentAliases.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      {t("pilot.noAliases", { defaultValue: "No aliases yet." })}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentAliases.map((alias) => (
                        <div
                          key={`${alias.id || alias.alias_text}-${alias.locale}-${alias.cas_number}`}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm"
                        >
                          <div className="font-medium text-white">{alias.alias_text}</div>
                          <div className="mt-1 font-mono text-amber-300">{alias.cas_number}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {alias.locale} | {alias.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <SectionHeading
                    icon={Database}
                    title={t("pilot.manualEntryList", { defaultValue: "Recent manual entries" })}
                  />
                  {recentManualEntries.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      {t("pilot.noManualEntries", { defaultValue: "No manual entries yet." })}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentManualEntries.map((entry) => (
                        <div
                          key={entry.cas_number}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm"
                        >
                          <div className="font-mono text-amber-300">{entry.cas_number}</div>
                          <div className="mt-1 text-white">
                            {entry.name_en ||
                              t("pilot.noEnglishName", { defaultValue: "No English name" })}
                          </div>
                          <div className="text-slate-400">
                            {entry.name_zh ||
                              t("pilot.noChineseName", { defaultValue: "No Chinese name" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <SectionHeading
                    icon={ExternalLink}
                    title={t("pilot.referenceList", { defaultValue: "Recent reference links" })}
                  />
                  {recentReferenceLinks.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      {t("pilot.noReferenceLinks", {
                        defaultValue: "No custom reference links yet.",
                      })}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentReferenceLinks.map((link) => (
                        <div
                          key={`${link.casNumber}-${link.url}`}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm"
                        >
                          <div className="font-mono text-amber-300">{link.casNumber}</div>
                          <div className="mt-1 text-white">{link.label}</div>
                          <div className="text-xs text-slate-400">
                            {link.linkType} | priority {link.priority}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
