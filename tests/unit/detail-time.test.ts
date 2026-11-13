import { describe, expect, it } from "vitest";
import type { FetchLike } from "@/lib/scraper/live-adapter";
import { enrichDateOnlyEvents, timeFromDetailHtml } from "@/lib/scraper/detail-time";
import { londonDate } from "@/lib/time";

const listing = {
  title: "Paul Heaton",
  startsAt: londonDate(2026, 11, 13, 0, 0),
  endsAt: londonDate(2026, 11, 14, 0, 0),
  externalUrl: "https://allevents.in/birmingham/paul-heaton/1",
  fetchedFrom: "https://allevents.in/birmingham-uk/music"
};

function ok(body: string): Awaited<ReturnType<FetchLike>> {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => body
  };
}

describe("timeFromDetailHtml", () => {
  it("reads a real clock from event-page JSON-LD", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Event","name":"Paul Heaton","startDate":"2026-11-13T18:00:00+00:00","endDate":"2026-11-13T21:00:00+00:00","url":"https://allevents.in/birmingham/paul-heaton/1"}
    </script>`;
    const timing = timeFromDetailHtml(html, listing.externalUrl, listing);
    expect(timing?.startsAt.toISOString()).toBe("2026-11-13T18:00:00.000Z");
    expect(timing?.endsAt.toISOString()).toBe("2026-11-13T21:00:00.000Z");
  });

  it("reads 6:00 PM from the page text when the data has no clock", () => {
    const html = "<p>Fri, 13 Nov 2026 • 6:00 PM (GMT)</p>";
    const timing = timeFromDetailHtml(html, listing.externalUrl, listing);
    expect(timing?.startsAt.getTime()).toBe(londonDate(2026, 11, 13, 18, 0).getTime());
  });

  it("keeps 7:30 PM from the page when the hidden data is only a midnight", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Event","name":"The Legend Of Barry White","startDate":"2026-11-14","url":"https://allevents.in/walsall/barry-white/1"}
    </script><p>Sat, 14 Nov 2026 • 7:30 PM (GMT)</p>`;
    const barry = {
      ...listing,
      title: "The Legend Of Barry White",
      startsAt: londonDate(2026, 11, 14, 0, 0),
      endsAt: londonDate(2026, 11, 15, 0, 0),
      externalUrl: "https://allevents.in/walsall/barry-white/1"
    };
    const timing = timeFromDetailHtml(html, barry.externalUrl, barry);
    expect(timing?.startsAt.getTime()).toBe(londonDate(2026, 11, 14, 19, 30).getTime());
  });
});

describe("enrichDateOnlyEvents", () => {
  it("fills a midnight listing from the event page and skips rows that already have a clock", async () => {
    const calls: string[] = [];
    const fetchFn: FetchLike = async (url) => {
      calls.push(url);
      if (url.endsWith("/robots.txt")) return ok("User-agent: *\nAllow: /");
      return ok(
        `<script type="application/ld+json">{"@type":"Event","name":"Paul Heaton","startDate":"2026-11-13T18:00:00+00:00","url":"https://allevents.in/birmingham/paul-heaton/1"}</script>`
      );
    };
    const timed = {
      ...listing,
      title: "Already timed",
      startsAt: londonDate(2026, 11, 13, 19, 0),
      endsAt: londonDate(2026, 11, 13, 21, 0)
    };
    const result = await enrichDateOnlyEvents([listing, timed], { fetchFn, pauseMs: 0, budget: { left: 5 } });
    expect(result.fetched).toBe(1);
    expect(result.events[0]?.startsAt.toISOString()).toBe("2026-11-13T18:00:00.000Z");
    expect(result.events[1]?.startsAt.getTime()).toBe(timed.startsAt.getTime());
    expect(calls.some((url) => url.includes("paul-heaton"))).toBe(true);
  });

  it("does not open a page that already had no clock", async () => {
    const calls: string[] = [];
    const fetchFn: FetchLike = async (url) => {
      calls.push(url);
      return ok("User-agent: *\nAllow: /");
    };
    const missed = new Set([listing.externalUrl]);
    const result = await enrichDateOnlyEvents([listing], { fetchFn, pauseMs: 0, budget: { left: 5 }, missedUrls: missed });
    expect(result.fetched).toBe(0);
    expect(calls).toEqual([]);
    expect(result.events[0]?.startsAt.getTime()).toBe(listing.startsAt.getTime());
  });
});
