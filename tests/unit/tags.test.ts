import { describe, expect, it } from "vitest";
import { TAGS, tagChipLabel } from "@/lib/constants";
import { inferCategory } from "@/lib/scraper/categorise";
import { encodeTags, inferTags, shelfForStoredCategory, withCostDefault } from "@/lib/tags";

describe("tag chips", () => {
  it("draws a mark in front of every tag word", () => {
    for (const tag of TAGS) {
      const label = tagChipLabel(tag);
      expect(label.endsWith(tag)).toBe(true);
      expect(label.length).toBeGreaterThan(tag.length + 1);
    }
  });
});

describe("inferTags", () => {
  it("adds Meetup only for the Meetup site, and keeps a search word off the shelf", () => {
    const devops = inferCategory({
      host: "www.meetup.com",
      title: "DevOps Society - The Human API Workshop",
      organisationName: "DevOps Society",
      pageUrl: "https://www.meetup.com/find/?keywords=christian&location=gb--Birmingham"
    });
    const tags = inferTags({
      host: "www.meetup.com",
      title: "DevOps Society - The Human API Workshop",
      organisationName: "DevOps Society",
      externalUrl: "https://www.meetup.com/devops-society/events/1/",
      online: false
    });
    expect(devops.category).toBe("Social");
    expect(tags).toContain("Meetup");
    expect(tags).toContain("Learning");
    expect(tags).toContain("In Person");
    expect(tags).not.toContain("Christian");
  });

  it("puts a prayer night on Faith with Church and defaults attendance and cost tags", () => {
    expect(
      inferCategory({ title: "Sunday prayer night", organisationName: "City Church" }).category
    ).toBe("Faith");
    const tags = inferTags({
      title: "Sunday prayer night",
      organisationName: "City Church",
      notes: "Free entry",
      online: true
    });
    expect(tags).toEqual(expect.arrayContaining(["Church", "Free", "Online"]));
    expect(tags).not.toContain("Fee");
    expect(tags).not.toContain("In Person");
  });

  it("labels events related to different faiths and spiritual practices from event content", () => {
    const tags = inferTags({
      title: "Mantra meditation and sound healing",
      organisationName: "Community wellbeing group",
      notes: "Learn sacred mantra meditation. Source feed: https://example.test/find?keywords=football",
      online: false
    });
    expect(tags).toEqual(expect.arrayContaining(["Spirituality", "Learning", "Free", "In Person"]));
    expect(tags).not.toContain("Fitness");
    expect(tags).not.toContain("Christian");

    const interfaith = inferTags({
      title: "40 Hadith of Imam al-Nawawi",
      organisationName: "Womens Muslim College",
      online: false
    });
    expect(interfaith).toContain("Spirituality");
    expect(interfaith).not.toContain("Christian");
  });

  it("does not infer faith tags from a venue or a search-feed keyword", () => {
    const tags = inferTags({
      title: "Boardgame social night",
      organisationName: "Warwickshire Boardgame Club",
      notes: "Meet in St Michael's Church Hall. Source feed: https://meetup.com/find?keywords=church",
      online: false
    });
    expect(tags).toContain("Free");
    expect(tags).not.toContain("Church");
    expect(tags).not.toContain("Spirituality");
  });

  it("recognises university and student society hosts but not a university venue", () => {
    const society = inferTags({
      title: "Committee to Career",
      organisationName: "guildofstudents.com",
      externalUrl: "https://www.guildofstudents.com/ents/event/1/",
      notes: "A scheme for committee members.",
      online: false
    });
    const venueOnly = inferTags({
      title: "Community football",
      organisationName: "Birmingham Football",
      notes: "The pitch is at Aston University.",
      online: false
    });
    expect(society).toContain("University");
    expect(venueOnly).not.toContain("University");
  });

  it("defaults cost to Free and uses Fee only for required payment evidence", () => {
    const freeBrand = inferTags({
      title: "90s Dance Anthems Day Party",
      organisationName: "Set U Free Events",
      online: false
    });
    const paid = inferTags({
      title: "Boardgame night",
      organisationName: "Community group",
      notes: "There is a £3 fee per night. Car parking is FREE.",
      online: false
    });
    const optional = inferTags({
      title: "Creative session",
      organisationName: "Community group",
      notes: "Attendance is free. Optional activities can be paid for on the day.",
      online: false
    });
    const zeroPrice = inferTags({
      title: "Free community service",
      organisationName: "Community group",
      notes: "Price: 0 USD",
      online: false
    });
    expect(freeBrand).toContain("Free");
    expect(freeBrand).not.toContain("Fee");
    expect(paid).toContain("Fee");
    expect(paid).not.toContain("Free");
    expect(optional).toContain("Free");
    expect(optional).not.toContain("Fee");
    expect(zeroPrice).toContain("Free");
    expect(withCostDefault(["Free", "In Person"], "Cost: $20 per session")).toEqual(["In Person", "Fee"]);
    expect(withCostDefault(["Fee", "In Person"], "")).toEqual(["In Person", "Fee"]);
  });

  it("does not tag a campaign walk as fitness", () => {
    const tags = inferTags({
      title: "Reclaim the Night Walk",
      organisationName: "Sandwell Stands",
      notes: "A peaceful solidarity walk against violence and harassment.",
      online: false
    });
    expect(tags).not.toContain("Fitness");
    expect(tags).toContain("Free");
  });

  it("does not mistake ordinary event wording for fitness or networking", () => {
    const technicalTalk = inferTags({
      title: "Microsoft Ignite Online",
      organisationName: "Microsoft Reactor",
      notes: "Learn how to run, scale and govern AI workloads in production.",
      online: true
    });
    const comedy = inferTags({
      title: "Live Stand Up Comedy Gong Show",
      organisationName: "Third Eye Comedy Events",
      notes: "A networking group meets in another room before the show.",
      online: false
    });
    expect(technicalTalk).not.toContain("Fitness");
    expect(comedy).not.toContain("Networking");
  });
});

describe("shelfForStoredCategory", () => {
  it("moves the old shelves and keeps meetup.com as a sticker", () => {
    expect(shelfForStoredCategory("Networking", null, false)).toEqual({
      category: "Professional",
      tags: ["Networking", "In Person"]
    });
    expect(shelfForStoredCategory("Student", null, false).category).toBe("Social");
    expect(shelfForStoredCategory("Student", null, false).tags).toContain("University");
    expect(shelfForStoredCategory("Christian", null, false).tags).toContain("Christian");
    const meetup = shelfForStoredCategory("Meetup", "https://www.meetup.com/group/events/1", true);
    expect(meetup.category).toBe("Social");
    expect(meetup.tags).toContain("Meetup");
    expect(meetup.tags).toContain("Online");
    expect(encodeTags(["Online", "Meetup"])).toBe("|Meetup|Online|");
  });
});
