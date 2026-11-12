import { parseCategory, type Category } from "../constants";
import { inferCategory, textSupportsCategory, TYPE_REVIEW_NOTE, TYPE_WEAK_NOTE } from "./categorise";

/** True when scrape notes still ask a human to confirm or set the type. */
export function notesNeedTypeReview(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.includes(TYPE_WEAK_NOTE) || notes.includes(TYPE_REVIEW_NOTE);
}

/** Remove type-review sticky notes; keep Source feed and other text. */
export function stripTypeReviewNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block && block !== TYPE_WEAK_NOTE && block !== TYPE_REVIEW_NOTE)
    .join("\n\n")
    .trim();
  return cleaned || null;
}

/**
 * A search page can leave a type the title does not support, plus a review note.
 * Drop that label. Keep a note only when the title itself supports the stored type,
 * so the card can flag it for later without wearing the wrong name.
 */
export function settleScrapedType(input: {
  title: string;
  organisationName: string;
  category: string;
  notes: string | null | undefined;
}): { category: Category; notes: string | null; changed: boolean } {
  const stored = parseCategory(input.category) ?? "Meetup";
  const notes = input.notes ?? null;
  if (!notesNeedTypeReview(notes)) return { category: stored, notes, changed: false };
  if (textSupportsCategory(input.title, input.organisationName, stored)) {
    return { category: stored, notes, changed: false };
  }
  const inferred = inferCategory({ title: input.title, organisationName: input.organisationName });
  const category = inferred.strength === "strong" ? inferred.category : "Meetup";
  const nextNotes = stripTypeReviewNotes(notes);
  return { category, notes: nextNotes, changed: category !== stored || nextNotes !== notes };
}
