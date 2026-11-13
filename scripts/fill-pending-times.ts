import { loadClockMisses, saveClockMisses } from "../src/lib/scraper/clock-misses";
import { DETAIL_TIME_CAP, backfillPendingDateOnlyTimes, splitPendingSeriesSpans } from "../src/lib/scraper/detail-time";

async function main() {
  const pauseMs = Number(process.env.SCRAPE_PAUSE_MS ?? "1500") || 1500;
  const budget = { left: DETAIL_TIME_CAP };
  const missedUrls = loadClockMisses();
  const clocks = await backfillPendingDateOnlyTimes({ pauseMs, budget, missedUrls, week: "only" });
  const series = await splitPendingSeriesSpans({ pauseMs, budget });
  saveClockMisses(missedUrls);
  console.log(
    `Pending clocks updated ${clocks.updated}, series sittings created ${series.created}, old series rows discarded ${series.discarded}, pages opened ${clocks.fetched + series.fetched}.`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Could not fill pending times.";
  console.error(message);
  process.exit(1);
});
