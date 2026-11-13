import { nearestCategoryFromText } from "../category-match";
import { CATEGORIES, type Category } from "../constants";

export const TYPE_REVIEW_NOTE = "Gather could not infer the event type. Please set it before publishing.";

/** Soft hint only — admin should confirm before Publish. */
export const TYPE_WEAK_NOTE =
  "Gather guessed this type from the feed page (not the event title). Please confirm before publishing.";

const HOST_CATEGORY: Record<string, Category> = {
  "birminghamcathedral.com": "Faith",
  "www.birminghamcathedral.com": "Faith",
  "carrslane.co.uk": "Faith",
  "www.carrslane.co.uk": "Faith",
  "meetup.com": "Social",
  "www.meetup.com": "Social",
  "birmingham.ac.uk": "Social",
  "www.birmingham.ac.uk": "Social",
  "bcu.ac.uk": "Social",
  "www.bcu.ac.uk": "Social",
  "bcusu.com": "Social",
  "www.bcusu.com": "Social",
  "guildofstudents.com": "Social",
  "www.guildofstudents.com": "Social",
  "iod.com": "Professional",
  "www.iod.com": "Professional",
  "greaterbirminghamchambers.com": "Professional",
  "www.greaterbirminghamchambers.com": "Professional",
  "birmingham.impacthub.net": "Professional",
  "digbethdiningclub.com": "Social",
  "www.digbethdiningclub.com": "Social",
  "aston.ac.uk": "Social",
  "www.aston.ac.uk": "Social",
  "astonsu.com": "Social",
  "www.astonsu.com": "Social",
  "eventbrite.co.uk": "Social",
  "www.eventbrite.co.uk": "Social",
  "eventbrite.com": "Social",
  "www.eventbrite.com": "Social",
  "luma.com": "Professional",
  "www.luma.com": "Professional",
  "lu.ma": "Professional",
  "visitbirmingham.com": "Social",
  "www.visitbirmingham.com": "Social",
  "skiddle.com": "Social",
  "www.skiddle.com": "Social",
  "allevents.in": "Social",
  "www.allevents.in": "Social",
  "ticketmaster.co.uk": "Social",
  "www.ticketmaster.co.uk": "Social",
  "achurchnearyou.com": "Faith",
  "www.achurchnearyou.com": "Faith"
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
    category: "Faith"
  },
  {
    pattern: /\b(music|choir|concert|gig|yoga|fitness|gym|sport|run|walk|hike|hiking|dance|football|art|creative|poetry|theatre)\b/i,
    category: "Activities"
  },
  {
    pattern:
      /\b(iod|chamber|director|export|professional|careers?|surveyor|licensed property|cpd|leadership|founders|networking|breakfast|impact hub|startup|start-up|coworking)\b/i,
    category: "Professional"
  },
  {
    pattern: /\b(student|university|freshers|su\b|guild of students|campus|undergraduate|mixer|social|family)\b/i,
    category: "Social"
  }
];

const PAGE_HINTS: { pattern: RegExp; category: Category }[] = [
  {
    pattern:
      /religion|spiritual|christian|church|cathedral|worship|gospel|religious|jesus|catholic|baptist|pentecostal|evangelical|bible|praise|fellowship|alpha|anglican/i,
    category: "Faith"
  },
  { pattern: /sport|fitness|music|art|yoga|health/i, category: "Activities" },
  { pattern: /network|startup|start-up|founders|coworking|professional|career|business|director|chamber|export|government/i, category: "Professional" },
  { pattern: /student|school|education|university|freshers|family-and-education|social/i, category: "Social" }
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

/** True when the title or organisation itself names this type. A search-page URL does not count. */
export function textSupportsCategory(title: string, organisationName: string, category: Category): boolean {
  if (keywordCategory(title, organisationName) === category) return true;
  return nearestCategoryFromText(`${title} ${organisationName}`) === category;
}

/**
 * Infer Gather type.
 * - strong: primary host, title/org keyword, or a page hint the title agrees with
 * - weak: title is only a near-match — flag for later, do not add card buttons
 * - none: unknown — Social, and a flag for later
 * A search page never sets Faith, or any shelf, unless the title agrees.
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
    return { category: fromApprox, inferred: true, strength: "weak" };
  }

  if (host && HOST_CATEGORY[host]) {
    return { category: HOST_CATEGORY[host], inferred: true, strength: "strong" };
  }

  return { category: CATEGORIES[0], inferred: false, strength: "none" };
}
