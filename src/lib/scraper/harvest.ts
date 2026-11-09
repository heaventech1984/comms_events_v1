import type { Category } from "../constants";
import type { ScrapedEvent } from "./types";

export const FETCH_BODY_MAX = 1024 * 1024;
export const URL_EVENT_CAP = 300;
/** Wide Birmingham discovery can return hundreds of unique rows per run. */
export const RUN_EVENT_CAP = 2500;
/** Same title + start within this window → treat as one listing across hosts. */
export const NEAR_DEDUPE_MS = 15 * 60 * 1000;

export type HarvestSelection = {
  events: ScrapedEvent[];
  /** Live/fixture rows dropped because their inferred type toggle is off. */
  droppedDisabledCategory: number;
  /** Cross-host near-duplicates dropped after sourceKey first-wins. */
  droppedNearDupe: number;
};

/** Lowercase letters/digits only — for cross-host title match. */
export function normalisedTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNearDuplicate(a: ScrapedEvent, b: ScrapedEvent): boolean {
  if (normalisedTitle(a.title) !== normalisedTitle(b.title)) return false;
  return Math.abs(a.startsAt.getTime() - b.startsAt.getTime()) <= NEAR_DEDUPE_MS;
}

/** Keep earlier rows (Christian-first pack order); drop later cross-host twins. */
export function collapseNearDuplicates(events: ScrapedEvent[]): {
  events: ScrapedEvent[];
  droppedNearDupe: number;
} {
  const kept: ScrapedEvent[] = [];
  let droppedNearDupe = 0;
  for (const event of events) {
    if (kept.some((row) => isNearDuplicate(row, event))) {
      droppedNearDupe += 1;
      continue;
    }
    kept.push(event);
  }
  return { events: kept, droppedNearDupe };
}

/**
 * Live events keep the first sourceKey (specific slices before broad “all events”).
 * Fixtures overwrite the same key (demo wins). Unclassified rows are kept even when
 * their holding type is switched off. Near-dupes then collapse; cap is last.
 */
export function selectHarvestEvents(
  live: ScrapedEvent[],
  fixtures: ScrapedEvent[],
  enabled: Set<Category>
): HarvestSelection {
  const byKey = new Map<string, ScrapedEvent>();
  let droppedDisabledCategory = 0;

  const take = (event: ScrapedEvent, overwrite: boolean) => {
    if (!event.needsTypeReview && !enabled.has(event.category)) {
      droppedDisabledCategory += 1;
      return;
    }
    if (!overwrite && byKey.has(event.sourceKey)) return;
    byKey.set(event.sourceKey, event);
  };

  for (const event of live) take(event, false);
  for (const event of fixtures) take(event, true);

  const collapsed = collapseNearDuplicates([...byKey.values()]);
  return {
    events: collapsed.events.slice(0, RUN_EVENT_CAP),
    droppedDisabledCategory,
    droppedNearDupe: collapsed.droppedNearDupe
  };
}
