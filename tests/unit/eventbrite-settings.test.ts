import { describe, expect, it } from "vitest";
import {
  buildEventbriteSearchQuery,
  DEFAULT_EVENTBRITE_SEARCH_CONFIG,
  parseEventbriteSearchConfig,
  shouldRunEventbriteSearch
} from "@/lib/scraper/eventbrite-settings";

describe("Eventbrite search settings", () => {
  it("uses safe defaults and bounds configurable values", () => {
    expect(parseEventbriteSearchConfig(null)).toEqual(DEFAULT_EVENTBRITE_SEARCH_CONFIG);
    expect(parseEventbriteSearchConfig({ pages: 99, runDays: [0, 0, 8, -1], location: '"Birmingham"' })).toMatchObject({
      pages: 10,
      runDays: [0],
      location: "Birmingham"
    });
    expect(parseEventbriteSearchConfig({ pages: 0 }).pages).toBe(1);
  });

  it("uses configured weekday for scheduled runs and the manual-run toggle for manual runs", () => {
    const config = { ...DEFAULT_EVENTBRITE_SEARCH_CONFIG, runDays: [0], includeManual: false };
    const sunday = new Date("2026-11-22T12:00:00Z");
    const monday = new Date("2026-11-23T12:00:00Z");
    expect(shouldRunEventbriteSearch(config, "SCHEDULED", sunday)).toBe(true);
    expect(shouldRunEventbriteSearch(config, "SCHEDULED", monday)).toBe(false);
    expect(shouldRunEventbriteSearch(config, "MANUAL", sunday)).toBe(false);
    expect(shouldRunEventbriteSearch({ ...config, includeManual: true }, "MANUAL", monday)).toBe(true);
    expect(shouldRunEventbriteSearch({ ...config, enabled: false, includeManual: true }, "MANUAL", sunday)).toBe(false);
  });

  it("formats terms and the month/year at London run time plus seven days", () => {
    expect(buildEventbriteSearchQuery(DEFAULT_EVENTBRITE_SEARCH_CONFIG, new Date("2026-11-18T12:00:00Z")))
      .toBe('site:eventbrite.co.uk/e/ "Birmingham" AND ("Christian" OR "Church" OR "Jesus") AND "November" AND "2026"');
    expect(buildEventbriteSearchQuery(DEFAULT_EVENTBRITE_SEARCH_CONFIG, new Date("2026-12-27T12:00:00Z")))
      .toContain('AND "January" AND "2027"');
  });
});
