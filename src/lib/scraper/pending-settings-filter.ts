import { CATEGORIES, categoryEnabledKey, type Category } from "../constants";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { scrapeUrlAllowed } from "./allowlist";
import { looksLikeListingUrl } from "./enrich";
import { geoKeepEvent, parseScrapeRadiusMiles } from "./geo";
import { eventsFromJsonLd, extractJsonLdScripts } from "./jsonld";
import { SCRAPE_USER_AGENT, type FetchLike } from "./live-adapter";
import { eventsFromMicrodata } from "./microdata";
import { DETAIL_TIME_CAP } from "./detail-time";

export type PendingFilterRow = {
  category: string;
  tags: string;
  title: string;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  online: boolean;
  externalUrl: string | null;
  notes: string | null;
};

export type PendingVerdict = "keep" | "discard" | "open-page";

function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceFeed(notes: string | null): string {
  const match = /Source feed:\s*(\S+)/.exec(notes ?? "");
  return match?.[1] ?? "";
}

/** Meetup cards stay. The search page does not record miles, so this button cannot judge them. */
export function isMeetupRow(row: Pick<PendingFilterRow, "externalUrl" | "notes" | "tags">): boolean {
  return (
    hostOf(row.externalUrl) === "meetup.com" ||
    hostOf(sourceFeed(row.notes)) === "meetup.com" ||
    (row.tags ?? "").includes("|Meetup|")
  );
}

function typeEnabled(category: string, enabled: Set<Category>): boolean {
  return (CATEGORIES as readonly string[]).includes(category) && enabled.has(category as Category);
}

/**
 * Keep, discard, or open the event page.
 * A page is opened only when the stored card has no city and no pin, and it is not Meetup.
 */
export function judgePendingEvent(
  row: PendingFilterRow,
  opts: { enabled: Set<Category>; miles: number }
): PendingVerdict {
  if (isMeetupRow(row)) return "keep";
  if (!typeEnabled(row.category, opts.enabled)) return "discard";
  const fetchedFrom = sourceFeed(row.notes) || row.externalUrl || undefined;
  const decision = geoKeepEvent(
    {
      online: row.online,
      placeName: row.placeName,
      lat: row.lat,
      lng: row.lng,
      title: row.title,
      organisationName: "",
      fetchedFrom
    },
    opts.miles
  );
  if (decision.keep) return "keep";
  if (decision.reason !== "no-city") return "discard";
  const url = row.externalUrl?.trim() ?? "";
  if (!url || !scrapeUrlAllowed(url).ok || looksLikeListingUrl(url)) return "keep";
  return "open-page";
}

/** City and pin from one event-page download. Visible text is used when the hidden data has no place. */
export function placeFromDetailHtml(html: string, pageUrl: string): { placeName: string | null; lat: number | null; lng: number | null } {
  const fromScripts = extractJsonLdScripts(html).flatMap((block) => eventsFromJsonLd(block, pageUrl));
  const parsed = fromScripts.length ? fromScripts : eventsFromMicrodata(html, pageUrl);
  const located = parsed.find((event) => event.placeName || (event.lat != null && event.lng != null));
  if (located?.placeName || located?.lat != null) {
    return { placeName: located.placeName ?? null, lat: located.lat ?? null, lng: located.lng ?? null };
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 2500);
  return { placeName: text || null, lat: null, lng: null };
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

async function readText(fetchFn: FetchLike, url: string): Promise<{ ok: boolean; body: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const response = await fetchFn(url, {
      headers: { "User-Agent": SCRAPE_USER_AGENT, Accept: "text/html, application/ld+json;q=0.9" },
      signal: ctrl.signal
    });
    if (!response.ok) return { ok: false, body: "" };
    return { ok: true, body: await response.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Discard pending events that fail the saved types or miles.
 * Meetup rows stay. A card with no city is opened once, when the link is a single event page.
 */
export async function filterPendingToSettings(
  actorId: string | null,
  opts: { fetchFn?: FetchLike; pauseMs?: number } = {}
): Promise<{ discarded: number; stillPending: number; pagesOpened: number }> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const miles = parseScrapeRadiusMiles(settings?.scrapeRadiusMiles);
  const enabled = new Set<Category>();
  if (settings) {
    for (const category of CATEGORIES) {
      if (settings[categoryEnabledKey(category)]) enabled.add(category);
    }
  } else {
    CATEGORIES.forEach((category) => enabled.add(category));
  }

  const rows = await prisma.event.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      category: true,
      tags: true,
      title: true,
      placeName: true,
      lat: true,
      lng: true,
      online: true,
      externalUrl: true,
      notes: true
    }
  });

  const discardIds: string[] = [];
  const toOpen: typeof rows = [];
  for (const row of rows) {
    const verdict = judgePendingEvent(row, { enabled, miles });
    if (verdict === "discard") discardIds.push(row.id);
    else if (verdict === "open-page") toOpen.push(row);
  }

  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchLike);
  const pause = opts.pauseMs ?? (Number(process.env.SCRAPE_PAUSE_MS ?? "1500") || 1500);
  const robotsCache = new Map<string, string | null>();
  let pagesOpened = 0;
  let left = DETAIL_TIME_CAP;

  for (const row of toOpen) {
    const url = row.externalUrl?.trim() ?? "";
    const allowed = scrapeUrlAllowed(url);
    if (!allowed.ok || left <= 0) continue;
    if (!robotsCache.has(allowed.url.origin)) {
      const robots = await readText(fetchFn, `${allowed.url.origin}/robots.txt`);
      robotsCache.set(allowed.url.origin, robots?.ok ? robots.body : robots === null ? null : "");
    }
    const robots = robotsCache.get(allowed.url.origin);
    if (robots == null || (robots && pathDisallowed(robots, allowed.url.pathname))) continue;
    left -= 1;
    pagesOpened += 1;
    const page = await readText(fetchFn, allowed.url.toString());
    if (page?.ok) {
      const place = placeFromDetailHtml(page.body, allowed.url.toString());
      const again = judgePendingEvent(
        {
          ...row,
          placeName: place.placeName ?? row.placeName,
          lat: place.lat ?? row.lat,
          lng: place.lng ?? row.lng
        },
        { enabled, miles }
      );
      if (again === "discard") discardIds.push(row.id);
    }
    if (pause && left > 0) await sleep(pause);
  }

  for (let i = 0; i < discardIds.length; i += 80) {
    const slice = discardIds.slice(i, i + 80);
    await prisma.event.updateMany({
      where: { id: { in: slice }, status: "PENDING" },
      data: { status: "DISCARDED" }
    });
  }

  const stillPending = await prisma.event.count({ where: { status: "PENDING" } });
  const off = CATEGORIES.filter((category) => !enabled.has(category));
  await writeAudit({
    actorId,
    action: "scraper.filterPending",
    entityType: "Event",
    entityId: "pending",
    summary: `Discarded ${discardIds.length} pending event(s) outside ${miles} miles or an unticked type (${off.length ? off.join(", ") : "all types on"}). Meetup rows were left. Pages opened ${pagesOpened}. ${stillPending} still pending.`
  });
  return { discarded: discardIds.length, stillPending, pagesOpened };
}
