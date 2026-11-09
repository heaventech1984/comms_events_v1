import { describe, expect, it } from "vitest";
import { parseSchemaInstant, resolveSchemaEnd } from "@/lib/scraper/schema-date";
import { londonDate } from "@/lib/time";

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

  it("defaults +1h only for timed starts", () => {
    const start = parseSchemaInstant("2026-11-10T18:00:00Z")!;
    const end = resolveSchemaEnd(start, null);
    expect(end.getTime()).toBe(start.at.getTime() + 60 * 60 * 1000);
  });
});
