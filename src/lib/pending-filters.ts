import { addDaysKey, dayKeyOf, formatDayKey, parseDayKey, parseTypesParam, type DayKey } from "./calendar";
import { CATEGORIES, type Category, type Tag } from "./constants";
import { safeNextPath } from "./security";
import { hasAnyTag, parseTagsParam, toggleTag } from "./tags";

/** default = next 7 days. custom = the from/to boxes. all = every open pending card. */
export type PendingDateMode = "default" | "custom" | "all";

export type PendingFilterState = {
  types: Category[];
  tags: Tag[];
  platform: string;
  needsTypeOnly: boolean;
  dateMode: PendingDateMode;
  from: DayKey;
  to: DayKey;
  rangeError: boolean;
};

export function parsePendingFilters(
  params: {
    types?: string;
    tags?: string;
    platform?: string;
    format?: string;
    filter?: string;
    from?: string;
    to?: string;
    dates?: string;
  },
  today = dayKeyOf(new Date())
): PendingFilterState {
  let tags = parseTagsParam(params.tags);
  if (!tags.length && params.format === "online") tags = ["Online"];
  if (!tags.length && params.format === "inperson") tags = ["In Person"];
  const fromDefault = today;
  const toDefault = addDaysKey(today, 7);
  const all = params.dates === "all";
  const asked = Boolean(params.from) || Boolean(params.to);
  const from = parseDayKey(params.from) ?? fromDefault;
  const to = parseDayKey(params.to) ?? (params.from ? addDaysKey(from, 7) : toDefault);
  const dateMode: PendingDateMode = all ? "all" : asked ? "custom" : "default";
  return {
    types: parseTypesParam(params.types),
    tags,
    platform: typeof params.platform === "string" ? params.platform.slice(0, 120) : "",
    needsTypeOnly: params.filter === "needs-type",
    dateMode,
    from,
    to,
    rangeError: dateMode !== "all" && formatDayKey(to) < formatDayKey(from)
  };
}

export function togglePendingType(current: Category[], category: Category): Category[] {
  if (current.includes(category)) return current.filter((c) => c !== category);
  return CATEGORIES.filter((c) => current.includes(c) || c === category);
}

export function togglePendingTag(current: Tag[], tag: Tag): Tag[] {
  return toggleTag(current, tag);
}

/** Build /pending?... keeping other filters when one chip changes. */
export function pendingHref(state: PendingFilterState, patch: Partial<PendingFilterState> = {}): string {
  const next: PendingFilterState = {
    types: patch.types ?? state.types,
    tags: patch.tags !== undefined ? patch.tags : state.tags,
    platform: patch.platform !== undefined ? patch.platform : state.platform,
    needsTypeOnly: patch.needsTypeOnly !== undefined ? patch.needsTypeOnly : state.needsTypeOnly,
    dateMode: patch.dateMode ?? state.dateMode,
    from: patch.from ?? state.from,
    to: patch.to ?? state.to,
    rangeError: false
  };
  const sp = new URLSearchParams();
  if (next.types.length) sp.set("types", next.types.join(","));
  if (next.tags.length) sp.set("tags", next.tags.join(","));
  if (next.platform) sp.set("platform", next.platform);
  if (next.needsTypeOnly) sp.set("filter", "needs-type");
  if (next.dateMode === "all") sp.set("dates", "all");
  if (next.dateMode === "custom") {
    sp.set("from", formatDayKey(next.from));
    sp.set("to", formatDayKey(next.to));
  }
  const q = sp.toString();
  return q ? `/pending?${q}` : "/pending";
}

/** Back to pending. Only a same-site /pending path is kept. */
export function pendingBackHref(from: string | null | undefined): string {
  const safe = safeNextPath(from, "/pending");
  if (safe === "/pending" || safe.startsWith("/pending?")) return safe;
  return "/pending";
}

/** Open the review form and remember which pending list to return to. */
export function pendingEditHref(eventId: string, returnTo: string): string {
  return `/events/${eventId}/edit?from=${encodeURIComponent(returnTo)}`;
}

/** True when the card's start day sits inside the chosen dates. All open dates skips this. */
export function eventInPendingDates(startsAt: Date, state: PendingFilterState): boolean {
  if (state.dateMode === "all") return true;
  if (state.rangeError) return false;
  const key = formatDayKey(dayKeyOf(startsAt));
  return key >= formatDayKey(state.from) && key <= formatDayKey(state.to);
}

export function eventMatchesPendingFilters(
  event: { category: string; tags?: string | null; online: boolean; notes: string | null; externalUrl?: string | null; startsAt?: Date },
  state: PendingFilterState,
  needsType: boolean
): boolean {
  if (state.needsTypeOnly && !needsType) return false;
  if (state.types.length && !state.types.includes(event.category as Category)) return false;
  if (!hasAnyTag(event.tags, state.tags)) return false;
  if (state.platform && pendingPlatform(event.externalUrl) !== state.platform) return false;
  if (event.startsAt && !eventInPendingDates(event.startsAt, state)) return false;
  return true;
}

export function pendingPlatform(externalUrl: string | null | undefined): string {
  if (!externalUrl) return "Manual / no link";
  try {
    const host = new URL(externalUrl).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "eventbrite.co.uk" || host === "eventbrite.com") return "Eventbrite";
    if (host === "meetup.com") return "Meetup";
    if (host === "facebook.com") return "Facebook Events";
    if (host === "skiddle.com") return "Skiddle";
    if (host === "ticketmaster.co.uk" || host === "ticketmaster.com") return "Ticketmaster";
    return host;
  } catch {
    return "Manual / no link";
  }
}
