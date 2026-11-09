/** One sentence for the scraper form. Does not include the technical allowlist reason. */
export function droppedPriorityUrlMessage(rejected: { url: string }[]): string | null {
  if (!rejected.length) return null;
  const list = rejected.map((row) => row.url).join(", ");
  return rejected.length === 1
    ? `This address is not on the allowlist, so it was not saved: ${list}`
    : `These addresses are not on the allowlist, so they were not saved: ${list}`;
}

type RunSource = { url: string; ok: boolean; eventCount: number; error?: string };

export type RunFinishedSummary = {
  /** Short headline for the status banner. */
  headline: string;
  /** Extra plain-language lines (drops, feeds, next step). */
  details: string[];
  /** Host → listing count for the result card. */
  topSites: { host: string; count: number }[];
  feedsOk: number;
  feedsFailed: number;
  feedsEmpty: number;
  created: number;
  updated: number;
  pending: number;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Structured run result for the scraper page (easy to scan). */
export function runFinishedSummary(input: {
  createdCount?: number;
  updatedCount?: number;
  publishedCount?: number;
  discardedByRule?: number;
  leftPending?: number;
  skippedHumanEdited?: number;
  droppedDisabledCategory?: number;
  droppedNearDupe?: number;
  droppedGeo?: number;
  sources?: RunSource[];
  dropped?: { url: string }[];
}): RunFinishedSummary {
  const created = input.createdCount ?? 0;
  const updated = input.updatedCount ?? 0;
  const pending = input.leftPending ?? 0;
  const published = input.publishedCount ?? 0;
  const discarded = input.discardedByRule ?? 0;
  const skipped = input.skippedHumanEdited ?? 0;
  const details: string[] = [];
  const dropped = droppedPriorityUrlMessage(input.dropped ?? []);
  if (dropped) details.push(dropped);

  const bits: string[] = [];
  if (created) bits.push(`${created} new`);
  if (updated) bits.push(`${updated} refreshed (place and Event Link updated when the feed had them)`);
  if (published) bits.push(`${published} published straight away`);
  if (pending) bits.push(`${pending} waiting in Pending`);
  if (discarded) bits.push(`${discarded} discarded by organisation rules`);
  if (skipped) bits.push(`${skipped} left alone (already edited by a person)`);
  const headline =
    bits.length > 0
      ? `Scrape finished — ${bits.join("; ")}.`
      : "Scrape finished — nothing new this time.";

  const typeDrops = input.droppedDisabledCategory ?? 0;
  if (typeDrops > 0) {
    details.push(
      `${typeDrops} listing(s) skipped because that event type is turned off (turn Meetup on in settings to keep Meetup feeds).`
    );
  }
  const geoDrops = input.droppedGeo ?? 0;
  if (geoDrops > 0) {
    details.push(
      `${geoDrops} listing(s) skipped — they did not look like Birmingham / West Midlands (or online).`
    );
  }
  const nearDupes = input.droppedNearDupe ?? 0;
  if (nearDupes > 0) {
    details.push(`${nearDupes} listing(s) skipped as near-duplicates (same title and start time).`);
  }

  const sources = input.sources ?? [];
  const ok = sources.filter((source) => source.ok && source.eventCount > 0);
  const failed = sources.filter((source) => !source.ok);
  const empty = sources.filter((source) => source.ok && source.eventCount === 0);
  const topSitesMap = new Map<string, number>();
  for (const source of ok) {
    const host = hostOf(source.url);
    topSitesMap.set(host, (topSitesMap.get(host) ?? 0) + source.eventCount);
  }
  const topSites = [...topSitesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([host, count]) => ({ host, count }));

  if (sources.length === 0) {
    details.push(
      created === 0
        ? "No live feed was fetched. Demo events already stored are refreshed in place, so Pending can look the same."
        : "No Priority URL was fetched. New rows came from the demo harvest."
    );
  } else {
    if (ok.length) {
      details.push(
        `${ok.length} feed(s) returned listings (${ok.reduce((n, s) => n + s.eventCount, 0)} before dedupe).`
      );
    }
    if (failed.length) {
      details.push(`${failed.length} feed(s) failed (blocked, timeout, or error) — the others still ran.`);
    }
    if (empty.length) {
      details.push(`${empty.length} feed(s) had no calendar events this time.`);
    }
    details.push("Open Pending to review — filter by type or Online / In person.");
  }

  return {
    headline,
    details,
    topSites,
    feedsOk: ok.length,
    feedsFailed: failed.length,
    feedsEmpty: empty.length,
    created,
    updated,
    pending
  };
}

/** What Run now should say (single string — tests and simple banners). */
export function runFinishedMessage(input: Parameters<typeof runFinishedSummary>[0]): string {
  const summary = runFinishedSummary(input);
  const top =
    summary.topSites.length > 0
      ? ` Top sites: ${summary.topSites.map((s) => `${s.host} ${s.count}`).join(" · ")}.`
      : "";
  return [summary.headline, ...summary.details].join(" ") + top;
}
