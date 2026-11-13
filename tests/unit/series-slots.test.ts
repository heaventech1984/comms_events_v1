import { describe, expect, it } from "vitest";
import { eventsFromJsonLd } from "@/lib/scraper/jsonld";
import { isSeriesSpan } from "@/lib/scraper/schema-date";
import { occurrencesFromDetailHtml } from "@/lib/scraper/series-slots";
import { londonDate, londonParts } from "@/lib/time";
import type { ScrapedEvent } from "@/lib/scraper/types";

const page = "https://allevents.in/nuneaton/book-magic/1";

function spanEvent(): ScrapedEvent {
  return {
    sourceKey: "live:allevents.in:book-magic",
    title: "Book Magic",
    organisationName: "Nuneaton Library",
    category: "Social",
    startsAt: londonDate(2023, 10, 15, 11, 30),
    endsAt: londonDate(2026, 12, 6, 12, 0),
    online: false,
    placeName: "Nuneaton Library",
    externalUrl: page,
    needsTypeReview: false
  };
}

describe("series slots", () => {
  it("keeps each JSON-LD sitting and drops the first-to-last span", () => {
    const events = eventsFromJsonLd(
      {
        "@type": "Event",
        name: "Book Magic",
        startDate: "2023-10-15T11:30:00+00:00",
        endDate: "2026-12-06T12:00:00+00:00",
        url: page,
        subEvent: [
          {
            "@type": "Event",
            name: "Book Magic",
            startDate: "2026-11-15T11:30:00+00:00",
            endDate: "2026-11-15T12:00:00+00:00",
            url: page
          },
          {
            "@type": "Event",
            name: "Book Magic",
            startDate: "2026-11-22T11:30:00+00:00",
            endDate: "2026-11-22T12:00:00+00:00",
            url: page
          }
        ]
      },
      page
    );
    expect(events).toHaveLength(2);
    expect(events.some((event) => isSeriesSpan(event.startsAt, event.endsAt))).toBe(false);
    expect(events[0]?.sourceKey).not.toBe(events[1]?.sourceKey);
    expect(events[0]?.endsAt.getTime()! - events[0]?.startsAt.getTime()!).toBe(30 * 60 * 1000);
  });

  it("reads AllEvents date chips into one-off sittings of the same length", () => {
    const html = `From 15 Nov 2026 • 11:30 AM (GMT) + 33 more
      Sunday 15 Nov 11:30 AM Sunday 22 Nov 11:30 AM Sunday 06 Dec 11:30 AM`;
    const slots = occurrencesFromDetailHtml(html, spanEvent(), new Date("2026-11-13T12:00:00Z"));
    expect(slots.map((slot) => londonParts(slot.startsAt).day)).toEqual([15, 22, 6]);
    expect(slots.every((slot) => slot.endsAt.getTime() - slot.startsAt.getTime() === 30 * 60 * 1000)).toBe(true);
    expect(slots.every((slot) => !isSeriesSpan(slot.startsAt, slot.endsAt))).toBe(true);
    expect(new Set(slots.map((slot) => slot.sourceKey)).size).toBe(3);
  });

  it("leaves a single date as one row", () => {
    const html = "From 15 Nov 2026 • 11:30 AM";
    const slots = occurrencesFromDetailHtml(html, spanEvent(), new Date("2026-11-13T12:00:00Z"));
    expect(slots).toHaveLength(1);
    expect(slots[0]?.sourceKey).toBe("live:allevents.in:book-magic");
  });
});
