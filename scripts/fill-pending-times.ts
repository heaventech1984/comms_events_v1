import { backfillPendingDateOnlyTimes } from "../src/lib/scraper/detail-time";

async function main() {
  const result = await backfillPendingDateOnlyTimes({ pauseMs: Number(process.env.SCRAPE_PAUSE_MS ?? "1500") || 1500 });
  console.log(`Pending clocks updated ${result.updated}, pages opened ${result.fetched}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Could not fill pending times.";
  console.error(message);
  process.exit(1);
});
