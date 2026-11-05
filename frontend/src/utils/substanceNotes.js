/**
 * Substance scope notes from the backend (`ChemicalResult.substance_notes`).
 *
 * A note says which substance the displayed GHS data describes when the
 * everyday name points at something else, e.g. CAS 7647-01-0 is hydrogen
 * chloride (including the gas), not hydrochloric acid solution. Notes are
 * reminders only: they never change pictograms, signal words, or H/P
 * statements. Each note has `code`, `text_en`, `text_zh`, and `source`
 * (where non-PubChem wording comes from; see backend
 * `substance_scope_notes.py`).
 */
import { getLocalizedStatementText } from "@/utils/ghsText";

const hasNoteText = (note) =>
  Boolean(
    note &&
      typeof note === "object" &&
      String(note.text_en || note.text_zh || "").trim(),
  );

/** Valid scope notes on a chemical result (empty array when none). */
export function getSubstanceNotes(chemical) {
  const notes = chemical?.substance_notes;
  return Array.isArray(notes) ? notes.filter(hasNoteText) : [];
}

/** Note text in one display language, falling back to the other. */
export function getSubstanceNoteText(note, locale = "zh") {
  return getLocalizedStatementText(note, locale);
}
