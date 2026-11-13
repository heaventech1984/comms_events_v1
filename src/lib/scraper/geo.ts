import type { ScrapedEvent } from "./types";

/**
 * Keep events within a mile circle of Birmingham city centre (or online).
 * The city named on the page is the place we measure. A map pin on the page wins when one is present.
 * Like only pinning notices that come from inside a circle drawn around your front door.
 */

/** Victoria Square, the city centre. Not a setting. */
export const BIRMINGHAM_CENTRE = { lat: 52.4797, lng: -1.9027 };

export const DEFAULT_SCRAPE_RADIUS_MILES = 10;
export const MAX_SCRAPE_RADIUS_MILES = 40;

type PlacePin = { lat: number; lng: number };

/** Town centres. Longer names are matched first so "West Bromwich" is not read as something shorter. */
const TOWNS: { pin: PlacePin; names: string[]; urlBits: string[] }[] = [
  { pin: { lat: 52.57, lng: -1.824 }, names: ["sutton coldfield"], urlBits: ["sutton-coldfield", "sutton coldfield"] },
  { pin: { lat: 52.5187, lng: -1.9943 }, names: ["west bromwich", "west brom"], urlBits: ["west-bromwich", "west-brom"] },
  { pin: { lat: 52.49, lng: -1.912 }, names: ["jewellery quarter"], urlBits: ["jewellery-quarter"] },
  { pin: { lat: 52.442, lng: -1.936 }, names: ["selly oak"], urlBits: ["selly-oak"] },
  { pin: { lat: 52.479, lng: -2.121 }, names: ["brierley hill"], urlBits: ["brierley-hill"] },
  {
    pin: { lat: 52.1917, lng: -1.708 },
    names: ["stratford-upon-avon", "stratford upon avon", "stratford"],
    urlBits: ["stratford-upon-avon", "stratford"]
  },
  { pin: { lat: 52.5869, lng: -2.1287 }, names: ["wolverhampton", "wolves"], urlBits: ["wolverhampton"] },
  { pin: { lat: 52.3885, lng: -2.249 }, names: ["kidderminster"], urlBits: ["kidderminster"] },
  { pin: { lat: 52.523, lng: -1.468 }, names: ["nuneaton"], urlBits: ["nuneaton"] },
  { pin: { lat: 52.3358, lng: -2.0579 }, names: ["bromsgrove"], urlBits: ["bromsgrove"] },
  { pin: { lat: 52.6816, lng: -1.8255 }, names: ["lichfield"], urlBits: ["lichfield"] },
  { pin: { lat: 52.69, lng: -2.03 }, names: ["cannock"], urlBits: ["cannock"] },
  { pin: { lat: 52.3065, lng: -1.9457 }, names: ["redditch"], urlBits: ["redditch"] },
  { pin: { lat: 52.4068, lng: -1.5197 }, names: ["coventry"], urlBits: ["coventry"] },
  { pin: { lat: 52.4128, lng: -1.7781 }, names: ["solihull"], urlBits: ["solihull"] },
  { pin: { lat: 52.586, lng: -1.9829 }, names: ["walsall"], urlBits: ["walsall"] },
  { pin: { lat: 52.4927, lng: -1.9684 }, names: ["smethwick"], urlBits: ["smethwick"] },
  { pin: { lat: 52.5116, lng: -2.0811 }, names: ["dudley"], urlBits: ["dudley"] },
  { pin: { lat: 52.4569, lng: -2.148 }, names: ["stourbridge"], urlBits: ["stourbridge"] },
  { pin: { lat: 52.2819, lng: -1.5849 }, names: ["warwick"], urlBits: ["warwick"] },
  { pin: { lat: 52.459, lng: -1.95 }, names: ["harborne"], urlBits: ["harborne"] },
  { pin: { lat: 52.456, lng: -1.921 }, names: ["edgbaston"], urlBits: ["edgbaston"] },
  { pin: { lat: 52.523, lng: -1.838 }, names: ["erdington"], urlBits: ["erdington"] },
  { pin: { lat: 52.462, lng: -1.868 }, names: ["sparkbrook"], urlBits: ["sparkbrook"] },
  { pin: { lat: 52.475, lng: -1.884 }, names: ["digbeth"], urlBits: ["digbeth"] },
  { pin: { lat: 52.5, lng: -1.884 }, names: ["aston"], urlBits: ["aston"] },
  {
    pin: { lat: BIRMINGHAM_CENTRE.lat, lng: BIRMINGHAM_CENTRE.lng },
    names: ["birmingham", "brum"],
    urlBits: ["birmingham-uk", "birmingham"]
  }
];

const NAME_MATCHES = TOWNS.flatMap((town) => town.names.map((name) => ({ name, pin: town.pin }))).sort(
  (a, b) => b.name.length - a.name.length
);

const URL_MATCHES = TOWNS.flatMap((town) => town.urlBits.map((bit) => ({ bit, pin: town.pin }))).sort(
  (a, b) => b.bit.length - a.bit.length
);

const FAR_PLACE =
  /\b(london|manchester|leeds|liverpool|sheffield|bristol|edinburgh|glasgow|cardiff|newcastle|nottingham|leicester|stoke[-\s]?on[-\s]?trent|derby|oxford|cambridge|brighton|belfast|dublin|morocco|atlas mountains|new forest|darwen|wensleydale|high atlas)\b/i;

