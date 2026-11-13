import type { Category } from "../constants";
import {
  MAX_PRIORITY_URLS,
  MEETUP_BIRMINGHAM_FIND_URL,
  STARTER_PRIORITY_URL,
  parsePriorityUrls
} from "./allowlist";

/**
 * Frozen Birmingham + West Midlands discovery pack (Nov 2026 stretch).
 * Probe before seeding; Priority URL cap is MAX_PRIORITY_URLS (90).
 * Christian calendars are listed first so a real church listing keeps its own source URL.
 * The event type still comes from the title, not from the search page.
 */
export type DiscoveryCandidate = {
  url: string;
  category: Category;
  label: string;
};

const EB = "https://www.eventbrite.co.uk/d/united-kingdom--birmingham";
const MU = "https://www.meetup.com/find/";
const AE = "https://allevents.in";

function meetup(keywords: string, category: Category, label?: string): DiscoveryCandidate {
  return {
    url: `${MU}?keywords=${encodeURIComponent(keywords)}&location=gb--Birmingham`,
    category,
    label: label ?? `Meetup ${keywords}`
  };
}

function ebCity(city: string, path: string, category: Category, label: string): DiscoveryCandidate {
  return {
    url: `https://www.eventbrite.co.uk/d/united-kingdom--${city}/${path}`,
    category,
    label
  };
}

