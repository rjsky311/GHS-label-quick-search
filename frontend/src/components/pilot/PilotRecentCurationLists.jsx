import { Database, ExternalLink, Tags } from "lucide-react";
import {
  CurationStatusBadge,
  SectionHeading,
} from "@/components/pilot/PilotDashboardPrimitives";
import { curationTimestamp } from "@/components/pilot/pilotDashboardHelpers";
import { formatRelativeTime } from "@/utils/formatDate";

function CurationActionButton({
  children,
  className,
  disabled,
  onClick,
  testId,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded border bg-white px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export default function PilotRecentCurationLists({
  recentAliases = [],
  recentManualEntries = [],
  recentReferenceLinks = [],
  saving = false,
  onAliasStatusUpdate,
  onManualEntryStatusUpdate,
  onReferenceLinkStatusUpdate,
  t,
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionHeading
          icon={Tags}
          title={t("pilot.aliasList", { defaultValue: "Recent aliases" })}
        />
        {recentAliases.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("pilot.noAliases", { defaultValue: "No aliases yet." })}
          </p>
        ) : (
          <div className="space-y-2">
            {recentAliases.map((alias, index) => {
              const currentStatus = alias.status || "approved";
              const rowId = alias.id || index;
              return (
                <div
                  key={`${alias.id || alias.alias_text}-${alias.locale}-${alias.cas_number}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                  data-testid={`alias-row-${rowId}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      {alias.alias_text}
                    </div>
                    <CurationStatusBadge
                      status={currentStatus}
                      testId={`alias-status-${rowId}`}
                    />
                  </div>
                  <div className="mt-1 font-mono text-blue-700">
                    {alias.cas_number}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{alias.locale}</span>
                    {curationTimestamp(alias) ? (
                      <span>{formatRelativeTime(curationTimestamp(alias))}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentStatus !== "approved" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() => onAliasStatusUpdate(alias, "approved")}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        testId={`alias-approve-${rowId}`}
                      >
                        {t("pilot.approve", { defaultValue: "Approve" })}
                      </CurationActionButton>
                    ) : null}
                    {currentStatus !== "needs_evidence" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() =>
                          onAliasStatusUpdate(alias, "needs_evidence")
                        }
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        testId={`alias-needs-evidence-${rowId}`}
                      >
                        {t("pilot.needsEvidence", {
                          defaultValue: "Needs evidence",
                        })}
                      </CurationActionButton>
                    ) : null}
                    {currentStatus !== "rejected" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() => onAliasStatusUpdate(alias, "rejected")}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        testId={`alias-reject-${rowId}`}
                      >
                        {t("pilot.reject", { defaultValue: "Reject" })}
                      </CurationActionButton>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionHeading
          icon={Database}
          title={t("pilot.manualEntryList", {
            defaultValue: "Recent manual entries",
          })}
        />
        {recentManualEntries.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("pilot.noManualEntries", {
              defaultValue: "No manual entries yet.",
            })}
          </p>
        ) : (
          <div className="space-y-2">
            {recentManualEntries.map((entry, index) => {
              const currentStatus = entry.status || "approved";
              const rowId = entry.id || index;
              return (
                <div
                  key={`${entry.id || entry.cas_number}-${entry.status || "approved"}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                  data-testid={`manual-entry-row-${rowId}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono text-blue-700">
                      {entry.cas_number}
                    </div>
                    <CurationStatusBadge
                      status={currentStatus}
                      testId={`manual-entry-status-${rowId}`}
                    />
                  </div>
                  <div className="mt-1 text-slate-900">
                    {entry.name_en ||
                      t("pilot.noEnglishName", {
                        defaultValue: "No English name",
                      })}
                  </div>
                  <div className="text-slate-500">
                    {entry.name_zh ||
                      t("pilot.noChineseName", {
                        defaultValue: "No Chinese name",
                      })}
                  </div>
                  {curationTimestamp(entry) ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {formatRelativeTime(curationTimestamp(entry))}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentStatus !== "approved" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() =>
                          onManualEntryStatusUpdate(entry, "approved")
                        }
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        testId={`manual-entry-approve-${rowId}`}
                      >
                        {t("pilot.approve", { defaultValue: "Approve" })}
                      </CurationActionButton>
                    ) : null}
                    {currentStatus !== "needs_evidence" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() =>
                          onManualEntryStatusUpdate(entry, "needs_evidence")
                        }
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        testId={`manual-entry-needs-evidence-${rowId}`}
                      >
                        {t("pilot.needsEvidence", {
                          defaultValue: "Needs evidence",
                        })}
                      </CurationActionButton>
                    ) : null}
                    {currentStatus !== "rejected" ? (
                      <CurationActionButton
                        disabled={saving}
                        onClick={() =>
                          onManualEntryStatusUpdate(entry, "rejected")
                        }
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        testId={`manual-entry-reject-${rowId}`}
                      >
                        {t("pilot.reject", { defaultValue: "Reject" })}
                      </CurationActionButton>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionHeading
          icon={ExternalLink}
          title={t("pilot.referenceList", {
            defaultValue: "Recent reference links",
          })}
        />
        {recentReferenceLinks.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("pilot.noReferenceLinks", {
              defaultValue: "No custom reference links yet.",
            })}
          </p>
        ) : (
          <div className="space-y-2">
            {recentReferenceLinks.map((link, index) => {
              const currentStatus = link.status || "active";
              const nextStatus =
                currentStatus === "inactive" ? "active" : "inactive";
              const rowId = link.id || index;
              return (
                <div
                  key={`${link.casNumber}-${link.url}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                  data-testid={`reference-link-row-${rowId}`}
                >
                  <div className="font-mono text-blue-700">
                    {link.casNumber}
                  </div>
                  <div className="mt-1 text-slate-900">{link.label}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {link.linkType} | priority {link.priority}
                    </span>
                    <CurationStatusBadge
                      status={currentStatus}
                      testId={`reference-link-status-${rowId}`}
                    />
                    {curationTimestamp(link) ? (
                      <span>{formatRelativeTime(curationTimestamp(link))}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onReferenceLinkStatusUpdate(link, nextStatus)}
                    className="mt-2 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    data-testid={`reference-link-${nextStatus}-${rowId}`}
                  >
                    {nextStatus === "active"
                      ? t("pilot.activateReference", {
                          defaultValue: "Activate",
                        })
                      : t("pilot.deactivateReference", {
                          defaultValue: "Deactivate",
                        })}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
