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
});
