import type { ScrapedEvent } from "./types";

/**
 * Keep events that look like Birmingham / West Midlands (or online).
 * Like only pinning notices for your neighbourhood on the kitchen board.
 */

/** Rough West Midlands bounding box (covers Brum, Solihull, Wolves, Coventry, Walsall, etc.). */
export const WM_LAT_MIN = 52.25;
export const WM_LAT_MAX = 52.72;
export const WM_LNG_MIN = -2.35;
export const WM_LNG_MAX = -1.25;

const LOCAL_PLACE =
  /\b(birmingham|brum|digbeth|jewellery quarter|jewellery\s*quarter|solihull|sutton coldfield|west brom|west bromwich|wolverhampton|wolves|walsall|coventry|redditch|bromsgrove|cannock|lichfield|nuneaton|kidderminster|warwick|stratford|harborne|edgbaston|erdington|sparkbrook|selly oak|aston|smethwick|dudley|brierley hill|stourbridge|west midlands)\b/i;

const FAR_PLACE =
  /\b(london|manchester|leeds|liverpool|sheffield|bristol|edinburgh|glasgow|cardiff|newcastle|nottingham|leicester|stoke[-\s]?on[-\s]?trent|derby|oxford|cambridge|brighton|belfast|dublin|morocco|atlas mountains|new forest|darwen|wensleydale|high atlas)\b/i;

/** Primary hosts we trust even when place text is thin (their whole feed is local). */
const TRUSTED_PRIMARY_HOSTS = new Set([
  "birminghamcathedral.com",
  "www.birminghamcathedral.com",
  "carrslane.co.uk",
  "www.carrslane.co.uk",
  "birmingham.ac.uk",
  "www.birmingham.ac.uk",
  "bcu.ac.uk",
  "www.bcu.ac.uk",
  "bcusu.com",
  "www.bcusu.com",
  "guildofstudents.com",
  "www.guildofstudents.com",
  "aston.ac.uk",
  "www.aston.ac.uk",
  "astonsu.com",
  "www.astonsu.com",
  "achurchnearyou.com",
  "www.achurchnearyou.com",
  "visitbirmingham.com",
  "www.visitbirmingham.com"
]);

function hostOf(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function inWestMidlandsBox(lat: number, lng: number): boolean {
  return lat >= WM_LAT_MIN && lat <= WM_LAT_MAX && lng >= WM_LNG_MIN && lng <= WM_LNG_MAX;
}

export type GeoDecision = { keep: boolean; reason: string };

/**
 * Decide whether a scraped event belongs on Gather’s Birmingham board.
 * Online always kept. Trusted primary hosts kept. Far named cities dropped.
 */
export function geoKeepEvent(event: Pick<
  ScrapedEvent,
  "online" | "placeName" | "lat" | "lng" | "title" | "organisationName" | "fetchedFrom"
>): GeoDecision {
  if (event.online) return { keep: true, reason: "online" };

  const host = hostOf(event.fetchedFrom);
  if (TRUSTED_PRIMARY_HOSTS.has(host)) return { keep: true, reason: "trusted-primary-host" };

  const lat = event.lat;
  const lng = event.lng;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (inWestMidlandsBox(lat, lng)) return { keep: true, reason: "wm-bbox" };
    return { keep: false, reason: "outside-wm-bbox" };
  }

  const title = event.title ?? "";
  const placeName = event.placeName ?? "";
  const org = event.organisationName ?? "";
  const farTitle = FAR_PLACE.test(title);
  const farPlace = FAR_PLACE.test(placeName);
  const localVenue = LOCAL_PLACE.test(`${placeName} ${title}`);
  // Org name alone (e.g. “Birmingham Hiking Club”) must not keep a Morocco trip.
  if ((farTitle || farPlace) && !localVenue) {
    return { keep: false, reason: farTitle ? "far-title" : "far-place-name" };
  }
  if (localVenue) return { keep: true, reason: "local-place-name" };
  if (LOCAL_PLACE.test(org) && !farTitle && !farPlace) {
    return { keep: true, reason: "local-org-name" };
  }

  // Aggregator rows with no place: keep only when the feed URL itself is Birmingham-scoped.
  const feed = event.fetchedFrom ?? "";
  if (/birmingham|solihull|wolverhampton|coventry|walsall|west-brom|sutton-coldfield|redditch|bromsgrove|cannock|lichfield|nuneaton|kidderminster|warwick|stratford/i.test(feed)) {
    if (farTitle || farPlace) return { keep: false, reason: "far-title-on-brum-feed" };
    return { keep: true, reason: "birmingham-scoped-feed" };
  }

  return { keep: false, reason: "no-local-signal" };
}

export function filterLocalEvents(events: ScrapedEvent[]): {
  kept: ScrapedEvent[];
  droppedGeo: number;
} {
  const kept: ScrapedEvent[] = [];
  let droppedGeo = 0;
  for (const event of events) {
    if (geoKeepEvent(event).keep) kept.push(event);
    else droppedGeo += 1;
  }
  return { kept, droppedGeo };
}
