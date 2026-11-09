import { TYPE_REVIEW_NOTE, TYPE_WEAK_NOTE } from "./categorise";

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
