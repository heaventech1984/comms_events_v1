import { prisma } from "../db";
import { londonDate, londonParts } from "../time";
import { scrapeUrlAllowed } from "./allowlist";
import { looksLikeListingUrl } from "./enrich";
import { FETCH_BODY_MAX } from "./harvest";
import { eventsFromJsonLd, extractJsonLdScripts } from "./jsonld";
import { SCRAPE_USER_AGENT, type FetchLike } from "./live-adapter";
import { eventsFromMicrodata } from "./microdata";
import { occurrencesFromDetailHtml } from "./series-slots";
import { isDateOnlyStoredRange, isSeriesSpan } from "./schema-date";
import type { ScrapedEvent } from "./types";

/** How many event pages one scrape may open to recover a missing clock. */
export const DETAIL_TIME_CAP = 120;

export type DetailBudget = { left: number };

type Timed = { startsAt: Date; endsAt: Date };

type DetailRow = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  externalUrl?: string | null;
  fetchedFrom?: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameUrl(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const path = (value: string) => value.replace(/\/$/, "");
    return left.origin === right.origin && path(left.pathname) === path(right.pathname) && left.search === right.search;
  } catch {
    return a === b;
  }
}

function pathDisallowed(robots: string, path: string): boolean {
  const lines = robots.split(/\r?\n/).map((line) => line.trim());
  let inStar = false;
  const disallows: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inStar = value === "*";
      continue;
    }
    if (inStar && key === "disallow" && value) disallows.push(value);
  }
  return disallows.some((rule) => rule === "/" || path === rule || path.startsWith(rule));
}

/** A listing gave a day but no clock, and the Event Link is a single page we may open. */
export function shouldFetchDetailTime(event: DetailRow): boolean {
  if (!isDateOnlyStoredRange(event.startsAt, event.endsAt)) return false;
  const url = event.externalUrl?.trim();
  if (!url) return false;
  if (!scrapeUrlAllowed(url).ok) return false;
  if (looksLikeListingUrl(url)) return false;
  if (event.fetchedFrom && sameUrl(url, event.fetchedFrom)) return false;
  return true;
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");
}

/** First one or two clocks in the page text, placed on the listing's calendar day. */
export function clockFromVisibleText(html: string, day: Date): Timed | null {
  const text = visibleText(html);
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/gi;
  const clocks: { hour: number; minute: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) && clocks.length < 2) {
    if (match[3]) {
      let hour = Number(match[1]);
      const minute = Number(match[2] ?? "0");
      const ap = match[3].toLowerCase();
      if (ap === "pm" && hour < 12) hour += 12;
      if (ap === "am" && hour === 12) hour = 0;
      if (hour === 0 && minute === 0) continue;
      clocks.push({ hour, minute });
    } else {
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      if (hour === 0 && minute === 0) continue;
      clocks.push({ hour, minute });
    }
  }
  if (!clocks[0]) return null;
  const dayParts = londonParts(day);
  const startsAt = londonDate(dayParts.year, dayParts.month, dayParts.day, clocks[0].hour, clocks[0].minute);
  const endClock = clocks[1];
  const endsAt = endClock
    ? londonDate(dayParts.year, dayParts.month, dayParts.day, endClock.hour, endClock.minute)
    : new Date(startsAt.getTime() + 60 * 60 * 1000);
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000) };
  }
  return { startsAt, endsAt };
}

function pickTimed(events: ScrapedEvent[], listing: DetailRow, pageUrl: string): Timed | null {
  const timed = events.filter((event) => !isDateOnlyStoredRange(event.startsAt, event.endsAt));
  if (!timed.length) return null;
  const page = pageUrl.replace(/\/$/, "");
  const byUrl = timed.find((event) => event.externalUrl && sameUrl(event.externalUrl, page));
  if (byUrl) return { startsAt: byUrl.startsAt, endsAt: byUrl.endsAt };
  const wanted = listing.title.trim().toLowerCase();
  const byTitle = timed.find((event) => {
    const title = event.title.trim().toLowerCase();
    return title && (wanted.includes(title) || title.includes(wanted));
  });
  if (byTitle) return { startsAt: byTitle.startsAt, endsAt: byTitle.endsAt };
  if (timed.length === 1) return { startsAt: timed[0].startsAt, endsAt: timed[0].endsAt };
  return null;
}

