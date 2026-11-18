import { LIMITS, isHttpUrl } from "../security";
import { isSeriesSpan, parseSchemaInstant, resolveSchemaEnd } from "./schema-date";
import { cleanText, clip, joinNotes, looksOnline, stripHtml } from "./text";
import type { ScrapedEvent } from "./types";

type JsonLdNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function typeName(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const typed = value as { "@type"?: unknown };
  const t = typed["@type"];
  if (Array.isArray(t)) return t.map(String).join(" ");
  return t ? String(t) : "";
}

function isEventType(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const raw = (value as { "@type"?: unknown })["@type"];
  const types = Array.isArray(raw) ? raw : [raw];
  return types.some((type) => {
    if (typeof type !== "string") return false;
    const name = type.split(/[\/#]/).pop() ?? type;
    return name === "Event" || name.endsWith("Event");
  });
}

/** Some JSON-LD providers omit an Event type but expose a complete event-shaped node. */
function hasEventShape(rec: JsonLdNode): boolean {
  const hasTitle = Boolean(textOf(rec.name) ?? textOf(rec.headline));
  const hasStart = rec.startDate != null || rec.startTime != null || rec.doorTime != null;
  const hasEventDetail = rec.endDate != null || rec.endTime != null || rec.location != null ||
    rec.eventAttendanceMode != null || rec.offers != null || rec.organizer != null;
  return hasTitle && hasStart && hasEventDetail;
}

function textOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const obj = value as JsonLdNode;
    for (const key of ["name", "title", "@value", "text", "description"]) {
      const nested = textOf(obj[key]);
      if (nested) return nested;
    }
  }
  return null;
}

function walk(node: unknown, acc: JsonLdNode[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, acc));
    return;
  }
  if (!node || typeof node !== "object") return;
  const rec = node as JsonLdNode;
  if (isEventType(rec) || hasEventShape(rec)) acc.push(rec);
  for (const key of ["@graph", "itemListElement", "item", "mainEntity", "hasPart", "subEvent", "event"]) {
    if (key in rec) walk(rec[key], acc);
  }
}

function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function placeFrom(location: unknown): {
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  onlineHint: boolean;
} {
  if (location == null) return { placeName: null, lat: null, lng: null, onlineHint: false };
  if (typeof location === "string") {
    return {
      placeName: clip(location, LIMITS.placeLength),
      lat: null,
      lng: null,
      onlineHint: looksOnline(location)
    };
  }

  const locs = asArray(location).filter((l): l is JsonLdNode => !!l && typeof l === "object");
  const names: string[] = [];
  let lat: number | null = null;
  let lng: number | null = null;
  let onlineHint = false;

  for (const loc of locs) {
    if (/\bVirtualLocation\b/i.test(typeName(loc))) onlineHint = true;
    const name = textOf(loc.name) ?? textOf(loc);
    const address = loc.address;
    let addressLine: string | null = null;
    if (typeof address === "string") {
      addressLine = address;
    } else if (address && typeof address === "object") {
      const a = address as JsonLdNode;
      addressLine = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join(", ");
    }
    const combined = [name, addressLine].filter(Boolean).join(" — ");
    if (combined) names.push(combined);

    const geo = loc.geo;
    if (geo && typeof geo === "object") {
      const g = geo as JsonLdNode;
      lat = parseCoord(g.latitude) ?? lat;
      lng = parseCoord(g.longitude) ?? lng;
    }
    if (lat == null) lat = parseCoord(loc.latitude);
    if (lng == null) lng = parseCoord(loc.longitude);
  }

  return {
    placeName: names.length ? clip(names.join("; "), LIMITS.placeLength) : null,
    lat,
    lng,
    onlineHint
  };
}

function organiserFrom(rec: JsonLdNode, fallback: string): string {
  for (const key of ["organizer", "performer", "sponsor"]) {
    for (const item of asArray(rec[key])) {
      const name = textOf(item);
      if (name) return clip(name, LIMITS.titleLength);
    }
  }
  return fallback ? clip(fallback, LIMITS.titleLength) : "";
}

function offerNotes(rec: JsonLdNode): string | null {
  const bits = asArray(rec.offers)
    .map((offer) => {
      if (!offer || typeof offer !== "object") return null;
      const o = offer as JsonLdNode;
      if (o.price == null && o.lowPrice == null) return null;
      const price = o.price ?? o.lowPrice;
      const currency = typeof o.priceCurrency === "string" ? o.priceCurrency : "";
      const availability = typeof o.availability === "string" ? o.availability.replace(/^.*\//, "") : "";
      return [`Price: ${price}${currency ? ` ${currency}` : ""}`, availability ? `Availability: ${availability}` : null]
        .filter(Boolean)
        .join(" · ");
    })
    .filter(Boolean);
  return bits.length ? bits.join("; ") : null;
}

function parseJsonLenient(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(raw.replace(/,\s*([\]}])/g, "$1"));
    } catch {
      return null;
    }
  }
}

