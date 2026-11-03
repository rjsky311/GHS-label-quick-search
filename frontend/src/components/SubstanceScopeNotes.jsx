import { useTranslation } from "react-i18next";
import { Info } from "@/components/icons";
import { getSubstanceNoteText, getSubstanceNotes } from "@/utils/substanceNotes";

/**
 * Shows which substance the GHS data describes when the everyday name
 * points elsewhere (e.g. CAS 7647-01-0 is hydrogen chloride including the
 * gas, not hydrochloric acid solution). A reminder only; it never changes
 * the classification shown next to it.
 */
export default function SubstanceScopeNotes({
  chemical,
  testId,
  compact = false,
}) {
  const { t, i18n } = useTranslation();
  const notes = getSubstanceNotes(chemical);
  if (notes.length === 0) return null;
  const locale = i18n?.language || "zh-TW";

  return (
    <div
      role="note"
      data-testid={testId || `substance-scope-notes-${chemical?.cas_number || ""}`}
      className={`notebook-source-note notebook-source-note-warning flex items-start gap-2 rounded-md ${
        compact ? "mt-1.5 p-2 text-xs leading-5" : "p-3 text-sm"
      }`}
    >
      <Info
        className={`${compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} shrink-0 text-[hsl(var(--notebook-warning))]`}
      />
      <span className="min-w-0 space-y-1">
        {!compact && (
          <span className="block font-semibold">
            {t("substanceNote.title")}
          </span>
        )}
        {notes.map((note) => (
          <span
            key={note.code || note.text_en}
            className="block"
            data-substance-note-code={note.code || undefined}
          >
            {getSubstanceNoteText(note, locale)}
          </span>
        ))}
      </span>
    </div>
  );
}
