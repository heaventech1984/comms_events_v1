import { TAGS, type Category, type Tag } from "./constants";
import { stripHtml } from "./scraper/text";

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

function tagEvidence(value: string | null | undefined): string {
  return stripHtml(value ?? "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:source feed|gather guessed this type)\s*:/i.test(line))
    .join(" ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPaidEvidence(value: string): boolean {
  const clauses = value
    .replace(/\b(?:optional|donation|parking)\b[^.!?\n]*(?:[.!?\n]|$)/gi, " ")
    .split(/[.!?\n|]+/)
    .filter((clause) => clause.trim());
  const requiredPayment = /\b(?:paid event|paid course|entry fee|admission fee|fee\s*:|fee per|costs? to attend|pay to attend|pay via|pay on the day|payment required)\b/i;
  const amount = /(?:£|\$)\s?(\d+(?:[.,]\d{1,2})?)|\b(\d+(?:[.,]\d{1,2})?)\s?(?:GBP|USD|EUR)\b/gi;
  const priceContext = /\b(ticket|admission|entry|price|cost|fee|per person|per session|per night|registration)\b/i;
  return clauses.some((clause) => {
    if (requiredPayment.test(clause)) return true;
    return (
      priceContext.test(clause) &&
      [...clause.matchAll(amount)].some((match) => Number((match[1] ?? match[2]).replace(",", ".")) > 0)
    );
  });
}

/** Default cost sticker: Fee when a required price is stated, otherwise Free. */
export function withCostDefault(tags: readonly Tag[], evidence: string): Tag[] {
  const rest = tags.filter((tag) => tag !== "Free" && tag !== "Fee");
  const paid = tags.includes("Fee") || hasPaidEvidence(evidence);
  return [...rest, paid ? "Fee" : "Free"];
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

const TOPIC_RULES: { tag: Tag; pattern: RegExp }[] = [
  { tag: "Christian", pattern: /\b(christian|jesus|gospel|catholic|baptist|bible|anglican|pentecostal|evangelical|eucharist|communion|carol service|christmas carols?)\b/i },
  { tag: "Spirituality", pattern: /\b(faith|religion|religious|spirituality|spiritual|worship|prayer|bible|jesus|gospel|eucharist|sermon|liturgy|mass|evensong|islam|muslim|qur.?an|hadith|imam|mosque|masjid|ramadan|hajj|hindu(?:ism)?|puja|diwali|sikh|gurdwara|kirtan|buddhis(?:m|t)|dharma|judaism|jewish|synagogue|torah|rabbi|shabbat|bahai|jain(?:ism)?|zoroastrian|tao(?:ism|ist)|shinto|confucian|sacred|meditation|mantra|reiki|sound healing|mindfulness)\b/i },
  { tag: "Philosophy", pattern: /\bphilosoph/i },
  { tag: "Family-Friendly", pattern: /\b(all ages|family[- ]friendly|family event|families welcome|children welcome|kids welcome|for children|for kids|parents and children|breakfast with santa|santa's grotto|christmas grotto)\b/i },
  { tag: "Networking", pattern: /\b(networking|professional network|founders meetup|startup|start-up|coworking|business connections)\b/i },
  { tag: "Music", pattern: /\b(music|choir|concert|\bgig\b|open mic|recital|live singer|live music|band|dj|carols?|electro pop|dance anthems)\b/i },
  { tag: "Fitness", pattern: /\b(fitness|gym|yoga|sport|running|\brun\b|\bwalk\b|hiking|football|futsal|training session)\b/i },
  { tag: "Learning", pattern: /\b(learning|learn|workshop|lecture|masterclass|course|taster (?:session|lesson)|skills fest|training|study|teach(?:er|ing)?|webinar|tutorial|educational|practice english|advocacy)\b/i },
  { tag: "Creative", pattern: /\b(creative|\bart\b|craft|poetry|theatre|theater|murder mystery|exhibition|photography|creative writing)\b/i }
];

/** Infer topic stickers from event content; use organiser and source only for host/provenance labels. */
export function inferTags(input: {
  host?: string | null;
  externalUrl?: string | null;
  title: string;
  organisationName: string;
  notes?: string | null;
  online: boolean;
}): Tag[] {
  const title = tagEvidence(input.title);
  const content = tagEvidence(input.notes);
  const eventText = `${title} ${content}`;
  const organisation = tagEvidence(input.organisationName);
  const tags: Tag[] = [];
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(eventText)) tags.push(rule.tag);
  }

  const universityHost = /\b(universit(?:y|ies)|guild of students|guildofstudents|students?['’]? union|students?union|student society|student[- ]led|hosted by students)\b/i;
  const localUniversitySociety = /\b(?:uob|bcu)\b.{0,60}\b(?:society|student|guild|union)\b/i;
  if (
    universityHost.test(organisation) ||
    universityHost.test(title) ||
    universityHost.test(hostOf(input.externalUrl)) ||
    localUniversitySociety.test(organisation) ||
    localUniversitySociety.test(title) ||
    /\b(?:hosted|organised|organized|presented) by [^.\n]{0,100}\buniversit(?:y|ies)\b/i.test(content)
  ) {
    tags.push("University");
  }

  const churchHosted = /\b(church|cathedral|chapel|parish)\b/i.test(organisation);
  const churchNamedInEvent = /\b(church|cathedral|chapel|parish)\b/i.test(title);
  const churchActivity = /\b(service|prayer|worship|communion|mass|evensong|carols?|fayre|fellowship|bible study|eucharist|sermon|liturgy)\b/i.test(eventText);
  const clearlyChurchWorship = /\b(eucharist|holy communion|evensong|morning prayer|sung service|church service|sermon|liturgy)\b/i.test(eventText);
  if (((churchNamedInEvent || churchHosted) && churchActivity) || clearlyChurchWorship || (tags.includes("Christian") && /\b(worship|prayer|carols?)\b/i.test(eventText))) {
    tags.push("Church");
  }
  if ((((churchNamedInEvent || churchHosted) && churchActivity) || clearlyChurchWorship) && !tags.includes("Spirituality")) {
    tags.push("Spirituality");
  }

  if (/\b(protest|campaign|solidarity|reclaim the night|march against|awareness walk)\b/i.test(eventText)) {
    const fitnessIndex = tags.indexOf("Fitness");
    if (fitnessIndex >= 0) tags.splice(fitnessIndex, 1);
  }
  if (/\b(v|vs|versus)\b/i.test(title) && /\b(league|premier league|stadium|park)\b/i.test(eventText)) {
    const fitnessIndex = tags.indexOf("Fitness");
    if (fitnessIndex >= 0) tags.splice(fitnessIndex, 1);
  }

  if (isMeetupSite(input.host) || isMeetupSite(input.externalUrl)) tags.push("Meetup");
  return withAttendance(withCostDefault(tags, `${title}\n${content}`), input.online);
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