export const DISCOVERY_PACK: DiscoveryCandidate[] = [
  // —— Christian primary calendars (first — first-wins dedupe) ——
  // Cathedral what’s-on exposes schema.org Event JSON-LD (iCal endpoints return 403 to bots).
  { url: STARTER_PRIORITY_URL, category: "Faith", label: "Cathedral what’s-on" },
  {
    url: "https://www.achurchnearyou.com/church/7326/service-and-events/events-all/",
    category: "Faith",
    label: "A Church Near You (cathedral parish)"
  },
  { url: `${EB}/religion-and-spirituality--events/`, category: "Faith", label: "EB Brum religion" },
  { url: `${EB}/christianity--events/`, category: "Faith", label: "EB Brum christianity" },
  {
    url: "https://www.eventbrite.com/d/united-kingdom--birmingham/religion-and-spirituality--events/",
    category: "Faith",
    label: "EB.com Brum religion"
  },
  ebCity("solihull", "religion-and-spirituality--events/", "Faith", "EB Solihull religion"),
  ebCity("wolverhampton", "religion-and-spirituality--events/", "Faith", "EB Wolves religion"),
  ebCity("coventry", "religion-and-spirituality--events/", "Faith", "EB Coventry religion"),
  { url: `${AE}/birmingham-uk/religious`, category: "Faith", label: "Allevents Brum religious" },
  { url: `${AE}/solihull/religious`, category: "Faith", label: "Allevents Solihull religious" },
  { url: `${AE}/coventry/religious`, category: "Faith", label: "Allevents Coventry religious" },
  meetup("christian", "Faith"),
  meetup("church", "Faith"),
  meetup("prayer", "Faith"),
  meetup("bible", "Faith"),
  meetup("bible study", "Faith"),
  meetup("worship", "Faith"),
  meetup("worship night", "Faith"),
  meetup("gospel", "Faith"),
  meetup("faith", "Faith"),
  meetup("jesus", "Faith"),
  meetup("catholic", "Faith"),
  meetup("anglican", "Faith"),
  meetup("baptist", "Faith"),
  meetup("pentecostal", "Faith"),
  meetup("evangelical", "Faith"),
  meetup("sunday service", "Faith"),
  meetup("youth church", "Faith"),
  meetup("alpha course", "Faith"),
  meetup("praise", "Faith"),
  meetup("fellowship", "Faith"),
  // Extra Christian primary (ACNY parish page — keep for when Event nodes appear; Cathedral what’s-on is the working JSON-LD primary).

  // —— Student primary (MSL event cards on allowlisted Guild host) ——
  {
    url: "https://www.guildofstudents.com/events/",
    category: "Social",
    label: "Guild of Students events"
  },
  {
    url: "https://www.bcusu.com/eventscalendar/",
    category: "Social",
    label: "BCU SU event calendar"
  },

  // —— Networking ——
  {
    url: "https://luma.com/calendar/cal-S60usgWCdXX9MLP",
    category: "Professional",
    label: "Luma reference calendar"
  },
  { url: `${EB}/networking--events/`, category: "Professional", label: "EB networking" },
  { url: `${EB}/startups--events/`, category: "Professional", label: "EB startups" },
  meetup("networking", "Professional"),
  meetup("startup", "Professional"),
  meetup("founders", "Professional"),
  meetup("coworking", "Professional"),
  meetup("entrepreneur", "Professional"),

  // —— Professional ——
  { url: `${EB}/professional--events/`, category: "Professional", label: "EB professional" },
  { url: `${EB}/career--events/`, category: "Professional", label: "EB career" },
  { url: `${AE}/birmingham-uk/business`, category: "Professional", label: "Allevents business" },
  meetup("professional", "Professional"),
  meetup("business", "Professional"),
  meetup("tech", "Professional"),
  meetup("marketing", "Professional"),
  meetup("finance", "Professional"),

  // —— Student ——
  { url: `${EB}/school--events/`, category: "Social", label: "EB school" },
  { url: `${EB}/family-and-education--events/`, category: "Social", label: "EB education" },
  { url: `${AE}/birmingham-uk/education`, category: "Social", label: "Allevents education" },
  meetup("student", "Social"),
  meetup("university", "Social"),
  meetup("freshers", "Social"),

  // —— Volume / Meetup / West Midlands ——
  { url: MEETUP_BIRMINGHAM_FIND_URL, category: "Social", label: "Meetup Birmingham find" },
  {
    url: `${MU}?source=EVENTS&location=gb--Birmingham&distance=tenMiles`,
    category: "Social",
    label: "Meetup 10 miles"
  },
  { url: `${EB}/all-events/`, category: "Social", label: "EB Brum all" },
  ebCity("solihull", "all-events/", "Social", "EB Solihull all"),
  ebCity("wolverhampton", "all-events/", "Social", "EB Wolves all"),
  ebCity("coventry", "all-events/", "Social", "EB Coventry all"),
  ebCity("dudley", "all-events/", "Social", "EB Dudley all"),
  ebCity("walsall", "all-events/", "Social", "EB Walsall all"),
  {
    url: "https://www.eventbrite.com/d/united-kingdom--birmingham/events/",
    category: "Social",
    label: "EB.com Brum events"
  },
  { url: `${AE}/birmingham-uk/all`, category: "Social", label: "Allevents Brum all" },
  { url: `${AE}/birmingham-uk/music`, category: "Social", label: "Allevents music" },
  { url: `${AE}/birmingham-uk/this-weekend`, category: "Social", label: "Allevents this weekend" },
  { url: `${AE}/solihull/all`, category: "Social", label: "Allevents Solihull" },
  { url: `${AE}/wolverhampton/all`, category: "Social", label: "Allevents Wolverhampton" },
  { url: `${AE}/walsall/all`, category: "Social", label: "Allevents Walsall" },
  { url: `${AE}/west-bromwich/all`, category: "Social", label: "Allevents West Brom" },
  { url: `${AE}/coventry/all`, category: "Social", label: "Allevents Coventry" },
  { url: `${AE}/sutton-coldfield/all`, category: "Social", label: "Allevents Sutton Coldfield" },
  { url: `${AE}/redditch/all`, category: "Social", label: "Allevents Redditch" },
  { url: `${AE}/cannock/all`, category: "Social", label: "Allevents Cannock" },
  { url: `${AE}/bromsgrove/all`, category: "Social", label: "Allevents Bromsgrove" },
  { url: `${AE}/lichfield/all`, category: "Social", label: "Allevents Lichfield" },
  { url: `${AE}/nuneaton/all`, category: "Social", label: "Allevents Nuneaton" },
  { url: `${AE}/kidderminster/all`, category: "Social", label: "Allevents Kidderminster" },
  { url: `${AE}/warwick/all`, category: "Social", label: "Allevents Warwick" },
  { url: `${AE}/stratford-upon-avon/all`, category: "Social", label: "Allevents Stratford" },
  // Far Midlands cities (Stoke / Leicester / Nottingham) dropped — geo quality over volume.
  { url: `${EB}/performing-and-visual-arts--events/`, category: "Social", label: "EB performing arts" },
  { url: `${EB}/health--events/`, category: "Social", label: "EB health" },
  { url: `${EB}/sports-and-fitness--events/`, category: "Social", label: "EB sports" },
  {
    url: "https://www.ticketmaster.co.uk/search?q=birmingham",
    category: "Social",
    label: "Ticketmaster Birmingham"
  },
  {
    url: "https://www.visitbirmingham.com/whats-on",
    category: "Social",
    label: "Visit Birmingham"
  },
  meetup("comedy", "Social"),
  meetup("music", "Social"),
  meetup("yoga", "Social"),
  meetup("board games", "Social"),
  meetup("hiking", "Social"),
  meetup("book club", "Social"),
  meetup("singles", "Social"),
  meetup("dance", "Social"),
  meetup("football", "Social"),
  meetup("parents", "Social"),
  meetup("lgbt", "Social"),
  meetup("ai", "Social")
];

export const DISCOVERY_PACK_URLS = DISCOVERY_PACK.map((row) => row.url);

/** Allowlist-filtered, capped Priority URL list — install this on empty Settings. */
export function frozenDiscoveryUrls(): string[] {
  return parsePriorityUrls(DISCOVERY_PACK_URLS).urls;
}

/**
 * Every Run now fetches the frozen Birmingham pack first, then any extra admin URLs.
 * Priority box is an addition (gap-filler), not the whole internet — still allowlist-only.
 */
export function mergeDiscoveryWithExtras(extras: string[]): string[] {
  const pack = frozenDiscoveryUrls();
  const seen = new Set(pack.map((u) => u.toLowerCase()));
  const merged = [...pack];
  for (const url of parsePriorityUrls(extras).urls) {
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(url);
  }
  return merged.slice(0, MAX_PRIORITY_URLS);
}

/** Strip frozen-pack URLs so Settings only stores gap-fillers (Guillaume: box is an addition). */
export function extrasOnlyPriorityUrls(urls: string[]): string[] {
  const pack = new Set(frozenDiscoveryUrls().map((u) => u.toLowerCase()));
  return parsePriorityUrls(urls).urls.filter((url) => !pack.has(url.toLowerCase()));
}
