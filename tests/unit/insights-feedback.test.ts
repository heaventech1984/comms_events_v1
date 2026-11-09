import { describe, expect, it } from "vitest";
import { feedbackExportTable, parseFeedbackQuery, FEEDBACK_RATING_LABELS } from "@/lib/insights/feedback";
import type { FeedbackRow } from "@/lib/insights/feedback";

describe("feedback helpers", () => {
  it("parses rating and search from query params", () => {
    expect(parseFeedbackQuery({ rating: "LOVED", q: "  Priya  " })).toEqual({
      rating: "LOVED",
      q: "Priya"
    });
    expect(parseFeedbackQuery({ rating: "nope" }).rating).toBe("");
  });

  it("exports ratings without a comment column", () => {
    const rows: FeedbackRow[] = [
      {
        id: "1",
        rating: "LOVED",
        ratingLabel: FEEDBACK_RATING_LABELS.LOVED,
        createdAt: "Mon 9 Nov 2026, 12:00",
        memberName: "Priya Nair",
        cellName: "Sparkbrook",
        cellId: "c1",
        eventId: "e1",
        eventTitle: "Prayer night",
        eventCategory: "Christian",
        eventStartsAt: "Sun 8 Nov 2026, 19:00",
        online: false
      }
    ];
    const table = feedbackExportTable(rows);
    expect(table.columns.join(" ")).not.toMatch(/comment/i);
    expect(table.columns).toContain("Rating");
    expect(table.rows[0]).toContain("Loved it");
    expect(table.rows[0]).toContain("Priya Nair");
  });
});
