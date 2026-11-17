import type { SourceResult } from "./live-adapter";
import type { ScrapedEvent } from "./types";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_WEB_URL = "https://search.brave.com/search";
const REQUEST_TIMEOUT_MS = 15_000;
const RESPONSE_MAX = 1_000_000;
const RESULTS_PER_QUERY = 20;
export const EVENTBRITE_SEARCH_URL_CAP = 60;

/** New search-discovered events must be reviewed before any organisation whitelist can publish them. */
export function forceEventbritePending(events: ScrapedEvent[]): ScrapedEvent[] {
  return events.map((event) => ({ ...event, forcePending: true }));
}

/** Do not create new pending rows from search results for events that have already ended. */
export function upcomingEventbriteEvents(events: ScrapedEvent[], now = new Date()): ScrapedEvent[] {
  return events.filter((event) => event.endsAt.getTime() > now.getTime());
}

const SEARCHES = [
  { key: "church", query: "site:eventbrite.co.uk Birmingham church Christian events" },
  { key: "faith", query: "site:eventbrite.co.uk Birmingham prayer worship spirituality events" },
  { key: "free", query: "site:eventbrite.co.uk Birmingham free events this week" },
  { key: "music", query: "site:eventbrite.co.uk Birmingham music choir concert events" },
  { key: "community", query: "site:eventbrite.co.uk Birmingham community family student events" }
] as const;

type SearchResponse = {
  web?: { results?: Array<{ url?: unknown }> };
};

type SearchFetch = (input: string, init?: RequestInit) => Promise<Response>;

function sourceResult(key: string, query: string, ok: boolean, eventCount: number, error?: string): SourceResult {
  const url = new URL(BRAVE_WEB_URL);
  url.searchParams.set("q", query);
  return {
    url: url.toString(),
    label: `Brave Search · ${key}`,
    ok,
    eventCount,
    error
  };
}

/** Only keep canonical individual UK Eventbrite event pages, not search or category listings. */
export function canonicalEventbriteUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || (url.port && url.port !== "443") || host !== "eventbrite.co.uk" || url.username || url.password) return null;
    if (!/^\/e\/[^/]+-\d+\/?$/i.test(url.pathname)) return null;
    url.hostname = "www.eventbrite.co.uk";
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Use Brave only to discover direct event URLs; all page content is fetched by Gather's scraper. */
export async function discoverEventbriteUrls(
  apiKey = process.env.BRAVE_SEARCH_API_KEY,
  fetchFn: SearchFetch = fetch
): Promise<{ urls: string[]; sources: SourceResult[] }> {
  if (!apiKey?.trim()) {
    return {
      urls: [],
      sources: [sourceResult("Eventbrite", "site:eventbrite.co.uk Birmingham", false, 0, "BRAVE_SEARCH_API_KEY is not configured.")]
    };
  }

  const urls: string[] = [];
  const seen = new Set<string>();
  const sources: SourceResult[] = [];

  for (const search of SEARCHES) {
    if (urls.length >= EVENTBRITE_SEARCH_URL_CAP) break;
    const requestUrl = new URL(BRAVE_SEARCH_URL);
    requestUrl.searchParams.set("q", search.query);
    requestUrl.searchParams.set("country", "GB");
    requestUrl.searchParams.set("search_lang", "en");
    requestUrl.searchParams.set("count", String(RESULTS_PER_QUERY));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchFn(requestUrl.toString(), {
        headers: { Accept: "application/json", "X-Subscription-Token": apiKey.trim() },
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) {
        sources.push(sourceResult(search.key, search.query, false, 0, `Search API returned HTTP ${response.status}.`));
        continue;
      }
      const body = await response.text();
      if (body.length > RESPONSE_MAX) {
        sources.push(sourceResult(search.key, search.query, false, 0, "Search API response was too large."));
        continue;
      }
      let payload: SearchResponse;
      try {
        payload = JSON.parse(body) as SearchResponse;
      } catch {
        sources.push(sourceResult(search.key, search.query, false, 0, "Search API returned invalid JSON."));
        continue;
      }
      let added = 0;
      for (const result of payload.web?.results ?? []) {
        const canonical = canonicalEventbriteUrl(result.url);
        if (!canonical || seen.has(canonical)) continue;
        seen.add(canonical);
        urls.push(canonical);
        added += 1;
        if (urls.length >= EVENTBRITE_SEARCH_URL_CAP) break;
      }
      sources.push(sourceResult(search.key, search.query, true, added));
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      sources.push(sourceResult(search.key, search.query, false, 0, timedOut ? "Search request timed out." : "Could not reach the search API."));
    } finally {
      clearTimeout(timer);
    }
  }

  return { urls, sources };
}
