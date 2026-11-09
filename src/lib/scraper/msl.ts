import { LIMITS, isHttpUrl } from "../security";
import { londonDate } from "../time";
import { clip, cleanText, joinNotes, looksOnline } from "./text";
import type { ScrapedEvent } from "./types";

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

/**
 * Parse Membership Solutions (MSL) SU event lists — Guild of Students style cards.
 * Only used on already-allowlisted hosts when JSON-LD/ICS are empty.
 */
export function eventsFromMslHtml(html: string, sourceUrl: string): ScrapedEvent[] {
  let host = "";
  let origin = "";
  try {
    const u = new URL(sourceUrl);
    host = u.hostname;
    origin = u.origin;
  } catch {
    return [];
  }

  const blocks = html.match(/<div class="event_item[\s\S]*?<\/dl>\s*<\/div>/gi) ?? [];
  const events: ScrapedEvent[] = [];
  const yearHint = new Date().getFullYear();

  for (const block of blocks) {
    const name = cleanText(attrOrText(block, /class="msl_event_name"[^>]*>([\s\S]*?)<\/a>/i) ?? "");
    if (!name) continue;
    const href = block.match(/href="(\/ents\/event\/\d+\/)"/i)?.[1] ?? block.match(/href="(\/events\/[^"]+)"/i)?.[1];
    const externalUrl = href ? `${origin}${href}` : sourceUrl;
    if (!isHttpUrl(externalUrl)) continue;
    const timeRaw = cleanText(attrOrText(block, /class="msl_event_time"[^>]*>([\s\S]*?)<\/dd>/i) ?? "");
    const place = cleanText(attrOrText(block, /class="msl_event_location"[^>]*>([\s\S]*?)<\/dd>/i) ?? "") || null;
    const description = cleanText(attrOrText(block, /class="msl_event_description"[^>]*>([\s\S]*?)<\/dd>/i) ?? "");
    const range = parseMslTimeRange(timeRaw, yearHint);
    if (!range) continue;
    const uid = clip(href ?? `${name}:${range.startsAt.toISOString()}`, 180);
    events.push({
      sourceKey: `live:${host}:${uid}`,
      title: clip(name, LIMITS.titleLength),
      organisationName: clip(host.replace(/^www\./, ""), LIMITS.titleLength),
      category: "Student",
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      online: looksOnline(name, place, description),
      placeName: place ? clip(place, LIMITS.placeLength) : null,
      lat: null,
      lng: null,
      externalUrl,
      notes: joinNotes(description ? clip(description, LIMITS.textLength) : null),
      fetchedFrom: sourceUrl,
      needsTypeReview: false
    });
  }
  return events;
}

function attrOrText(block: string, re: RegExp): string | null {
  const m = block.match(re);
  return m?.[1] ?? null;
}

/** e.g. "11th November 6pm - 9pm" or "12 November 2026 18:00". */
export function parseMslTimeRange(
  raw: string,
  defaultYear: number
): { startsAt: Date; endsAt: Date } | null {
  const text = raw.replace(/\u00a0/g, " ").trim();
  if (!text) return null;
  const m = text.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i
  );
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  const year = m[3] ? Number(m[3]) : defaultYear;
  if (!month || !day || !year) return null;
  const start = wallClock(year, month, day, Number(m[4]), Number(m[5] ?? "0"), m[6] ?? null);
  if (!start) return null;
  let end: Date;
  if (m[7]) {
    end = wallClock(year, month, day, Number(m[7]), Number(m[8] ?? "0"), m[9] ?? m[6] ?? null) ?? new Date(start.getTime() + 3 * 60 * 60 * 1000);
  } else {
    end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  }
  if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
  return { startsAt: start, endsAt: end };
}

function wallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  ampm: string | null
): Date | null {
  let h = hour;
  if (ampm) {
    const ap = ampm.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  return londonDate(year, month, day, h, minute);
}
