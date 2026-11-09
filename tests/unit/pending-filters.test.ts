import { describe, expect, it } from "vitest";
import {
  eventMatchesPendingFilters,
  parsePendingFilters,
  pendingHref,
  togglePendingType
} from "@/lib/pending-filters";
import { mergeDiscoveryWithExtras, frozenDiscoveryUrls } from "@/lib/scraper/discovery-pack";
import { STARTER_PRIORITY_URL } from "@/lib/scraper/allowlist";

describe("pending filters", () => {
  it("builds hrefs that keep type and format together", () => {
    const state = parsePendingFilters({ types: "Christian", format: "online" });
    expect(pendingHref(state)).toBe("/pending?types=Christian&format=online");
    expect(pendingHref(state, { needsTypeOnly: true })).toBe(
      "/pending?types=Christian&format=online&filter=needs-type"
    );
    expect(togglePendingType(["Christian"], "Meetup")).toEqual(["Christian", "Meetup"]);
  });

  it("filters by type, format, and needs-type", () => {
    const base = parsePendingFilters({ types: "Christian", format: "inperson" });
    expect(
      eventMatchesPendingFilters(
        { category: "Christian", online: false, notes: null },
        base,
        false
      )
    ).toBe(true);
    expect(
      eventMatchesPendingFilters({ category: "Meetup", online: false, notes: null }, base, false)
    ).toBe(false);
    expect(
      eventMatchesPendingFilters({ category: "Christian", online: true, notes: null }, base, false)
    ).toBe(false);
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
});
