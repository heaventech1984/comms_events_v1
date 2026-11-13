import { TAGS, type Category, type Tag } from "./constants";

const ATTENDANCE: Tag[] = ["In Person", "Online"];

/** Stored form is |Christian|In Person| so a search cannot match the middle of another word. */
export function encodeTags(tags: readonly string[]): string {
  const wanted = new Set(tags);
  const kept = TAGS.filter((tag) => wanted.has(tag));
  return kept.length ? `|${kept.join("|")}|` : "";
}

export function decodeTags(raw: string | null | undefined): Tag[] {
  if (!raw) return [];
  return raw.split("|").filter((part): part is Tag => (TAGS as readonly string[]).includes(part));
}

export function parseTagsParam(value: string | undefined): Tag[] {
  if (!value) return [];
  const wanted = new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part): part is Tag => (TAGS as readonly string[]).includes(part))
  );
  return TAGS.filter((tag) => wanted.has(tag));
}

export function toggleTag(selected: Tag[], tag: Tag): Tag[] {
  const next = new Set(selected);
  if (next.has(tag)) next.delete(tag);
  else next.add(tag);
  return TAGS.filter((item) => next.has(item));
}

/** The online yes/no owns In Person and Online. Other stickers stay. */
export function withAttendance(tags: readonly Tag[], online: boolean): Tag[] {
  const rest = tags.filter((tag) => !ATTENDANCE.includes(tag));
  return [...rest, online ? "Online" : "In Person"];
}

export function tagsWhere(selected: Tag[]): { OR: { tags: { contains: string } }[] } | undefined {
  if (!selected.length) return undefined;
  return { OR: selected.map((tag) => ({ tags: { contains: `|${tag}|` } })) };
}

export function hasAnyTag(stored: string | null | undefined, selected: Tag[]): boolean {
  if (!selected.length) return true;
  const raw = stored ?? "";
  return selected.some((tag) => raw.includes(`|${tag}|`));
}

function hostOf(value?: string | null): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^www\./, "");
  }
}

/** Meetup the website, not the old shelf of the same name. */
export function isMeetupSite(hostOrUrl?: string | null): boolean {
  const host = hostOf(hostOrUrl);
  return host === "meetup.com" || host.endsWith(".meetup.com");
}

const TAG_RULES: { tag: Tag; pattern: RegExp }[] = [
  { tag: "Christian", pattern: /\b(christian|jesus|gospel|catholic|baptist|bible|anglican|pentecostal|evangelical)\b/i },
  { tag: "Church", pattern: /\b(church|cathedral|chapel|parish|eucharist|sermon|liturgy|worship|mass)\b/i },
  { tag: "Spirituality", pattern: /\b(spirituality|spiritual)\b/i },
  { tag: "Philosophy", pattern: /\bphilosoph/i },
  { tag: "University", pattern: /\b(university|student|students|campus|freshers|undergraduate|guild of students)\b/i },
  { tag: "Family-Friendly", pattern: /\b(family-friendly|family friendly|family|kids|children)\b/i },
  { tag: "Networking", pattern: /\b(networking|founders|startup|start-up|coworking)\b/i },
  { tag: "Music", pattern: /\b(music|choir|concert|\bgig\b|open mic)\b/i },
  { tag: "Fitness", pattern: /\b(fitness|gym|yoga|sport|running|\brun\b|\bwalk\b|hiking|football)\b/i },
  { tag: "Learning", pattern: /\b(learning|workshop|lecture|masterclass|(?<!of\s)course)\b/i },
  { tag: "Creative", pattern: /\b(creative|\bart\b|craft|poetry|theatre|theater)\b/i }
];

/**
 * Stickers from the title and organisation already in hand.
 * Meetup is the only sticker that comes from the website name.
 * No extra page is opened.
 */
export function inferTags(input: {
  host?: string | null;
  externalUrl?: string | null;
  title: string;
  organisationName: string;
  notes?: string | null;
  online: boolean;
}): Tag[] {
  const hay = `${input.title} ${input.organisationName}`;
  const priceHay = `${hay} ${input.notes ?? ""}`;
  const tags: Tag[] = [];
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(hay)) tags.push(rule.tag);
  }
  if (isMeetupSite(input.host) || isMeetupSite(input.externalUrl)) tags.push("Meetup");
  const saysFree = /\bfree\b/i.test(priceHay);
  const saysFee = /[£$]\s?\d|\bfee\b|\bpaid\b|\btickets?\b/i.test(priceHay);
  if (saysFree && !saysFee) tags.push("Free");
  if (saysFee && !saysFree) tags.push("Fee");
  return withAttendance(tags, input.online);
}

/**
 * Move an old shelf onto the new one.
 * Networking becomes Professional plus a Networking sticker.
 * Student becomes Social plus a University sticker.
 * The old Meetup shelf becomes Social. The Meetup sticker is only for meetup.com.
 */
export function shelfForStoredCategory(
  category: string,
  externalUrl: string | null | undefined,
  online: boolean
): { category: Category; tags: Tag[] } {
  const tags: Tag[] = [];
  if (isMeetupSite(externalUrl)) tags.push("Meetup");
  let next: Category = "Social";
  if (category === "Social" || category === "Professional" || category === "Faith" || category === "Activities") {
    next = category;
  } else if (category === "Christian") {
    next = "Faith";
    tags.push("Christian");
  } else if (category === "Networking") {
    next = "Professional";
    tags.push("Networking");
  } else if (category === "Professional") {
    next = "Professional";
  } else if (category === "Student") {
    next = "Social";
    tags.push("University");
  }
  return { category: next, tags: withAttendance(tags, online) };
}
