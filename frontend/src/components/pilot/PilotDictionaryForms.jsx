import { BookPlus, Link2, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/pilot/PilotDashboardPrimitives";
import {
  ALIAS_STATUS_OPTIONS,
  MANUAL_ENTRY_STATUS_OPTIONS,
  REFERENCE_LINK_STATUS_OPTIONS,
} from "@/components/pilot/pilotDashboardHelpers";

function ManualEntryForm({
  manualEntryForm,
  setManualEntryForm,
  submitManualEntry,
  saving,
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          required
          data-testid="manual-entry-cas-input"
        />
        <input
          value={manualEntryForm.name_en}
          onChange={(event) =>
            setManualEntryForm((prev) => ({ ...prev, name_en: event.target.value }))
          }
          placeholder={t("pilot.englishNamePlaceholder", { defaultValue: "English name" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          data-testid="manual-entry-name-en-input"
        />
        <input
          value={manualEntryForm.name_zh}
          onChange={(event) =>
            setManualEntryForm((prev) => ({ ...prev, name_zh: event.target.value }))
          }
          placeholder={t("pilot.chineseNamePlaceholder", { defaultValue: "Chinese name" })}
          aria-describedby="manual-entry-name-zh-hint"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          data-testid="manual-entry-name-zh-input"
        />
        <p
          id="manual-entry-name-zh-hint"
          className="text-xs leading-5 text-slate-500 md:col-span-2"
        >
          {t("pilot.chineseNameCurationHint", {
            defaultValue:
              "Use this field only for verified Chinese names. English synonyms belong in the English name or alias fields.",
          })}
        </p>
        <input
          value={manualEntryForm.notes}
          onChange={(event) =>
            setManualEntryForm((prev) => ({ ...prev, notes: event.target.value }))
          }
          placeholder={t("pilot.notesPlaceholder", { defaultValue: "Notes" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          data-testid="manual-entry-notes-input"
        />
        <select
          value={manualEntryForm.status}
          onChange={(event) =>
            setManualEntryForm((prev) => ({ ...prev, status: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          data-testid="manual-entry-status-select"
          aria-label={t("pilot.manualEntryStatus", {
            defaultValue: "Manual entry status",
          })}
        >
          {MANUAL_ENTRY_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey, { defaultValue: option.defaultLabel })}
            </option>
          ))}
        </select>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="manual-entry-submit-btn"
          >
            {t("pilot.saveEntry", { defaultValue: "Save manual entry" })}
          </button>
        </div>
      </form>
    </section>
  );
}

function AliasForm({ aliasForm, setAliasForm, submitAlias, saving }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          required
        />
        <input
          value={aliasForm.cas_number}
          onChange={(event) =>
            setAliasForm((prev) => ({ ...prev, cas_number: event.target.value }))
          }
          placeholder={t("pilot.casPlaceholder", { defaultValue: "CAS number" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          required
        />
        <select
          value={aliasForm.locale}
          onChange={(event) =>
            setAliasForm((prev) => ({ ...prev, locale: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="en">English</option>
          <option value="zh">Chinese</option>
        </select>
        <select
          value={aliasForm.status}
          onChange={(event) =>
            setAliasForm((prev) => ({ ...prev, status: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {ALIAS_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey, { defaultValue: option.defaultLabel })}
            </option>
          ))}
        </select>
        <input
          value={aliasForm.notes}
          onChange={(event) =>
            setAliasForm((prev) => ({ ...prev, notes: event.target.value }))
          }
          placeholder={t("pilot.notesPlaceholder", { defaultValue: "Notes" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 md:col-span-2"
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("pilot.saveAlias", { defaultValue: "Save alias" })}
          </button>
        </div>
      </form>
    </section>
  );
}

function ReferenceLinkForm({
  referenceForm,
  setReferenceForm,
  submitReferenceLink,
  saving,
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          data-testid="reference-link-cas-input"
          required
        />
        <input
          value={referenceForm.label}
          onChange={(event) =>
            setReferenceForm((prev) => ({ ...prev, label: event.target.value }))
          }
          placeholder={t("pilot.referenceLabelPlaceholder", { defaultValue: "Link label" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          data-testid="reference-link-label-input"
          required
        />
        <input
          value={referenceForm.url}
          onChange={(event) =>
            setReferenceForm((prev) => ({ ...prev, url: event.target.value }))
          }
          placeholder="https://..."
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 md:col-span-2"
          data-testid="reference-link-url-input"
          required
        />
        <select
          value={referenceForm.link_type}
          onChange={(event) =>
            setReferenceForm((prev) => ({ ...prev, link_type: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="reference">reference</option>
          <option value="sds">sds</option>
          <option value="regulatory">regulatory</option>
          <option value="occupational">occupational</option>
        </select>
        <select
          value={referenceForm.status}
          onChange={(event) =>
            setReferenceForm((prev) => ({ ...prev, status: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          data-testid="reference-link-status-select"
          aria-label={t("pilot.referenceLinkStatus", {
            defaultValue: "Reference link status",
          })}
        >
          {REFERENCE_LINK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey, { defaultValue: option.defaultLabel })}
            </option>
          ))}
        </select>
        <input
          value={referenceForm.priority}
          onChange={(event) =>
            setReferenceForm((prev) => ({ ...prev, priority: event.target.value }))
          }
          inputMode="numeric"
          placeholder={t("pilot.priorityPlaceholder", { defaultValue: "Priority" })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="reference-link-submit-btn"
          >
            {t("pilot.saveReference", { defaultValue: "Save reference link" })}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function PilotDictionaryForms({
  manualEntryForm,
  setManualEntryForm,
  submitManualEntry,
  aliasForm,
  setAliasForm,
  submitAlias,
  referenceForm,
  setReferenceForm,
  submitReferenceLink,
  saving,
}) {
  return (
    <>
      <ManualEntryForm
        manualEntryForm={manualEntryForm}
        setManualEntryForm={setManualEntryForm}
        submitManualEntry={submitManualEntry}
        saving={saving}
      />
      <AliasForm
        aliasForm={aliasForm}
        setAliasForm={setAliasForm}
        submitAlias={submitAlias}
        saving={saving}
      />
      <ReferenceLinkForm
        referenceForm={referenceForm}
        setReferenceForm={setReferenceForm}
        submitReferenceLink={submitReferenceLink}
        saving={saving}
      />
    </>
  );
}
