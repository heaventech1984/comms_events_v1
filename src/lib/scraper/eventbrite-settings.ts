import { londonDate, londonParts, londonWeekday } from "../time";

export const EVENTBRITE_SEARCH_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
] as const;

export type EventbriteSearchConfig = {
  enabled: boolean;
  runDays: number[];
  pages: number;
  includeManual: boolean;
  location: string;
  terms: string[];
};

export const DEFAULT_EVENTBRITE_SEARCH_CONFIG: EventbriteSearchConfig = {
  enabled: true,
  runDays: [0],
  pages: 10,
  includeManual: false,
  location: "Birmingham",
  terms: ["Christian", "Church", "Jesus"]
};

function cleanPhrase(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/["\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || fallback;
}

export function parseEventbriteSearchConfig(value: unknown): EventbriteSearchConfig {
  let parsed: Record<string, unknown> = {};
  try {
    const candidate = typeof value === "string" ? JSON.parse(value) : value;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      parsed = candidate as Record<string, unknown>;
    }
  } catch {
    // Old or malformed settings use the safe defaults.
  }
  const rawDays = Array.isArray(parsed.runDays) ? parsed.runDays : DEFAULT_EVENTBRITE_SEARCH_CONFIG.runDays;
  const runDays = [...new Set(rawDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  const rawTerms = Array.isArray(parsed.terms)
    ? parsed.terms
    : DEFAULT_EVENTBRITE_SEARCH_CONFIG.terms;
  const terms = [...new Set(rawTerms
    .filter((term): term is string => typeof term === "string")
    .map((term) => cleanPhrase(term, "", 50))
    .filter(Boolean))].slice(0, 8);
  const rawPages = Number(parsed.pages);
  return {
    enabled: parsed.enabled !== false,
    runDays,
    pages: Number.isFinite(rawPages)
      ? Math.min(10, Math.max(1, Math.trunc(rawPages)))
      : DEFAULT_EVENTBRITE_SEARCH_CONFIG.pages,
    includeManual: parsed.includeManual === true,
    location: cleanPhrase(parsed.location, DEFAULT_EVENTBRITE_SEARCH_CONFIG.location, 80),
    terms: terms.length ? terms : DEFAULT_EVENTBRITE_SEARCH_CONFIG.terms
  };
}

export function eventbriteSearchMonth(runAt: Date): { month: string; year: number } {
  const run = londonParts(runAt);
  const target = londonDate(run.year, run.month, run.day + 7, run.hour, run.minute);
  const parts = londonParts(target);
  const month = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "long" }).format(target);
  return { month, year: parts.year };
}

export function buildEventbriteSearchQuery(config: EventbriteSearchConfig, runAt = new Date()): string {
  const { month, year } = eventbriteSearchMonth(runAt);
  const terms = config.terms.map((term) => `"${term}"`).join(" OR ");
  return `site:eventbrite.co.uk/e/ "${config.location}" AND (${terms}) AND "${month}" AND "${year}"`;
}

export function shouldRunEventbriteSearch(
  config: EventbriteSearchConfig,
  trigger: "MANUAL" | "SCHEDULED",
  runAt = new Date()
): boolean {
  if (!config.enabled) return false;
  if (trigger === "MANUAL") return config.includeManual;
  return config.runDays.includes(londonWeekday(runAt));
}
