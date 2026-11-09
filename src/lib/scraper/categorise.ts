import { nearestCategoryFromText } from "../category-match";
import { CATEGORIES, type Category } from "../constants";

export const TYPE_REVIEW_NOTE = "Gather could not infer the event type. Please set it before publishing.";

/** Soft hint only — admin should confirm before Publish. */
export const TYPE_WEAK_NOTE =
  "Gather guessed this type from the feed page (not the event title). Please confirm before publishing.";

const HOST_CATEGORY: Record<string, Category> = {
  "birminghamcathedral.com": "Christian",
  "www.birminghamcathedral.com": "Christian",
  "carrslane.co.uk": "Christian",
  "www.carrslane.co.uk": "Christian",
  "meetup.com": "Meetup",
  "www.meetup.com": "Meetup",
  "birmingham.ac.uk": "Student",
  "www.birmingham.ac.uk": "Student",
  "bcu.ac.uk": "Student",
  "www.bcu.ac.uk": "Student",
  "bcusu.com": "Student",
  "www.bcusu.com": "Student",
  "guildofstudents.com": "Student",
  "www.guildofstudents.com": "Student",
  "iod.com": "Professional",
  "www.iod.com": "Professional",
  "greaterbirminghamchambers.com": "Professional",
  "www.greaterbirminghamchambers.com": "Professional",
  "birmingham.impacthub.net": "Networking",
  "digbethdiningclub.com": "Meetup",
  "www.digbethdiningclub.com": "Meetup",
  "aston.ac.uk": "Student",
  "www.aston.ac.uk": "Student",
  "astonsu.com": "Student",
  "www.astonsu.com": "Student",
  "eventbrite.co.uk": "Meetup",
  "www.eventbrite.co.uk": "Meetup",
  "eventbrite.com": "Meetup",
  "www.eventbrite.com": "Meetup",
  "luma.com": "Networking",
  "www.luma.com": "Networking",
  "lu.ma": "Networking",
  "visitbirmingham.com": "Meetup",
  "www.visitbirmingham.com": "Meetup",
  "skiddle.com": "Meetup",
  "www.skiddle.com": "Meetup",
  "allevents.in": "Meetup",
  "www.allevents.in": "Meetup",
  "ticketmaster.co.uk": "Meetup",
  "www.ticketmaster.co.uk": "Meetup",
  "achurchnearyou.com": "Christian",
  "www.achurchnearyou.com": "Christian"
};

/** Aggregators whose host alone is too coarse — prefer the Priority URL path/query. */
const AGGREGATOR_HOSTS = new Set([
  "meetup.com",
  "www.meetup.com",
  "eventbrite.co.uk",
  "www.eventbrite.co.uk",
  "eventbrite.com",
  "www.eventbrite.com",
  "visitbirmingham.com",
  "www.visitbirmingham.com",
  "skiddle.com",
  "www.skiddle.com",
  "allevents.in",
  "www.allevents.in",
  "ticketmaster.co.uk",
  "www.ticketmaster.co.uk"
]);

const KEYWORDS: { pattern: RegExp; category: Category }[] = [
  {
    pattern:
      /\b(church|cathedral|eucharist|prayer|worship|mass|gospel|christian|jesus|catholic|baptist|bible|fellowship|alpha course|chapel|parish|sermon|anglican|liturgy|faith)\b/i,
    category: "Christian"
  },
  { pattern: /\b(student|university|freshers|careers fair|su\b|guild of students|campus|undergraduate)\b/i, category: "Student" },
  {
    pattern: /\b(iod|chamber|director|export|professional|career|surveyor|licensed property|cpd|leadership)\b/i,
    category: "Professional"
  },
  { pattern: /\b(founders|networking|breakfast|impact hub|startup|start-up|coworking)\b/i, category: "Networking" },
  { pattern: /\b(meetup|open mic|walk|mixer|social)\b/i, category: "Meetup" }
];

const PAGE_HINTS: { pattern: RegExp; category: Category }[] = [
  {
    pattern:
      /religion|spiritual|christian|church|cathedral|worship|gospel|religious|jesus|catholic|baptist|pentecostal|evangelical|bible|praise|fellowship|alpha|anglican/i,
    category: "Christian"
  },
  { pattern: /network|startup|start-up|founders|coworking/i, category: "Networking" },
  { pattern: /professional|career|business|director|chamber|export|government/i, category: "Professional" },
  { pattern: /student|school|education|university|freshers|family-and-education/i, category: "Student" }
];

export type InferStrength = "strong" | "weak" | "none";

/** Read the Priority URL path/query (e.g. Eventbrite /professional--events/ or Meetup keywords=). */
export function categoryFromPageUrl(pageUrl?: string | null): Category | null {
  if (!pageUrl) return null;
  let hay = pageUrl;
  try {
    const u = new URL(pageUrl);
    hay = `${u.pathname}?${u.searchParams.toString()}`;
  } catch {
    // keep raw
  }
  for (const row of PAGE_HINTS) {
    if (row.pattern.test(hay)) return row.category;
  }
  return null;
}

function keywordCategory(title: string, organisationName: string): Category | null {
  const haystack = `${title} ${organisationName}`;
  for (const row of KEYWORDS) {
    if (row.pattern.test(haystack)) return row.category;
  }
  return null;
}

/**
 * Infer Gather type.
 * - strong: primary host or title/org keyword (or page hint confirmed by keyword)
 * - weak: aggregator page slice only — keep as hint, flag for human review
 * - none: unknown — default Meetup + review
 */
export function inferCategory(input: {
  host?: string | null;
  title: string;
  organisationName: string;
  pageUrl?: string | null;
}): { category: Category; inferred: boolean; strength: InferStrength } {
  const host = input.host?.toLowerCase() ?? "";
  const fromPage = categoryFromPageUrl(input.pageUrl);
  const fromKeywords = keywordCategory(input.title, input.organisationName);

  if (host && HOST_CATEGORY[host] && !AGGREGATOR_HOSTS.has(host)) {
    return { category: HOST_CATEGORY[host], inferred: true, strength: "strong" };
  }

  if (fromPage && fromKeywords && fromPage === fromKeywords) {
    return { category: fromPage, inferred: true, strength: "strong" };
  }

  if (fromKeywords) {
    return { category: fromKeywords, inferred: true, strength: "strong" };
  }

  const fromApprox = nearestCategoryFromText(`${input.title} ${input.organisationName}`);
  if (fromApprox) {
    // One-letter slips are a guess — keep them in the pending queue for a person to confirm.
    return { category: fromApprox, inferred: true, strength: "weak" };
  }

  // Aggregator slice alone is a soft guess — human should confirm.
  if (fromPage && AGGREGATOR_HOSTS.has(host)) {
    return { category: fromPage, inferred: true, strength: "weak" };
  }

  if (fromPage) {
    return { category: fromPage, inferred: true, strength: "weak" };
  }

  if (host && HOST_CATEGORY[host]) {
    return { category: HOST_CATEGORY[host], inferred: true, strength: "weak" };
  }

  return { category: CATEGORIES[4], inferred: false, strength: "none" };
}