/** Sites whose building is in the city, so a page with no city line still has a pin. */
const HOST_PINS = new Map<string, PlacePin>([
  ["birminghamcathedral.com", BIRMINGHAM_CENTRE],
  ["www.birminghamcathedral.com", BIRMINGHAM_CENTRE],
  ["carrslane.co.uk", { lat: 52.477, lng: -1.891 }],
  ["www.carrslane.co.uk", { lat: 52.477, lng: -1.891 }],
  ["birmingham.ac.uk", { lat: 52.4508, lng: -1.9305 }],
  ["www.birmingham.ac.uk", { lat: 52.4508, lng: -1.9305 }],
  ["guildofstudents.com", { lat: 52.4508, lng: -1.9305 }],
  ["www.guildofstudents.com", { lat: 52.4508, lng: -1.9305 }],
  ["bcu.ac.uk", { lat: 52.482, lng: -1.888 }],
  ["www.bcu.ac.uk", { lat: 52.482, lng: -1.888 }],
  ["bcusu.com", { lat: 52.482, lng: -1.888 }],
  ["www.bcusu.com", { lat: 52.482, lng: -1.888 }],
  ["aston.ac.uk", { lat: 52.486, lng: -1.888 }],
  ["www.aston.ac.uk", { lat: 52.486, lng: -1.888 }],
  ["astonsu.com", { lat: 52.486, lng: -1.888 }],
  ["www.astonsu.com", { lat: 52.486, lng: -1.888 }],
  ["achurchnearyou.com", BIRMINGHAM_CENTRE],
  ["www.achurchnearyou.com", BIRMINGHAM_CENTRE],
  ["visitbirmingham.com", BIRMINGHAM_CENTRE],
  ["www.visitbirmingham.com", BIRMINGHAM_CENTRE]
]);

export function parseScrapeRadiusMiles(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_SCRAPE_RADIUS_MILES) return DEFAULT_SCRAPE_RADIUS_MILES;
  return n;
}

/** Straight-line miles between two pins. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earth = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(a));
}

export function milesFromCentre(lat: number, lng: number): number {
  return milesBetween(lat, lng, BIRMINGHAM_CENTRE.lat, BIRMINGHAM_CENTRE.lng);
}

function hostOf(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pinFromText(text: string): PlacePin | null {
  const hay = text.toLowerCase();
  for (const match of NAME_MATCHES) {
    const body = match.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "[\\s-]+");
    if (new RegExp(`\\b${body}\\b`, "i").test(hay)) return match.pin;
  }
  return null;
}

function pinFromUrl(url: string): PlacePin | null {
  const hay = url.toLowerCase();
  for (const match of URL_MATCHES) {
    if (hay.includes(match.bit)) return match.pin;
  }
  return null;
}

function within(pin: PlacePin, miles: number): boolean {
  return milesFromCentre(pin.lat, pin.lng) <= miles;
}

export type GeoDecision = { keep: boolean; reason: string };

export function geoKeepEvent(
  event: Pick<ScrapedEvent, "online" | "placeName" | "lat" | "lng" | "title" | "organisationName" | "fetchedFrom">,
  radiusMiles: number = DEFAULT_SCRAPE_RADIUS_MILES
): GeoDecision {
  const miles = parseScrapeRadiusMiles(radiusMiles);
  if (event.online) return { keep: true, reason: "online" };

  const lat = event.lat;
  const lng = event.lng;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (within({ lat, lng }, miles)) return { keep: true, reason: "pin-inside-radius" };
    return { keep: false, reason: "pin-outside-radius" };
  }

  const placeName = event.placeName ?? "";
  const title = event.title ?? "";
  const named = pinFromText(`${placeName} ${title}`);
  if (named) {
    if (within(named, miles)) return { keep: true, reason: "city-inside-radius" };
    return { keep: false, reason: "city-outside-radius" };
  }

  if (FAR_PLACE.test(title) || FAR_PLACE.test(placeName)) {
    return { keep: false, reason: FAR_PLACE.test(title) ? "far-title" : "far-place-name" };
  }

  const hostPin = HOST_PINS.get(hostOf(event.fetchedFrom));
  if (hostPin) {
    if (within(hostPin, miles)) return { keep: true, reason: "known-building" };
    return { keep: false, reason: "known-building-outside-radius" };
  }

  return { keep: false, reason: "no-city" };
}

/** A discovery page whose town is outside the circle is not opened. Pages with no town still open. */
export function urlWithinRadius(url: string, radiusMiles: number = DEFAULT_SCRAPE_RADIUS_MILES): boolean {
  const pin = pinFromUrl(url);
  if (!pin) return true;
  return within(pin, parseScrapeRadiusMiles(radiusMiles));
}

export function filterLocalEvents(
  events: ScrapedEvent[],
  radiusMiles: number = DEFAULT_SCRAPE_RADIUS_MILES
): { kept: ScrapedEvent[]; droppedGeo: number } {
  const kept: ScrapedEvent[] = [];
  let droppedGeo = 0;
  for (const event of events) {
    if (geoKeepEvent(event, radiusMiles).keep) kept.push(event);
    else droppedGeo += 1;
  }
  return { kept, droppedGeo };
}
