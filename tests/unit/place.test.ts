import { describe, expect, it } from "vitest";
import { formatWhereLine, tidyOrgName, tidyPlaceName } from "@/lib/place";
import { formatDateTimeRange, formatTimeRange } from "@/lib/time";

describe("tidyPlaceName", () => {
  it("drops repeated city and trailing country crumbs", () => {
    expect(
      tidyPlaceName(
        "Lordswood Girls’ School and Sixth Form Centre — Knightlow Road, Birmingham, Birmingham, gb"
      )
    ).toBe("Lordswood Girls’ School and Sixth Form Centre — Knightlow Road, Birmingham");
  });

  it("drops a venue name repeated after the em dash", () => {
    expect(
      tidyPlaceName(
        "Gosta Green Football Pitch — Gosta Green Football Pitch, 10 Gosta Green, Birmingham, al, Birmingham, al, gb"
      )
    ).toBe("Gosta Green Football Pitch — 10 Gosta Green, Birmingham");
  });

  it("clears Meetup placeholder spam", () => {
    expect(
      tidyPlaceName("See main event text — See main event text, See main event text, See main event text, gb")
    ).toBeNull();
  });

  it("drops one-letter and punctuation crumbs that printed as Place. T", () => {
    expect(tidyPlaceName("T")).toBeNull();
    expect(tidyPlaceName("ab")).toBeNull();
    expect(tidyPlaceName("—")).toBeNull();
    expect(tidyOrgName("T")).toBeNull();
    expect(tidyOrgName("St Mary's")).toBe("St Mary's");
  });

  it("formats a where line without a blank after the dot", () => {
    expect(formatWhereLine(true, "Hall")).toBe("Online");
    expect(formatWhereLine(false, "Town Hall, Birmingham")).toBe("Town Hall, Birmingham");
    expect(formatWhereLine(false, "T")).toBe("In person");
    expect(formatWhereLine(false, null)).toBe("In person");
  });
});

describe("date/time range helpers", () => {
  it("shows the date once for a same-day range", () => {
    const startsAt = new Date("2026-11-09T10:00:00+00:00");
    const endsAt = new Date("2026-11-09T11:30:00+00:00");
    const label = formatDateTimeRange(startsAt, endsAt);
    expect(label).toMatch(/Nov/);
    expect(label).toMatch(/–/);
    expect(label.match(/Nov/g)?.length).toBe(1);
  });

  it("shows clocks only for time range", () => {
    const startsAt = new Date("2026-11-09T10:00:00+00:00");
    const endsAt = new Date("2026-11-09T11:30:00+00:00");
    expect(formatTimeRange(startsAt, endsAt)).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
  });
});
