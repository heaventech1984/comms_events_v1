import { describe, expect, it } from "vitest";
import { CATEGORIES, type Category } from "@/lib/constants";
import { judgePendingEvent, placeFromDetailHtml } from "@/lib/scraper/pending-settings-filter";

const allOn = new Set<Category>(CATEGORIES);

const row = {
  category: "Social",
  tags: "",
  title: "Gig",
  placeName: null as string | null,
  lat: null as number | null,
  lng: null as number | null,
  online: false,
  externalUrl: "https://luma.com/abc",
  notes: "Source feed: https://luma.com/calendar"
};

describe("judgePendingEvent", () => {
  it("keeps a Meetup card even when the city is outside the miles and the type is off", () => {
    expect(
      judgePendingEvent(
        {
          ...row,
          category: "Faith",
          tags: "|Meetup|",
          placeName: "KK's Steel Mill, Wolverhampton",
          externalUrl: "https://www.meetup.com/example/events/1/"
        },
        { enabled: new Set<Category>(["Social"]), miles: 10 }
      )
    ).toBe("keep");
  });

  it("discards a city outside the miles and keeps one inside", () => {
    expect(
      judgePendingEvent({ ...row, placeName: "HMV Empire, Coventry" }, { enabled: allOn, miles: 10 })
    ).toBe("discard");
    expect(
      judgePendingEvent({ ...row, placeName: "The Mill, Digbeth" }, { enabled: allOn, miles: 10 })
    ).toBe("keep");
  });

  it("discards an unticked type and keeps an online event of a ticked type", () => {
    expect(judgePendingEvent({ ...row, category: "Faith" }, { enabled: new Set<Category>(["Social"]), miles: 10 })).toBe(
      "discard"
    );
    expect(
      judgePendingEvent({ ...row, online: true, placeName: null }, { enabled: allOn, miles: 10 })
    ).toBe("keep");
  });

  it("keeps a cathedral page and opens a single Luma page that has no city", () => {
    expect(
      judgePendingEvent(
        {
          ...row,
          externalUrl: "https://birminghamcathedral.com/event/lunchtime-recital-3/",
          notes: null
        },
        { enabled: allOn, miles: 10 }
      )
    ).toBe("keep");
    expect(judgePendingEvent(row, { enabled: allOn, miles: 10 })).toBe("open-page");
  });

  it("reads Birmingham from a page download and then keeps the card", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Event","name":"Gas Street","startDate":"2026-11-15T17:00:00Z","location":{"name":"Gas Street","address":{"addressLocality":"Birmingham"}}}
    </script>`;
    const place = placeFromDetailHtml(html, "https://luma.com/abc");
    expect(place.placeName).toMatch(/Birmingham/);
    expect(
      judgePendingEvent({ ...row, placeName: place.placeName, lat: place.lat, lng: place.lng }, { enabled: allOn, miles: 10 })
    ).toBe("keep");
  });
});
