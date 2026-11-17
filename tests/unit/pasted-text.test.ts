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
});
