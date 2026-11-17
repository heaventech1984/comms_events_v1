import { CATEGORIES, type Category, type Tag } from "./constants";
import { safeNextPath } from "./security";
import { parseTagsParam } from "./tags";
import { londonDate, londonParts } from "./time";

export type CalendarView = "month" | "week" | "day" | "list";
export type CalendarFormat = "" | "online" | "inperson";
export const CALENDAR_VIEW_ORDER: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "list", label: "List" }
];

/** A calendar date with no time or zone attached. Month is 1–12. */
export type DayKey = { year: number; month: number; day: number };

export type CalendarState = {
  view: CalendarView;
  categories: Category[];
  tags: Tag[];
  anchor: DayKey;
  startMinute: number;
  endMinute: number;
};

export const DEFAULT_CALENDAR_START_MINUTE = 8 * 60;
export const DEFAULT_CALENDAR_END_MINUTE = 23 * 60;

export type CalendarParams = {
  view?: string;
  category?: string;
  types?: string;
  tags?: string;
  format?: string;
  d?: string;
  y?: string;
  m?: string;
  fromMin?: string;
  toMin?: string;
};

export function validCalendarBand(startMinute: unknown, endMinute: unknown): boolean {
  return (
    Number.isInteger(startMinute) &&
    Number.isInteger(endMinute) &&
    Number(startMinute) >= DEFAULT_CALENDAR_START_MINUTE &&
    Number(endMinute) <= DEFAULT_CALENDAR_END_MINUTE &&
    Number(startMinute) < Number(endMinute) &&
    Number(startMinute) % 30 === 0 &&
    Number(endMinute) % 30 === 0
  );
}

const MIN_YEAR = 2020;
const MAX_YEAR = 2100;

function utcNoon(key: DayKey): Date {
  return new Date(Date.UTC(key.year, key.month - 1, key.day, 12));
}

