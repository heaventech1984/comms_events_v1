import { describe, expect, it } from "vitest";
import { attendanceAvailable, eventStillBookable } from "@/lib/event-window";
import { londonDate } from "@/lib/time";

describe("event window", () => {
  const start = londonDate(2026, 11, 24, 18, 0);
  const end = londonDate(2026, 11, 24, 20, 0);

  it("keeps Attend open until the finish time", () => {
    expect(eventStillBookable(end, londonDate(2026, 11, 24, 19, 59))).toBe(true);
    expect(eventStillBookable(end, end)).toBe(false);
  });

  it("allows attendance as soon as an event finishes and on later dates", () => {
    expect(attendanceAvailable(end, londonDate(2026, 11, 24, 19, 59))).toBe(false);
    expect(attendanceAvailable(end, end)).toBe(true);
    expect(attendanceAvailable(end, londonDate(2026, 11, 24, 23, 30))).toBe(true);
    expect(attendanceAvailable(end, londonDate(2026, 11, 25, 9, 0))).toBe(true);
    expect(attendanceAvailable(end, londonDate(2026, 12, 24, 9, 0))).toBe(true);
  });

  it("does not allow attendance before an overnight event finishes", () => {
    const overnightEnd = londonDate(2026, 11, 25, 1, 0);
    expect(attendanceAvailable(overnightEnd, londonDate(2026, 11, 24, 23, 0))).toBe(false);
    expect(attendanceAvailable(overnightEnd, overnightEnd)).toBe(true);
    expect(attendanceAvailable(overnightEnd, londonDate(2026, 11, 26, 9, 0))).toBe(true);
  });
});
