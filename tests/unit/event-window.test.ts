import { describe, expect, it } from "vitest";
import { eventStillBookable, onAttendanceDay } from "@/lib/event-window";
import { londonDate } from "@/lib/time";

describe("event window", () => {
  const start = londonDate(2026, 11, 24, 18, 0);
  const end = londonDate(2026, 11, 24, 20, 0);

  it("keeps Attend open until the finish time", () => {
    expect(eventStillBookable(end, londonDate(2026, 11, 24, 19, 59))).toBe(true);
    expect(eventStillBookable(end, end)).toBe(false);
  });

  it("offers I went after the finish on that calendar day only", () => {
    expect(onAttendanceDay(start, end, londonDate(2026, 11, 24, 19, 0))).toBe(false);
    expect(onAttendanceDay(start, end, londonDate(2026, 11, 24, 20, 0))).toBe(true);
    expect(onAttendanceDay(start, end, londonDate(2026, 11, 24, 23, 30))).toBe(true);
    expect(onAttendanceDay(start, end, londonDate(2026, 11, 25, 9, 0))).toBe(false);
  });

  it("offers I went on the morning an overnight event finishes", () => {
    const overnightEnd = londonDate(2026, 11, 25, 1, 0);
    expect(onAttendanceDay(start, overnightEnd, londonDate(2026, 11, 24, 23, 0))).toBe(false);
    expect(onAttendanceDay(start, overnightEnd, londonDate(2026, 11, 25, 1, 0))).toBe(true);
    expect(onAttendanceDay(start, overnightEnd, londonDate(2026, 11, 26, 9, 0))).toBe(false);
  });
});
