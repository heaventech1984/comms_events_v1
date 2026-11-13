import { describe, expect, it } from "vitest";
import { inferCategory } from "@/lib/scraper/categorise";
import { encodeTags, inferTags, shelfForStoredCategory } from "@/lib/tags";

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

  it("puts a prayer night on Faith with Church, and a free label only when the text says free", () => {
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