export function extractJsonLdScripts(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const parsed = parseJsonLenient(match[1]!.trim());
    if (parsed != null) out.push(parsed);
  }
  return out;
}

export function eventsFromJsonLd(
  payload: unknown,
  sourceUrl: string,
  options: { fallbackOrganisation?: boolean } = {}
): ScrapedEvent[] {
  let host = "jsonld";
  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    host = "jsonld";
  }
  const found: JsonLdNode[] = [];
  walk(payload, found);
  const events: ScrapedEvent[] = [];
  for (const rec of found) {
    const rawTitle = textOf(rec.name) ?? textOf(rec.headline);
    if (!rawTitle) continue;
    const title = clip(cleanText(rawTitle), LIMITS.titleLength);
    const startRaw = rec.startDate ?? rec.startTime ?? rec.doorTime;
    const endRaw = rec.endDate ?? rec.endTime;
    const startParsed = parseSchemaInstant(startRaw == null ? null : String(startRaw));
    if (!startParsed) continue;
    const startsAt = startParsed.at;
    const endsAt = resolveSchemaEnd(startParsed, endRaw == null ? null : String(endRaw));
    const place = placeFrom(rec.location);
    const organisationName = organiserFrom(rec, options.fallbackOrganisation === false ? "" : host);
    const urlCandidate = typeof rec.url === "string" ? rec.url : typeof rec.sameAs === "string" ? rec.sameAs : null;
    const url = urlCandidate && isHttpUrl(urlCandidate) ? urlCandidate : sourceUrl;
    // Prefer a stable public id/url so entity-decoding title changes do not fork sourceKeys.
    const uid = clip(
      String(rec["@id"] ?? rec.identifier ?? (urlCandidate && isHttpUrl(urlCandidate) ? urlCandidate : null) ?? `${title}:${startsAt.toISOString()}`),
      180
    );
    const description = rec.description
      ? clip(stripHtml(String(rec.description)), LIMITS.textLength)
      : rec.abstract
        ? clip(stripHtml(String(rec.abstract)), LIMITS.textLength)
        : null;
    const attendance = String(rec.eventAttendanceMode ?? rec.attendanceMode ?? "");
    events.push({
      sourceKey: `live:${host}:${uid}`,
      title,
      organisationName,
      category: "Social",
      startsAt,
      endsAt,
      online:
        /OnlineEventAttendanceMode/i.test(attendance) ||
        place.onlineHint ||
        looksOnline(title, place.placeName, description),
      placeName: place.placeName,
      lat: place.lat,
      lng: place.lng,
      externalUrl: url,
      notes: joinNotes(description, offerNotes(rec)),
      fetchedFrom: sourceUrl,
      needsTypeReview: false
    });
  }
  return keyEachSlot(dropSpanningParents(events));
}

/** A series parent shares its page with real one-off slots. Keep the slots. */
function dropSpanningParents(events: ScrapedEvent[]): ScrapedEvent[] {
  const spans = events.filter((event) => isSeriesSpan(event.startsAt, event.endsAt));
  if (!spans.length) return events;
  const singles = events.filter((event) => !isSeriesSpan(event.startsAt, event.endsAt));
  for (const span of spans) {
    for (const single of singles) {
      if (single.externalUrl !== span.externalUrl) continue;
      if (single.title === "Untitled event") single.title = span.title;
      if (!single.placeName && span.placeName) single.placeName = span.placeName;
      if (!single.organisationName && span.organisationName) single.organisationName = span.organisationName;
    }
  }
  return events.filter((event) => {
    if (!isSeriesSpan(event.startsAt, event.endsAt)) return true;
    const siblings = singles.filter(
      (single) =>
        (single.externalUrl && single.externalUrl === event.externalUrl) ||
        single.title.toLowerCase() === event.title.toLowerCase()
    );
    return siblings.length < 2;
  });
}

/** Slots that shared one id become separate rows, keyed by their start. */
function keyEachSlot(events: ScrapedEvent[]): ScrapedEvent[] {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.sourceKey, (counts.get(event.sourceKey) ?? 0) + 1);
  return events.map((event) => {
    if ((counts.get(event.sourceKey) ?? 0) < 2) return event;
    return { ...event, sourceKey: clip(`${event.sourceKey}#${event.startsAt.toISOString()}`, 240) };
  });
}
