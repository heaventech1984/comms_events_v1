import { describe, expect, it } from "vitest";
import { isDateOnlyStoredRange, parseSchemaInstant, resolveSchemaEnd } from "@/lib/scraper/schema-date";
import { londonDate, londonParts, londonWallMinuteOffset, shiftLondonWallMinutes } from "@/lib/time";

describe("London wall-time shifts", () => {
  it("applies date and clock offsets without changing a weekly local time across spring DST", () => {
    const first = londonDate(2026, 3, 22, 19, 0);
    const nextWeek = shiftLondonWallMinutes(first, 7 * 24 * 60);
    expect(londonParts(nextWeek)).toEqual({ year: 2026, month: 3, day: 29, hour: 19, minute: 0 });
    expect(nextWeek.getTime() - first.getTime()).toBe(6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000);
  });

  it("measures selected schedule changes in London wall minutes", () => {
    const oldStart = londonDate(2026, 10, 18, 19, 0);
    const newStart = londonDate(2026, 10, 20, 20, 30);
    expect(londonWallMinuteOffset(oldStart, newStart)).toBe(2 * 24 * 60 + 90);
    expect(londonParts(shiftLondonWallMinutes(oldStart, 2 * 24 * 60 + 90))).toEqual({
      year: 2026,
      month: 10,
      day: 20,
      hour: 20,
      minute: 30
    });
  });

  it("rejects a shifted occurrence at a local clock time skipped by DST", () => {
    const beforeClockChange = londonDate(2026, 3, 22, 1, 30);
    expect(() => shiftLondonWallMinutes(beforeClockChange, 7 * 24 * 60)).toThrow(/does not exist/i);
  });
});

describe("parseSchemaInstant", () => {
  it("marks date-only and midnight-local strings as dateOnly", () => {
    const day = parseSchemaInstant("2026-11-10");
    expect(day?.dateOnly).toBe(true);
    expect(day?.at.getTime()).toBe(londonDate(2026, 11, 10, 0, 0).getTime());

    const mid = parseSchemaInstant("2026-11-10T00:00:00");
    expect(mid?.dateOnly).toBe(true);

    const utc = parseSchemaInstant("2026-11-10T00:00:00.000Z");
    expect(utc?.dateOnly).toBe(true);
    expect(utc?.at.getTime()).toBe(londonDate(2026, 11, 10, 0, 0).getTime());
  });

  it("keeps real evening clocks timed", () => {
    const evening = parseSchemaInstant("2026-11-10T18:30:00+00:00");
    expect(evening?.dateOnly).toBe(false);
  });
});

describe("resolveSchemaEnd", () => {
  it("does not invent +1h for date-only starts", () => {
    const start = parseSchemaInstant("2026-11-10")!;
    const end = resolveSchemaEnd(start, null);
    expect(end.getTime()).toBe(start.at.getTime());
  });

  it("treats next-midnight as a day with no clock", () => {
    const start = londonDate(2026, 11, 13, 0, 0);
    expect(isDateOnlyStoredRange(start, londonDate(2026, 11, 14, 0, 0))).toBe(true);
    expect(isDateOnlyStoredRange(londonDate(2026, 11, 13, 18, 0), londonDate(2026, 11, 13, 20, 0))).toBe(false);
  });

  it("defaults +1h only for timed starts", () => {
    const start = parseSchemaInstant("2026-11-10T18:00:00Z")!;
    const end = resolveSchemaEnd(start, null);
    expect(end.getTime()).toBe(start.at.getTime() + 60 * 60 * 1000);
  });
});