/** Clock from an event page. JSON-LD or microdata first, then one visible clock. */
export function timeFromDetailHtml(html: string, pageUrl: string, listing: DetailRow): Timed | null {
  const fromScripts = extractJsonLdScripts(html).flatMap((block) => eventsFromJsonLd(block, pageUrl));
  const parsed = fromScripts.length ? fromScripts : eventsFromMicrodata(html, pageUrl);
  const structured = pickTimed(parsed, listing, pageUrl);
  if (structured) return structured;
  return clockFromVisibleText(html, listing.startsAt);
}

async function readBody(fetchFn: FetchLike, url: string): Promise<{ ok: boolean; body: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const response = await fetchFn(url, {
      headers: { "User-Agent": SCRAPE_USER_AGENT, Accept: "text/html, application/ld+json;q=0.9" },
      signal: ctrl.signal
    });
    if (!response.ok) return { ok: false, body: "" };
    const body = await response.text();
    if (body.length > FETCH_BODY_MAX) return null;
    return { ok: true, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function robotsAllow(fetchFn: FetchLike, url: URL, cache: Map<string, string | null>): Promise<boolean> {
  if (!cache.has(url.origin)) {
    const robots = await readBody(fetchFn, `${url.origin}/robots.txt`);
    cache.set(url.origin, robots?.ok ? robots.body : robots === null ? null : "");
  }
  const body = cache.get(url.origin);
  if (body == null) return false;
  if (!body) return true;
  return !pathDisallowed(body, url.pathname);
}

/**
 * Open event pages for rows that only have a day, and copy a real clock when the page has one.
 * `budget.left` is how many pages this run may still open.
 */
export async function enrichDateOnlyEvents<T extends DetailRow>(
  events: T[],
  opts: { fetchFn?: FetchLike; pauseMs?: number; budget?: DetailBudget } = {}
): Promise<{ events: T[]; fetched: number }> {
  const budget = opts.budget ?? { left: DETAIL_TIME_CAP };
  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchLike);
  const pause = opts.pauseMs ?? 0;
  const cache = new Map<string, Timed | null>();
  const robotsCache = new Map<string, string | null>();
  let fetched = 0;
  const out: T[] = [];

  for (const event of events) {
    if (!shouldFetchDetailTime(event) || budget.left <= 0) {
      out.push(event);
      continue;
    }
    const url = event.externalUrl!.trim();
    let timing = cache.get(url);
    if (timing === undefined) {
      const allowed = scrapeUrlAllowed(url);
      if (!allowed.ok || budget.left <= 0) {
        out.push(event);
        continue;
      }
      const allowedUrl = allowed.url.toString();
      if (!(await robotsAllow(fetchFn, allowed.url, robotsCache))) {
        cache.set(url, null);
        out.push(event);
        continue;
      }
      budget.left -= 1;
      fetched += 1;
      const page = await readBody(fetchFn, allowedUrl);
      timing = page?.ok ? timeFromDetailHtml(page.body, allowedUrl, event) : null;
      cache.set(url, timing);
      if (pause && budget.left > 0) await sleep(pause);
    }
    if (timing && !isDateOnlyStoredRange(timing.startsAt, timing.endsAt)) {
      out.push({ ...event, startsAt: timing.startsAt, endsAt: timing.endsAt });
    } else {
      out.push(event);
    }
  }
  return { events: out, fetched };
}

function shouldFetchSeriesPage(event: DetailRow): boolean {
  if (!isSeriesSpan(event.startsAt, event.endsAt)) return false;
  const url = event.externalUrl?.trim();
  if (!url || !scrapeUrlAllowed(url).ok) return false;
  if (looksLikeListingUrl(url)) return false;
  if (event.fetchedFrom && sameUrl(url, event.fetchedFrom)) return false;
  return true;
}

/**
 * A row that runs from the first sitting to the last becomes one row per upcoming sitting.
 * The old source key is returned so the pending span can be discarded.
 */
export async function expandSeriesEvents(
  events: ScrapedEvent[],
  opts: { fetchFn?: FetchLike; pauseMs?: number; budget?: DetailBudget; now?: Date } = {}
): Promise<{ events: ScrapedEvent[]; fetched: number; retiredKeys: string[]; splitUrls: string[] }> {
  const budget = opts.budget ?? { left: DETAIL_TIME_CAP };
  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchLike);
  const pause = opts.pauseMs ?? 0;
  const now = opts.now ?? new Date();
  const cache = new Map<string, ScrapedEvent[] | null>();
  const robotsCache = new Map<string, string | null>();
  let fetched = 0;
  const retiredKeys: string[] = [];
  const splitUrls: string[] = [];
  const out: ScrapedEvent[] = [];

  for (const event of events) {
    if (!shouldFetchSeriesPage(event) || budget.left <= 0) {
      out.push(event);
      continue;
    }
    const url = event.externalUrl!.trim();
    let slots = cache.get(url);
    if (slots === undefined) {
      const allowed = scrapeUrlAllowed(url);
      if (!allowed.ok || budget.left <= 0 || !(await robotsAllow(fetchFn, allowed.url, robotsCache))) {
        cache.set(url, null);
        out.push(event);
        continue;
      }
      budget.left -= 1;
      fetched += 1;
      const page = await readBody(fetchFn, allowed.url.toString());
      const parsed = page?.ok ? occurrencesFromDetailHtml(page.body, event, now) : [event];
      slots = parsed.length >= 2 && parsed.some((row) => row.sourceKey !== event.sourceKey) ? parsed : null;
      cache.set(url, slots);
      if (pause && budget.left > 0) await sleep(pause);
    }
    if (slots && slots.length >= 2) {
      retiredKeys.push(event.sourceKey);
      if (!splitUrls.includes(url)) splitUrls.push(url);
      out.push(...slots.map((slot) => ({ ...slot, fetchedFrom: event.fetchedFrom, needsTypeReview: event.needsTypeReview, category: event.category })));
    } else {
      out.push(event);
    }
  }
  return { events: out, fetched, retiredKeys, splitUrls };
}

