import { backfillPendingDateOnlyTimes } from "../src/lib/scraper/detail-time";

const result = await backfillPendingDateOnlyTimes({ pauseMs: Number(process.env.SCRAPE_PAUSE_MS ?? "1500") || 1500 });
console.log(`Pending clocks updated ${result.updated}, pages opened ${result.fetched}.`);
