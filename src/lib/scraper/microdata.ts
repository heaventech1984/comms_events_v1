import { friendlyHostLabel } from "../pending-copy";
import { LIMITS, isHttpUrl } from "../security";
import { parseSchemaInstant, resolveSchemaEnd } from "./schema-date";
import { cleanText, clip, joinNotes, looksOnline, stripHtml } from "./text";
import type { ScrapedEvent } from "./types";

/**
 * Fallback when a page has no JSON-LD: HTML microdata itemscope Event blocks.
 * Like reading sticky labels on a kitchen jar when the printed recipe card is missing.
 */

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = re.exec(tag);
  return m ? m[1]! : null;
}

function decodeChunk(html: string): string {
  return stripHtml(html);
}

/** Pull itemprop values from within one itemscope block (shallow). */
function propMap(blockHtml: string): Record<string, string[]> {
  const props: Record<string, string[]> = {};
  const re =
    /<(?<tag>[a-z0-9]+)([^>]*\bitemprop\s*=\s*["'](?<prop>[^"']+)["'][^>]*)>(?<inner>[\s\S]*?)<\/\k<tag>>|<(?:meta|link|time|a|img)([^>]*\bitemprop\s*=\s*["']([^"']+)["'][^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(blockHtml))) {
    const prop = (match.groups?.prop ?? match[6] ?? "").trim();
    if (!prop) continue;
    const open = match[2] ?? match[5] ?? "";
    const content =
      attr(open, "content") ??
      attr(open, "datetime") ??
      attr(open, "href") ??
      attr(open, "src") ??
      (match.groups?.inner != null ? decodeChunk(match.groups.inner) : "");
    if (!content.trim()) continue;
    (props[prop] ??= []).push(content.trim());
  }
  return props;
}

function first(props: Record<string, string[]>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = props[key]?.[0];
    if (v?.trim()) return v.trim();
  }
  return null;
}

export function eventsFromMicrodata(html: string, sourceUrl: string): ScrapedEvent[] {
  let host = "microdata";
  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    host = "microdata";
  }

  const events: ScrapedEvent[] = [];
  const blockRe =
    /<([a-z0-9]+)([^>]*\bitemscope\b[^>]*\bitemtype\s*=\s*["'][^"']*Event[^"']*["'][^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html))) {
    const block = match[3] ?? "";
    const props = propMap(block);
    const title = clip(cleanText(first(props, "name", "headline") ?? "Untitled event"), LIMITS.titleLength);
    const startRaw = first(props, "startDate", "startTime");
    const start = parseSchemaInstant(startRaw);
    if (!start) continue;
    const endsAt = resolveSchemaEnd(start, first(props, "endDate", "endTime"));
    const placeName = first(props, "location", "address");
    const urlRaw = first(props, "url");
    const url = urlRaw && isHttpUrl(urlRaw) ? urlRaw : sourceUrl;
    const description = first(props, "description");
    const organiserRaw = first(props, "organizer", "performer");
    const organiser = organiserRaw ? cleanText(organiserRaw) : friendlyHostLabel(host);
    const uid = clip(urlRaw && isHttpUrl(urlRaw) ? urlRaw : `${title}:${start.at.toISOString()}`, 180);
    const timeNote = start.dateOnly ? "Time not listed on source — open the Event link to check." : null;
    events.push({
      sourceKey: `live:${host}:${uid}`,
      title,
      organisationName: clip(organiser, LIMITS.titleLength),
      category: "Meetup",
      startsAt: start.at,
      endsAt,
      online: looksOnline(title, placeName, description),
      placeName: placeName ? clip(cleanText(placeName), LIMITS.placeLength) : null,
      lat: null,
      lng: null,
      externalUrl: url,
      notes: joinNotes(
        description ? clip(stripHtml(description), LIMITS.textLength) : null,
        timeNote
      ),
      fetchedFrom: sourceUrl,
      needsTypeReview: false
    });
  }
  return events;
}

/** Same-host calendar file links found in HTML (ICS discovery). */
export function discoverCalendarLinks(html: string, pageUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const found = new Set<string>();
  const linkRe = /<(?:a|link)\b([^>]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html))) {
    const attrs = match[1] ?? "";
    const href = attr(attrs, "href");
    if (!href) continue;
    const type = (attr(attrs, "type") ?? "").toLowerCase();
    const rel = (attr(attrs, "rel") ?? "").toLowerCase();
    let absolute: URL;
    try {
      absolute = new URL(href, base);
    } catch {
      continue;
    }
    if (absolute.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
    const path = absolute.pathname.toLowerCase();
    const looksIcs =
      path.endsWith(".ics") ||
      type.includes("text/calendar") ||
      (rel.includes("alternate") && type.includes("calendar"));
    if (!looksIcs) continue;
    found.add(absolute.toString());
  }
  return [...found].slice(0, 5);
}
