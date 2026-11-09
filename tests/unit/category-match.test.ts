import { describe, expect, it } from "vitest";
import {
  categoryAffinity,
  editDistance,
  nearestCategoryFromText,
  tokenize,
  tokenOverlap
} from "@/lib/category-match";

describe("categoryAffinity", () => {
  it("treats the same type as a perfect match and neighbours as close", () => {
    expect(categoryAffinity("Networking", "Networking")).toBe(1);
    expect(categoryAffinity("Networking", "Professional")).toBeGreaterThan(0.6);
    expect(categoryAffinity("Christian", "Professional")).toBeLessThan(0.2);
  });
});

describe("editDistance", () => {
  it("counts a one-letter slip or a swapped pair", () => {
    expect(editDistance("christian", "christain")).toBe(1);
    expect(editDistance("professional", "profesional")).toBe(1);
  });
});

describe("tokenize / tokenOverlap", () => {
  it("ignores small glue words and treats close spellings as the same", () => {
    expect(tokenize("Lunchtime prayer at Carrs Lane")).toContain("prayer");
    expect(tokenOverlap("Open mic at BCU", "Open-mic night BCU")).toBeGreaterThan(0.4);
    expect(tokenOverlap("Sunday gathering", "IoD West Midlands lunch")).toBeLessThan(0.2);
  });
});

describe("nearestCategoryFromText", () => {
  it("maps synonyms and near-miss spellings onto a Gather type", () => {
    expect(nearestCategoryFromText("Christain prayer night")).toBe("Christian");
    expect(nearestCategoryFromText("Profesional board lunch")).toBe("Professional");
    expect(nearestCategoryFromText("Campus freshers social")).toBe("Student");
    expect(nearestCategoryFromText("Community gathering")).toBeNull();
  });
});
