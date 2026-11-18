import { describe, expect, it } from "vitest";
import { eventFromPastedText } from "@/lib/scraper/pasted-text";

describe("pasted event page extraction", () => {
  it("extracts the title, date, time range and place from copied event text", () => {
    const event = eventFromPastedText(
      "Carols at South\nSunday, 06-Dec-2026\n5:00pm - 8:30pm\nGas Street South\nAbout\nCome and experience joy and wonder.",
      "https://gasstreet.churchsuite.com/events/tncebvhx"
    );

    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      title: "Carols at South",
      placeName: "Gas Street South",
      organisationName: "gasstreet",
      category: "Social"
    });
    expect(event?.startsAt.toISOString()).toBe("2026-12-06T17:00:00.000Z");
    expect(event?.endsAt.toISOString()).toBe("2026-12-06T20:30:00.000Z");
  });

  it("does not create an event when required date and time details are missing", () => {
    expect(eventFromPastedText("A lovely Christmas gathering", "https://example.org/event")).toBeNull();
  });

  it("infers the current London year for a future date pasted without a year", () => {
    const event = eventFromPastedText(
      `Philosophy Meetup "Environmentalism"\nBy The Philosophers' Yard\nThursday, November 19 • 6:30 PM - 8:30 PM\nBRIG Café at The Warehouse\nBirmingham, England`,
      "https://www.eventbrite.co.uk/e/philosophy-meetup-123456",
      new Date("2026-11-18T12:00:00Z")
    );

    expect(event).not.toBeNull();
    expect(event?.title).toBe('Philosophy Meetup "Environmentalism"');
    expect(event?.startsAt.toISOString()).toBe("2026-11-19T18:30:00.000Z");
    expect(event?.endsAt.toISOString()).toBe("2026-11-19T20:30:00.000Z");
  });

  it("does not infer the current year for a yearless date that has already passed", () => {
    const event = eventFromPastedText(
      "Philosophy Meetup\nTuesday, November 17 • 6:30 PM - 8:30 PM\nBirmingham",
      "https://www.eventbrite.co.uk/e/philosophy-meetup-123456",
      new Date("2026-11-18T12:00:00Z")
    );
    expect(event).toBeNull();
  });
});
