import { parseTypesParam } from "./calendar";
import { CATEGORIES, type Category, type Tag } from "./constants";
import { safeNextPath } from "./security";
import { hasAnyTag, parseTagsParam, toggleTag } from "./tags";

export type PendingFilterState = {
  types: Category[];
  tags: Tag[];
  needsTypeOnly: boolean;
};

export function parsePendingFilters(params: {
  types?: string;
  tags?: string;
  format?: string;
  filter?: string;
}): PendingFilterState {
  let tags = parseTagsParam(params.tags);
  if (!tags.length && params.format === "online") tags = ["Online"];
  if (!tags.length && params.format === "inperson") tags = ["In Person"];
  return {
    types: parseTypesParam(params.types),
    tags,
    needsTypeOnly: params.filter === "needs-type"
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
    needsTypeOnly: patch.needsTypeOnly !== undefined ? patch.needsTypeOnly : state.needsTypeOnly
  };
  const sp = new URLSearchParams();
  if (next.types.length) sp.set("types", next.types.join(","));
  if (next.tags.length) sp.set("tags", next.tags.join(","));
  if (next.needsTypeOnly) sp.set("filter", "needs-type");
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

export function eventMatchesPendingFilters(
  event: { category: string; tags?: string | null; online: boolean; notes: string | null },
  state: PendingFilterState,
  needsType: boolean
): boolean {
  if (state.needsTypeOnly && !needsType) return false;
  if (state.types.length && !state.types.includes(event.category as Category)) return false;
  if (!hasAnyTag(event.tags, state.tags)) return false;
  return true;
}
