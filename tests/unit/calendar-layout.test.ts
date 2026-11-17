import { describe, expect, it } from "vitest";
import { currentTimeMinute, eventOverlapsTimeBand, layoutCalendarDay } from "@/lib/calendar-layout";

const day = { year: 2026, month: 11, day: 17 };
function event(id: string, start: string, end: string) {
  return { id, startsAt: new Date(start), endsAt: new Date(end) };
}

describe("calendar event time-band layout", () => {
  it("places the current-time marker only on today and inside the visible band", () => {
    expect(currentTimeMinute(new Date("2026-11-17T18:30:00Z"), day, 8 * 60, 23 * 60)).toBe(18 * 60 + 30);
    expect(currentTimeMinute(new Date("2026-11-17T07:30:00Z"), day, 8 * 60, 23 * 60)).toBeNull();
    expect(currentTimeMinute(new Date("2026-11-18T18:30:00Z"), day, 8 * 60, 23 * 60)).toBeNull();
  });
  it("gives an isolated event full width even if later events overlap", () => {
    const placed = layoutCalendarDay([
      event("morning", "2026-11-17T10:00:00Z", "2026-11-17T11:00:00Z"),
      event("evening-1", "2026-11-17T18:00:00Z", "2026-11-17T20:00:00Z"),
      event("evening-2", "2026-11-17T18:00:00Z", "2026-11-17T19:00:00Z")
    ], day, 8 * 60, 23 * 60);

    expect(placed.find((item) => item.id === "morning")).toMatchObject({ leftPct: 0, widthPct: 100 });
    expect(placed.find((item) => item.id === "evening-1")?.widthPct).toBe(50);
  });

  it("clips event positions and heights to the selected band", () => {
    const placed = layoutCalendarDay([
      event("crossing", "2026-11-17T08:00:00Z", "2026-11-17T12:00:00Z")
    ], day, 9 * 60, 11 * 60);
    expect(placed[0]).toMatchObject({ top: 0, height: 96, leftPct: 0, widthPct: 100 });
  });

  it("shows events that overlap the selected time range, including boundary crossings", () => {
    expect(eventOverlapsTimeBand(event("before", "2026-11-17T08:00:00Z", "2026-11-17T10:00:00Z"), 9 * 60, 11 * 60)).toBe(true);
    expect(eventOverlapsTimeBand(event("after", "2026-11-17T11:00:00Z", "2026-11-17T12:00:00Z"), 9 * 60, 11 * 60)).toBe(false);
  });
});
