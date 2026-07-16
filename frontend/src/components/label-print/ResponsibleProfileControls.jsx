import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, Phone } from "@/components/icons";
import { READINESS_TONE_CLASSES } from "@/components/label-print/labelPrintModalHelpers";
import { LAB_PROFILE_LIMITS } from "@/hooks/useLabProfile";

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

const normalizeProfileDraft = (profile = {}) => ({
  organization: profile.organization || "",
  phone: profile.phone || "",
  address: profile.address || "",
});

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
  const [draftProfile, setDraftProfile] = useState(() =>
    normalizeProfileDraft(labProfile),
  );
  const composingFieldsRef = useRef(new Set());
  const {
    organization: labProfileOrganization,
    phone: labProfilePhone,
    address: labProfileAddress,
  } = labProfile;
  const hasProfileValues =
    labProfileOrganization || labProfilePhone || labProfileAddress;

  useEffect(() => {
    if (composingFieldsRef.current.size > 0) return;
    setDraftProfile(
      normalizeProfileDraft({
        organization: labProfileOrganization,
        phone: labProfilePhone,
        address: labProfileAddress,
      }),
    );
  }, [labProfileAddress, labProfileOrganization, labProfilePhone]);

  const commitProfileField = (key, value, profileDraft = draftProfile) => {
    onLabProfileChange?.({
      ...profileDraft,
      [key]: value,
    });
  };

  const handleProfileFieldChange = (key, value) => {
    const nextDraft = {
      ...draftProfile,
      [key]: value,
    };
    setDraftProfile(nextDraft);
    if (!composingFieldsRef.current.has(key)) {
      commitProfileField(key, value, nextDraft);
    }
  };

  const handleProfileCompositionStart = (key) => {
    composingFieldsRef.current.add(key);
  };

  const handleProfileCompositionEnd = (key, value) => {
    composingFieldsRef.current.delete(key);
    const nextDraft = {
      ...draftProfile,
      [key]: value,
    };
    setDraftProfile(nextDraft);
    commitProfileField(key, value, nextDraft);
  };

  return (
    <details
      open={open}
      className={`notebook-print-note-section rounded-md p-4 ${
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
        <span className="notebook-status-chip shrink-0 rounded px-2 py-1 text-xs font-semibold">
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
              className="notebook-report-link shrink-0 rounded px-2 py-1 text-xs font-semibold transition-colors"
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
                  maxLength={LAB_PROFILE_LIMITS[field.key]}
                  data-testid={`responsible-profile-field-${field.key}`}
                  value={draftProfile[field.key] || ""}
                  onChange={(event) =>
                    handleProfileFieldChange(field.key, event.target.value)
                  }
                  onCompositionStart={() =>
                    handleProfileCompositionStart(field.key)
                  }
                  onCompositionEnd={(event) =>
                    handleProfileCompositionEnd(
                      field.key,
                      event.currentTarget.value,
                    )
                  }
                  placeholder={t(field.placeholderKey)}
                  className="notebook-field rounded-md px-3 py-2 text-sm"
                />
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
