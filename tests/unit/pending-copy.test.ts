import { describe, expect, it } from "vitest";
import {
  DISCARD_EVENT_CONFIRM_BODY,
  discardTouchesOrganisation,
  eventLinkLabel,
  friendlyHostLabel,
  pendingClockLabel,
  pendingReviewLede,
  pendingWhen
} from "@/lib/pending-copy";
import { londonDate } from "@/lib/time";

describe("Discard ≠ blacklist", () => {
  it("confirm copy says Discard does not blacklist the organisation", () => {
    expect(DISCARD_EVENT_CONFIRM_BODY).toMatch(/does not blacklist the organisation/i);
    expect(DISCARD_EVENT_CONFIRM_BODY).toMatch(/future scrapes/i);
    expect(DISCARD_EVENT_CONFIRM_BODY.toLowerCase()).not.toMatch(/will blacklist/);
  });

  it("marks Discard as an event-only action (never org status)", () => {
    expect(discardTouchesOrganisation()).toBe(false);
  });
});

describe("pending tile display", () => {
  it("names known Event Link hosts in a short On … label", () => {
    expect(eventLinkLabel("https://www.birminghamcathedral.com/event/evening-prayer-16/2026-10-28/")).toBe(
      "On Birmingham Cathedral"
    );
    expect(eventLinkLabel("https://www.meetup.com/birmingham-tech/events/123/")).toBe("On Meetup");
  });

  it("falls back to the hostname for unknown sites, without the long path", () => {
    expect(eventLinkLabel("https://www.example.org/very/long/event/path/slug-here")).toBe("On example.org");
    expect(eventLinkLabel("not-a-url")).toBe("On source page");
  });

  it("shows start–end as date-time then clock when endsAt is set", () => {
    const startsAt = new Date("2026-10-28T13:10:00+00:00");
    const endsAt = new Date("2026-10-28T13:40:00+00:00");
    const label = pendingWhen(startsAt, endsAt);
    expect(label).toMatch(/13:10/);
    expect(label).toMatch(/–13:40/);
    expect(label).toMatch(/Oct/);
  });

  it("omits the end clock when endsAt is missing", () => {
    const startsAt = new Date("2026-10-28T16:00:00+00:00");
    expect(pendingWhen(startsAt, null)).not.toMatch(/–/);
    expect(pendingWhen(startsAt, undefined)).not.toMatch(/–/);
  });

  it("says Time not listed instead of 00:00–01:00 for date-only feeds", () => {
    const start = londonDate(2026, 11, 10, 0, 0);
    const endHour = londonDate(2026, 11, 10, 1, 0);
    expect(pendingClockLabel(start, endHour)).toBe("Time not listed");
    expect(pendingClockLabel(start, start)).toBe("Time not listed");
    expect(pendingWhen(start, endHour)).toMatch(/Time not listed/);
  });

  it("keeps a real evening clock", () => {
    const start = londonDate(2026, 11, 10, 18, 30);
    const end = londonDate(2026, 11, 10, 20, 0);
    expect(pendingClockLabel(start, end)).toBe("18:30–20:00");
  });

  it("greets by first name and role tip", () => {
    expect(pendingReviewLede({ name: "An Te", role: "admin" })).toMatch(/^An —/);
    expect(pendingReviewLede({ name: "An Te", role: "admin" })).toMatch(/new tab/i);
    expect(pendingReviewLede({ name: "Priya Nair", role: "cell leader" })).toMatch(/^Priya —/);
    expect(friendlyHostLabel("www.allevents.in")).toBe("AllEvents");
  });
});
