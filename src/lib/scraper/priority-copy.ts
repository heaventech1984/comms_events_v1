/** One sentence for the scraper form. Does not include the technical allowlist reason. */
export function droppedPriorityUrlMessage(rejected: { url: string }[]): string | null {
  if (!rejected.length) return null;
  const list = rejected.map((row) => row.url).join(", ");
  return rejected.length === 1
    ? `This address is not on the allowlist, so it was not saved: ${list}`
    : `These addresses are not on the allowlist, so they were not saved: ${list}`;
}

type RunSource = { url: string; ok: boolean; eventCount: number; error?: string };

/** What Run now should say, including why the pending queue can look unchanged. */
export function runFinishedMessage(input: {
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
}): string {
  const created = input.createdCount ?? 0;
  const updated = input.updatedCount ?? 0;
  const parts: string[] = [];
  const dropped = droppedPriorityUrlMessage(input.dropped ?? []);
  if (dropped) parts.push(dropped);
  parts.push(
    `Run finished: created ${created}, updated ${updated}, published ${input.publishedCount ?? 0}, discarded ${input.discardedByRule ?? 0}, pending ${input.leftPending ?? 0}, skipped human-edited ${input.skippedHumanEdited ?? 0}.`
  );
  const typeDrops = input.droppedDisabledCategory ?? 0;
  if (typeDrops > 0) {
    parts.push(
      `${typeDrops} harvested event(s) were dropped because their type toggle is off (turn Meetup on to keep Meetup feeds).`
    );
  }
  const geoDrops = input.droppedGeo ?? 0;
  if (geoDrops > 0) {
    parts.push(
      `${geoDrops} harvested event(s) were dropped because they did not look Birmingham / West Midlands (or online).`
    );
  }
  const nearDupes = input.droppedNearDupe ?? 0;
  if (nearDupes > 0) {
    parts.push(
      `${nearDupes} harvested event(s) were dropped as cross-host near-duplicates (same title and start).`
    );
  }
  const sources = input.sources ?? [];
  if (sources.length === 0) {
    parts.push(
      created === 0
        ? "No live feed was fetched. Demo events already stored are updated in place, so the pending list looks the same."
        : "No Priority URL was fetched. New rows came from the demo harvest."
    );
  } else {
    const ok = sources.filter((source) => source.ok && source.eventCount > 0);
    const failed = sources.filter((source) => !source.ok);
    const empty = sources.filter((source) => source.ok && source.eventCount === 0);
    if (ok.length) {
      parts.push(
        `${ok.length} feed(s) returned events (${ok.reduce((n, s) => n + s.eventCount, 0)} listings before dedupe).`
      );
      const byHost = new Map<string, number>();
      for (const source of ok) {
        let host = source.url;
        try {
          host = new URL(source.url).hostname.replace(/^www\./, "");
        } catch {
          // keep raw
        }
        byHost.set(host, (byHost.get(host) ?? 0) + source.eventCount);
      }
      const top = [...byHost.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([host, n]) => `${host} ${n}`)
        .join(" · ");
      if (top) parts.push(`Top sites: ${top}.`);
    }
    if (failed.length) {
      parts.push(`${failed.length} feed(s) failed (blocked, timeout, or error).`);
    }
    if (empty.length) {
      parts.push(`${empty.length} feed(s) had no calendar events this time.`);
    }
    parts.push("Open Pending to review — filter by type or Online / In person.");
  }
  return parts.join(" ");
}
