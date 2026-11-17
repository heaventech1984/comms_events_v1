import { describe, expect, it, vi } from "vitest";
import { canonicalEventbriteUrl, discoverEventbriteUrls, EVENTBRITE_SEARCH_URL_CAP, forceEventbritePending, upcomingEventbriteEvents } from "@/lib/scraper/eventbrite-search";
import { scrapeDecision } from "@/lib/scraper/apply";
import type { ScrapedEvent } from "@/lib/scraper/types";

describe("Eventbrite search discovery", () => {
  it("accepts only canonical UK individual event pages and removes tracking parameters", () => {
    expect(canonicalEventbriteUrl("https://www.eventbrite.co.uk/e/event-name-123456?aff=search#tickets"))
      .toBe("https://www.eventbrite.co.uk/e/event-name-123456");
    expect(canonicalEventbriteUrl("https://www.eventbrite.co.uk/d/united-kingdom--birmingham/free--events/"))
      .toBeNull();
    expect(canonicalEventbriteUrl("https://evil.example/e/event-name-123456")).toBeNull();
    expect(canonicalEventbriteUrl("http://www.eventbrite.co.uk/e/event-name-123456")).toBeNull();
    expect(canonicalEventbriteUrl("https://www.eventbrite.com/e/event-name-123456")).toBeNull();
  });

  it("does not call the search service or leak an absent key into a request", async () => {
    const fetchFn = vi.fn();
    const result = await discoverEventbriteUrls("", fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.urls).toEqual([]);
    expect(result.sources[0].error).toContain("BRAVE_SEARCH_API_KEY is not configured");
  });

  it("sends discovered events to Pending even for whitelisted organisations", () => {
    const event = { sourceKey: "eventbrite:1", title: "Event", startsAt: new Date(), endsAt: new Date() } as ScrapedEvent;
    const [discovered] = forceEventbritePending([event]);
    expect(discovered).toMatchObject({ sourceKey: event.sourceKey, forcePending: true });
    expect(scrapeDecision(null, "WHITELIST", discovered)).toEqual({ action: "create", status: "PENDING" });
    expect(scrapeDecision(null, "BLACKLIST", discovered)).toEqual({ action: "create", status: "DISCARDED" });
  });

  it("ignores search results for events that have already ended", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const ended = { sourceKey: "past", startsAt: new Date("2026-11-16T10:00:00Z"), endsAt: new Date("2026-11-16T11:00:00Z") } as ScrapedEvent;
    const upcoming = { sourceKey: "future", startsAt: new Date("2026-11-18T10:00:00Z"), endsAt: new Date("2026-11-18T11:00:00Z") } as ScrapedEvent;
    expect(upcomingEventbriteEvents([ended, upcoming], now)).toEqual([upcoming]);
  });

  it("deduplicates search results, ignores listing URLs, and fetches at most 60 direct links", async () => {
    const fetchFn = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({
      web: {
        results: [
          { url: "https://www.eventbrite.co.uk/e/birmingham-church-event-123456?aff=search" },
          { url: "https://www.eventbrite.co.uk/d/united-kingdom--birmingham/events/" },
          { url: "https://evil.example/e/fake-event-123456" },
          { url: "https://www.eventbrite.co.uk/e/birmingham-church-event-123456#tickets" }
        ]
      }
    }), { status: 200 }));

    const result = await discoverEventbriteUrls("test-key", fetchFn);

    expect(result.urls).toEqual(["https://www.eventbrite.co.uk/e/birmingham-church-event-123456"]);
    expect(result.sources).toHaveLength(5);
    expect(fetchFn).toHaveBeenCalledTimes(5);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("site%3Aeventbrite.co.uk");
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-Subscription-Token": "test-key" });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("caps discovered direct pages across queries", async () => {
    let id = 100000;
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      web: { results: Array.from({ length: 20 }, () => ({ url: `https://www.eventbrite.co.uk/e/event-${id++}` })) }
    }), { status: 200 }));
    const result = await discoverEventbriteUrls("test-key", fetchFn as never);
    expect(result.urls).toHaveLength(EVENTBRITE_SEARCH_URL_CAP);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
