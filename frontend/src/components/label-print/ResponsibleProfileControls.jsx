import { Building2, MapPin, Phone } from "lucide-react";
import { READINESS_TONE_CLASSES } from "@/components/label-print/labelPrintModalHelpers";

const PROFILE_FIELDS = [
  {
    key: "organization",
    labelKey: "label.profileOrganization",
    placeholderKey: "label.profileOrganizationPlaceholder",
    icon: Building2,
  },
  {
    key: "phone",
    labelKey: "label.profilePhone",
    placeholderKey: "label.profilePhonePlaceholder",
    icon: Phone,
  },
  {
    key: "address",
    labelKey: "label.profileAddress",
    placeholderKey: "label.profileAddressPlaceholder",
    icon: MapPin,
  },
];

export default function ResponsibleProfileControls({
  open,
  tone,
  status,
  presentCount,
  fieldTotal,
  required,
  labProfile,
  onLabProfileChange,
  onClearLabProfile,
  t,
  tx,
}) {
  const hasProfileValues =
    labProfile.organization || labProfile.phone || labProfile.address;

  return (
    <details
      open={open}
      className={`rounded-lg border p-4 ${
        READINESS_TONE_CLASSES[tone] || READINESS_TONE_CLASSES.neutral
      }`}
      data-testid="responsible-profile-controls"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-current" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              {t("label.profileTitle")}
            </span>
            <span
              className="mt-0.5 block text-xs opacity-80"
              data-testid="responsible-profile-status"
            >
              {status}
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-semibold ring-1 ring-current/10">
          {presentCount}/{fieldTotal}
        </span>
      </summary>

      <div className="mt-4 border-t border-current/10 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 opacity-80">
            {required
              ? tx(
                  "label.profileRequiredHint",
                  "Complete primary labels need this identity before printing.",
                )
              : tx(
                  "label.profileOptionalHint",
                  "Supplemental labels can print without this, but you can keep it saved for primary labels.",
                )}
          </p>
          {hasProfileValues && typeof onClearLabProfile === "function" && (
            <button
              type="button"
              onClick={onClearLabProfile}
              className="shrink-0 text-xs text-red-600 transition-colors hover:text-red-700"
            >
              {t("label.profileClear")}
            </button>
          )}
        </div>
        <div className="grid gap-2">
          {PROFILE_FIELDS.map((field) => {
            const FieldIcon = field.icon;

            return (
              <div
                key={field.key}
                className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center"
              >
                <label className="flex items-center gap-1.5 text-xs opacity-80">
                  <FieldIcon className="h-3.5 w-3.5" />
                  {t(field.labelKey)}
                </label>
                <input
                  type="text"
                  data-testid={`responsible-profile-field-${field.key}`}
                  value={labProfile[field.key] || ""}
                  onChange={(event) =>
                    onLabProfileChange?.({
                      ...labProfile,
                      [field.key]: event.target.value,
                    })
                  }
                  placeholder={t(field.placeholderKey)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
