import type { CSSProperties } from "react";
import type { Category } from "./constants";
import { CATEGORIES } from "./constants";

const ART: Record<Category, { src: string; label: string }> = {
  Social: { src: "/categories/meetup.svg", label: "Social" },
  Professional: { src: "/categories/professional.svg", label: "Professional" },
  Faith: { src: "/categories/christian.svg", label: "Faith" },
  Activities: { src: "/categories/student.svg", label: "Activities" }
};

export function categoryArt(category: string): { src: string; label: string } {
  if ((CATEGORIES as readonly string[]).includes(category)) {
    return ART[category as Category];
  }
  return { src: "/categories/meetup.svg", label: category || "Social" };
}

/** Soft wash for inline style — gentle tint of the category colour. */
export function categoryAccentStyle(colour: string | undefined): CSSProperties {
  const c = colour && /^#[0-9A-Fa-f]{6}$/.test(colour) ? colour : "#a8434d";
  return {
    ["--cat" as string]: c,
    ["--cat-soft" as string]: `color-mix(in srgb, ${c} 14%, white)`,
    ["--cat-mid" as string]: `color-mix(in srgb, ${c} 28%, white)`,
    ["--cat-edge" as string]: `color-mix(in srgb, ${c} 55%, white)`
  };
}