function fromUtc(date: Date): DayKey {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function isValidDayKey(key: DayKey): boolean {
  if (![key.year, key.month, key.day].every(Number.isInteger)) return false;
  if (key.year < MIN_YEAR || key.year > MAX_YEAR) return false;
  const round = fromUtc(utcNoon(key));
  return round.year === key.year && round.month === key.month && round.day === key.day;
}

export function addDaysKey(key: DayKey, days: number): DayKey {
  const date = utcNoon(key);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMondayFirst(key: DayKey): number {
  return (utcNoon(key).getUTCDay() + 6) % 7;
}

export function mondayOf(key: DayKey): DayKey {
  return addDaysKey(key, -weekdayMondayFirst(key));
}

export function sameDayKey(a: DayKey, b: DayKey): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function formatDayKey(key: DayKey): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${key.year}-${pad(key.month)}-${pad(key.day)}`;
}

export function dayKeyOf(date: Date): DayKey {
  const p = londonParts(date);
  return { year: p.year, month: p.month, day: p.day };
}

export function parseDayKey(value: string | undefined): DayKey | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const key = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidDayKey(key) ? key : null;
}

/**
 * Turns untrusted search params into a calendar state. Anything invalid falls back to today,
 * so a hand-edited URL can never produce an unbounded query or a server error.
 */
export function parseTypesParam(value: string | undefined): Category[] {
  if (!value) return [];
  const wanted = new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part): part is Category => CATEGORIES.includes(part as Category))
  );
  return CATEGORIES.filter((c) => wanted.has(c));
}

export function toggleCategory(selected: Category[], category: Category): Category[] {
  const next = new Set(selected);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  return CATEGORIES.filter((c) => next.has(c));
}

export function parseCalendarParams(
  params: CalendarParams,
  today: DayKey,
  defaultBand = { startMinute: DEFAULT_CALENDAR_START_MINUTE, endMinute: DEFAULT_CALENDAR_END_MINUTE }
): CalendarState {
  const fallbackBand = validCalendarBand(defaultBand.startMinute, defaultBand.endMinute)
    ? defaultBand
    : { startMinute: DEFAULT_CALENDAR_START_MINUTE, endMinute: DEFAULT_CALENDAR_END_MINUTE };
  const view: CalendarView =
    params.view === "month" || params.view === "day" || params.view === "week" || params.view === "list"
      ? params.view
      : "week";
  let categories = parseTypesParam(params.types);
  if (!categories.length && CATEGORIES.includes(params.category as Category)) {
    categories = [params.category as Category];
  }
  let tags = parseTagsParam(params.tags);
  if (!tags.length && params.format === "online") tags = ["Online"];
  if (!tags.length && params.format === "inperson") tags = ["In Person"];

  let anchor = parseDayKey(params.d);
  if (!anchor && params.y !== undefined && params.m !== undefined) {
    const year = Number(params.y);
    const month = Number(params.m);
    const legacy = { year, month, day: 1 };
    if (isValidDayKey(legacy)) {
      anchor = year === today.year && month === today.month ? today : legacy;
    }
  }
  const requestedStart = params.fromMin === undefined ? fallbackBand.startMinute : Number(params.fromMin);
  const requestedEnd = params.toMin === undefined ? fallbackBand.endMinute : Number(params.toMin);
  const band = validCalendarBand(requestedStart, requestedEnd)
    ? { startMinute: requestedStart, endMinute: requestedEnd }
    : fallbackBand;
  return { view, categories, tags, anchor: anchor ?? today, ...band };
}

export type CalendarRange = { from: Date; to: Date; days: DayKey[] };

/** Range boundaries are London midnights, so days stay correct across clock changes. */
export function rangeFor(view: CalendarView, anchor: DayKey): CalendarRange {
  let first: DayKey;
  let count: number;
  if (view === "day") {
    first = anchor;
    count = 1;
  } else if (view === "week" || view === "list") {
    first = anchor;
    count = 7;
  } else {
    first = mondayOf({ year: anchor.year, month: anchor.month, day: 1 });
    count = 42;
  }
  const days = Array.from({ length: count }, (_, i) => addDaysKey(first, i));
  const after = addDaysKey(first, count);
  return {
    from: londonDate(first.year, first.month, first.day, 0, 0),
    to: londonDate(after.year, after.month, after.day, 0, 0),
    days
  };
}

export function stepAnchor(view: CalendarView, anchor: DayKey, direction: 1 | -1): DayKey {
  if (view === "day") return addDaysKey(anchor, direction);
  if (view === "week" || view === "list") return addDaysKey(anchor, 7 * direction);
  const index = anchor.year * 12 + (anchor.month - 1) + direction;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(anchor.day, daysInMonth(year, month)) };
}

export type CalendarOverrides = Partial<CalendarState>;

/** Builds a calendar link. Empty categories or tags in the overrides remove that filter. */
export function calendarHref(state: CalendarState, overrides: CalendarOverrides = {}): string {
  const next = { ...state, ...overrides };
  const sp = new URLSearchParams();
  sp.set("view", next.view);
  if (next.categories.length) sp.set("types", next.categories.join(","));
  if (next.tags.length) sp.set("tags", next.tags.join(","));
  sp.set("d", formatDayKey(next.anchor));
  sp.set("fromMin", String(next.startMinute));
  sp.set("toMin", String(next.endMinute));
  return `/calendar?${sp.toString()}`;
}

/** Event opened from the calendar. `from` is the calendar address to return to. */
export function eventFromCalendarHref(eventId: string, calendarPath: string): string {
  return `/events/${eventId}?from=${encodeURIComponent(calendarPath)}`;
}

/**
 * Back to calendar. Only a same-site /calendar path is kept. Anything else
 * (another page, a full web address) becomes the plain calendar.
 */
export function calendarBackHref(from: string | null | undefined): string {
  const safe = safeNextPath(from, "/calendar");
  if (safe === "/calendar" || safe.startsWith("/calendar?")) return safe;
  return "/calendar";
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const weekdayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

export function formatDayLabel(key: DayKey): string {
  const date = utcNoon(key);
  return `${weekdayName.format(date)} ${dayMonthYear.format(date)}`;
}

export function rangeLabel(view: CalendarView, anchor: DayKey): string {
  if (view === "day") return formatDayLabel(anchor);
  if (view === "month") return monthYear.format(utcNoon(anchor));
  const start = anchor;
  const end = addDaysKey(start, 6);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} to ${dayMonthYear.format(utcNoon(end))}`;
  }
  return `${dayMonthYear.format(utcNoon(start))} to ${dayMonthYear.format(utcNoon(end))}`;
}
