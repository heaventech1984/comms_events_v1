import { parseTypesParam, type CalendarFormat } from "./calendar";
import { CATEGORIES, type Category } from "./constants";

export type PendingFilterState = {
  types: Category[];
  format: CalendarFormat;
  needsTypeOnly: boolean;
};

export function parsePendingFilters(params: {
  types?: string;
  format?: string;
  filter?: string;
}): PendingFilterState {
  const format: CalendarFormat =
    params.format === "online" || params.format === "inperson" ? params.format : "";
  return {
    types: parseTypesParam(params.types),
    format,
    needsTypeOnly: params.filter === "needs-type"
  };
}

export function togglePendingType(current: Category[], category: Category): Category[] {
  if (current.includes(category)) return current.filter((c) => c !== category);
  return CATEGORIES.filter((c) => current.includes(c) || c === category);
}

/** Build /pending?... keeping other filters when one chip changes. */
export function pendingHref(state: PendingFilterState, patch: Partial<PendingFilterState> = {}): string {
  const next: PendingFilterState = {
    types: patch.types ?? state.types,
    format: patch.format !== undefined ? patch.format : state.format,
    needsTypeOnly: patch.needsTypeOnly !== undefined ? patch.needsTypeOnly : state.needsTypeOnly
  };
  const sp = new URLSearchParams();
  if (next.types.length) sp.set("types", next.types.join(","));
  if (next.format) sp.set("format", next.format);
  if (next.needsTypeOnly) sp.set("filter", "needs-type");
  const q = sp.toString();
  return q ? `/pending?${q}` : "/pending";
}

export function eventMatchesPendingFilters(
  event: { category: string; online: boolean; notes: string | null },
  state: PendingFilterState,
  needsType: boolean
): boolean {
  if (state.needsTypeOnly && !needsType) return false;
  if (state.types.length && !state.types.includes(event.category as Category)) return false;
  if (state.format === "online" && !event.online) return false;
  if (state.format === "inperson" && event.online) return false;
  return true;
}