/** Discard pending span rows that have been replaced by one-off sittings. */
export async function discardPendingSpans(sourceKeys: string[]): Promise<number> {
  const keys = [...new Set(sourceKeys.filter(Boolean))];
  if (!keys.length) return 0;
  const result = await prisma.event.updateMany({
    where: { sourceKey: { in: keys }, status: "PENDING", humanEditedAt: null },
    data: { status: "DISCARDED" }
  });
  return result.count;
}

/**
 * Pending rows already saved as one long series. Opens the event page and writes one row per upcoming sitting.
 */
export async function splitPendingSeriesSpans(opts: {
  fetchFn?: FetchLike;
  pauseMs?: number;
  budget?: DetailBudget;
  skipUrls?: Set<string>;
  now?: Date;
} = {}): Promise<{ created: number; discarded: number; fetched: number }> {
  const budget = opts.budget ?? { left: DETAIL_TIME_CAP };
  if (budget.left <= 0 || process.env.SCRAPE_LIVE === "0") return { created: 0, discarded: 0, fetched: 0 };
  const now = opts.now ?? new Date();
  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchLike);
  const pause = opts.pauseMs ?? 0;
  const rows = await prisma.event.findMany({
    where: { status: "PENDING", humanEditedAt: null, externalUrl: { not: null } },
    orderBy: { startsAt: "asc" }
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.externalUrl || !isSeriesSpan(row.startsAt, row.endsAt)) continue;
    if (opts.skipUrls?.has(row.externalUrl)) continue;
    if (!shouldFetchSeriesPage({ title: row.title, startsAt: row.startsAt, endsAt: row.endsAt, externalUrl: row.externalUrl, fetchedFrom: null })) {
      continue;
    }
    const list = groups.get(row.externalUrl) ?? [];
    list.push(row);
    groups.set(row.externalUrl, list);
  }
  const robotsCache = new Map<string, string | null>();
  let created = 0;
  let discarded = 0;
  let fetched = 0;
  for (const [url, group] of groups) {
    if (budget.left <= 0) break;
    const allowed = scrapeUrlAllowed(url);
    if (!allowed.ok || !(await robotsAllow(fetchFn, allowed.url, robotsCache))) continue;
    budget.left -= 1;
    fetched += 1;
    const page = await readBody(fetchFn, allowed.url.toString());
    const parent = group[0]!;
    const template: ScrapedEvent = {
      sourceKey: parent.sourceKey ?? url,
      title: parent.title,
      organisationName: parent.organisationName,
      category: parent.category as ScrapedEvent["category"],
      startsAt: parent.startsAt,
      endsAt: parent.endsAt,
      online: parent.online,
      placeName: parent.placeName,
      lat: parent.lat,
      lng: parent.lng,
      externalUrl: parent.externalUrl,
      notes: parent.notes,
      needsTypeReview: false
    };
    const slots = page?.ok ? occurrencesFromDetailHtml(page.body, template, now) : [template];
    if (slots.length < 2 || slots.every((slot) => slot.sourceKey === template.sourceKey)) {
      if (pause && budget.left > 0) await sleep(pause);
      continue;
    }
    for (const slot of slots) {
      const existing = await prisma.event.findUnique({ where: { sourceKey: slot.sourceKey } });
      if (existing) continue;
      await prisma.event.create({
        data: {
          sourceKey: slot.sourceKey,
          title: slot.title,
          organisationName: parent.organisationName,
          organisationId: parent.organisationId,
          category: parent.category,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          online: parent.online,
          placeName: parent.placeName,
          lat: parent.lat,
          lng: parent.lng,
          externalUrl: parent.externalUrl,
          notes: parent.notes,
          status: "PENDING",
          recurrence: "NONE"
        }
      });
      created += 1;
    }
    const gone = await discardPendingSpans(group.map((row) => row.sourceKey ?? "").filter(Boolean));
    discarded += gone;
    if (pause && budget.left > 0) await sleep(pause);
  }
  return { created, discarded, fetched };
}

