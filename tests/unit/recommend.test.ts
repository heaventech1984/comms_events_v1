import { describe, expect, it } from "vitest";
import { scoreRecommendations, type RecommendCandidate, type TasteSignal } from "@/lib/recommend";

function candidate(overrides: Partial<RecommendCandidate> & Pick<RecommendCandidate, "id" | "title" | "category">): RecommendCandidate {
  return {
    organisationName: "Org",
    startsAt: new Date("2026-11-20T12:00:00Z"),
    endsAt: new Date("2026-11-20T13:00:00Z"),
    online: false,
    placeName: "Birmingham",
    seriesId: null,
    ...overrides
  };
}

describe("scoreRecommendations", () => {
  const prayer = candidate({
    id: "prayer",
    title: "Lunchtime prayer at Carrs Lane",
    organisationName: "Carrs Lane Church",
    category: "Christian"
  });
  const iod = candidate({
    id: "iod",
    title: "IoD West Midlands lunch",
    organisationName: "IoD West Midlands",
    category: "Professional",
    startsAt: new Date("2026-11-21T12:00:00Z")
  });
  const mixer = candidate({
    id: "mixer",
    title: "Birmingham Tech Meetup — lightning talks",
    organisationName: "Birmingham Tech Meetup",
    category: "Meetup"
  });

  it("recommends the same type after someone booked, with a because-you-booked reason", () => {
    const signals: TasteSignal[] = [
      {
        eventId: "sunday",
        title: "Sunday gathering at St Philip’s",
        organisationName: "St Philip’s Cathedral",
        category: "Christian",
        kind: "committed"
      }
    ];
    const out = scoreRecommendations(signals, [prayer, iod]);
    expect(out[0]?.id).toBe("prayer");
    expect(out[0]?.reason).toMatch(/booked Sunday gathering/i);
    expect(out.some((row) => row.id === "iod")).toBe(false);
  });

  it("recommends a neighbouring work type after they actually went", () => {
    const signals: TasteSignal[] = [
      {
        eventId: "breakfast",
        title: "Jewellery Quarter founders’ breakfast",
        organisationName: "Impact Hub Birmingham",
        category: "Networking",
        kind: "attended"
      }
    ];
    const out = scoreRecommendations(signals, [prayer, iod]);
    expect(out[0]?.id).toBe("iod");
    expect(out[0]?.reason).toMatch(/went to Jewellery Quarter/i);
  });

  it("keeps one row from a weekly series", () => {
    const signals: TasteSignal[] = [
      {
        eventId: "sunday",
        title: "Sunday gathering at St Philip’s",
        organisationName: "St Philip’s Cathedral",
        category: "Christian",
        kind: "committed"
      }
    ];
    const week1 = candidate({ id: "p1", title: "Lunchtime prayer", category: "Christian", seriesId: "seed-weekly-prayer" });
    const week2 = candidate({
      id: "p2",
      title: "Lunchtime prayer",
      category: "Christian",
      seriesId: "seed-weekly-prayer",
      startsAt: new Date("2026-11-27T12:00:00Z")
    });
    const out = scoreRecommendations(signals, [week1, week2]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("p1");
  });

  it("lets both a booking and an attended event count at once", () => {
    const signals: TasteSignal[] = [
      {
        eventId: "sunday",
        title: "Sunday gathering at St Philip’s",
        organisationName: "St Philip’s Cathedral",
        category: "Christian",
        kind: "committed"
      },
      {
        eventId: "open-mic",
        title: "Open mic at BCU",
        organisationName: "Birmingham City University",
        category: "Student",
        kind: "attended"
      }
    ];
    const out = scoreRecommendations(signals, [prayer, mixer]);
    expect(out.map((row) => row.id).sort()).toEqual(["mixer", "prayer"]);
  });

  it("boosts a loved event’s neighbours and drops a skipped type", () => {
    const loved: TasteSignal[] = [
      {
        eventId: "open-mic",
        title: "Open mic at BCU",
        organisationName: "Birmingham City University",
        category: "Student",
        kind: "loved"
      }
    ];
    const liked = scoreRecommendations(loved, [mixer, iod]);
    expect(liked[0]?.id).toBe("mixer");

    const skipped: TasteSignal[] = [{ ...loved[0], kind: "skipped" }];
    const avoided = scoreRecommendations(skipped, [mixer, iod]);
    expect(avoided.some((row) => row.id === "mixer")).toBe(false);
  });
});
