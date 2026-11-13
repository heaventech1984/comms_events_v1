import { describe, expect, it } from "vitest";
import {
  eventInPendingDates,
  eventMatchesPendingFilters,
  parsePendingFilters,
  pendingBackHref,
  pendingEditHref,
  pendingHref,
  togglePendingType
} from "@/lib/pending-filters";
import {
  extrasOnlyPriorityUrls,
  mergeDiscoveryWithExtras,
  frozenDiscoveryUrls
} from "@/lib/scraper/discovery-pack";
import { preferExternalUrl, preferPlace } from "@/lib/scraper/enrich";
import { STARTER_PRIORITY_URL } from "@/lib/scraper/allowlist";

describe("pending filters", () => {
  it("builds hrefs that keep category and tags together", () => {
    const state = parsePendingFilters({ types: "Faith", tags: "Online" });
    expect(pendingHref(state)).toBe("/pending?types=Faith&tags=Online");
    expect(pendingHref(state, { needsTypeOnly: true })).toBe(
      "/pending?types=Faith&tags=Online&filter=needs-type"
    );
    expect(togglePendingType(["Faith"], "Social")).toEqual(["Social", "Faith"]);
  });

  it("filters by category and tags", () => {
    const base = parsePendingFilters({ types: "Faith", tags: "In Person" });
    expect(
      eventMatchesPendingFilters(
        { category: "Faith", tags: "|Christian|In Person|", online: false, notes: null },
        base,
        false
      )
    ).toBe(true);
    expect(
      eventMatchesPendingFilters({ category: "Social", tags: "|In Person|", online: false, notes: null }, base, false)
    ).toBe(false);
    expect(
      eventMatchesPendingFilters({ category: "Faith", tags: "|Online|", online: true, notes: null }, base, false)
    ).toBe(false);
  });

  it("defaults to today through the next 7 days, and can show every open card", () => {
    const today = { year: 2026, month: 11, day: 13 };
    const state = parsePendingFilters({}, today);
    expect(state.dateMode).toBe("default");
    expect(state.from).toEqual(today);
    expect(state.to).toEqual({ year: 2026, month: 11, day: 20 });
    expect(pendingHref(state)).toBe("/pending");
    const start = (day: number) => new Date(Date.UTC(2026, 10, day, 12, 0, 0));
    expect(eventInPendingDates(start(13), state)).toBe(true);
    expect(eventInPendingDates(start(20), state)).toBe(true);
    expect(eventInPendingDates(start(12), state)).toBe(false);
    expect(eventInPendingDates(start(21), state)).toBe(false);
    const custom = parsePendingFilters({ from: "2026-12-01", to: "2026-11-01" }, today);
    expect(custom.rangeError).toBe(true);
    expect(eventInPendingDates(start(13), custom)).toBe(false);
    const all = parsePendingFilters({ dates: "all", types: "Faith" }, today);
    expect(pendingHref(all)).toBe("/pending?types=Faith&dates=all");
    expect(eventInPendingDates(start(12), all)).toBe(true);
    expect(pendingHref(all, { dateMode: "default" })).toBe("/pending?types=Faith");
  });

  it("keeps a pending return path and drops anything else", () => {
    const back = "/pending?types=Meetup&format=online";
    expect(pendingEditHref("evt-1", back)).toBe(`/events/evt-1/edit?from=${encodeURIComponent(back)}`);
    expect(pendingBackHref(back)).toBe(back);
    expect(pendingBackHref("/pending")).toBe("/pending");
    expect(pendingBackHref("https://example.com")).toBe("/pending");
    expect(pendingBackHref("/calendar")).toBe("/pending");
  });
});

describe("discovery merge", () => {
  it("keeps the frozen pack first and appends unknown extras", () => {
    const pack = frozenDiscoveryUrls();
    const merged = mergeDiscoveryWithExtras([
      STARTER_PRIORITY_URL,
      "https://www.meetup.com/find/?location=gb--Birmingham&distance=tenMiles"
    ]);
    expect(merged[0]).toBe(pack[0]);
    expect(merged.length).toBeGreaterThanOrEqual(pack.length);
    expect(merged.filter((u) => u === STARTER_PRIORITY_URL)).toHaveLength(1);
  });

  it("strips pack URLs so the Priority box only keeps gap-fillers", () => {
    const extras = extrasOnlyPriorityUrls([
      STARTER_PRIORITY_URL,
      "https://www.meetup.com/find/?keywords=unique-gap&location=gb--Birmingham"
    ]);
    expect(extras).not.toContain(STARTER_PRIORITY_URL);
    expect(extras.some((u) => u.includes("unique-gap"))).toBe(true);
  });
});

describe("detail refresh helpers", () => {
  it("keeps a richer place and prefers an event page over a find listing", () => {
    expect(preferPlace("Digbeth", "Digbeth, Birmingham B5")).toBe("Digbeth, Birmingham B5");
    expect(preferPlace("Guild of Students, Edgbaston", "Birmingham")).toBe(
      "Guild of Students, Edgbaston"
    );
    expect(
      preferExternalUrl(
        "https://www.meetup.com/birmingham-tech/events/123/",
        "https://www.meetup.com/find/?keywords=tech&location=gb--Birmingham"
      )
    ).toBe("https://www.meetup.com/birmingham-tech/events/123/");
    expect(
      preferExternalUrl(null, "https://birminghamcathedral.com/whats-on/")
    ).toBe("https://birminghamcathedral.com/whats-on/");
  });
});
