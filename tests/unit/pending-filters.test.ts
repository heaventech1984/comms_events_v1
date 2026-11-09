import { describe, expect, it } from "vitest";
import {
  eventMatchesPendingFilters,
  parsePendingFilters,
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