/**
 * Pending rows already saved with midnight. Fills clocks from their Event Link.
 * Skips rows this harvest is about to save, and rows a person has edited.
 */
export async function backfillPendingDateOnlyTimes(opts: {
  fetchFn?: FetchLike;
  pauseMs?: number;
  budget?: DetailBudget;
  skipSourceKeys?: Set<string>;
} = {}): Promise<{ updated: number; fetched: number }> {
  const budget = opts.budget ?? { left: DETAIL_TIME_CAP };
  if (budget.left <= 0 || process.env.SCRAPE_LIVE === "0") return { updated: 0, fetched: 0 };
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const rows = await prisma.event.findMany({
    where: {
      status: "PENDING",
      humanEditedAt: null,
      externalUrl: { not: null },
      startsAt: { gte: cutoff }
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true, endsAt: true, externalUrl: true, sourceKey: true }
  });
  const targets = rows.filter(
    (row) =>
      isDateOnlyStoredRange(row.startsAt, row.endsAt) &&
      !(row.sourceKey && opts.skipSourceKeys?.has(row.sourceKey)) &&
      Boolean(row.externalUrl)
  );
  const enriched = await enrichDateOnlyEvents(
    targets.map((row) => ({
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      externalUrl: row.externalUrl ?? undefined,
      fetchedFrom: null
    })),
    { fetchFn: opts.fetchFn, pauseMs: opts.pauseMs, budget }
  );
  let updated = 0;
  for (let i = 0; i < enriched.events.length; i += 1) {
    const next = enriched.events[i]!;
    const prev = targets[i]!;
    if (next.startsAt.getTime() === prev.startsAt.getTime()) continue;
    await prisma.event.update({
      where: { id: prev.id },
      data: { startsAt: next.startsAt, endsAt: next.endsAt }
    });
    updated += 1;
  }
  return { updated, fetched: enriched.fetched };
}
