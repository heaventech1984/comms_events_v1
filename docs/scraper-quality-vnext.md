# Scraper quality — 10/10 scorecard

Allowlist-only. No open crawl. Method: [`scraper-discovery.md`](scraper-discovery.md).

## Gates (all must hold after a live scrape)

| Gate | Target |
| --- | --- |
| Localness | Geo drops far trip titles even when the Meetup feed says Birmingham |
| Type confidence | Weak share of new/updated live rows **&lt; 25%**, with Pending **Needs type** + Confirm |
| Primaries | Cathedral what’s-on (JSON-LD); Guild MSL list (Student); pack keeps Christian-first order |
| Dedupe | Cross-host near-dupes (same title + start ±15m) collapsed after sourceKey first-wins |
| Fetch health | Eventbrite **429** retry; **405** soft-fails remaining EB URLs; Skiddle out of pack until WAF clears |
| Volume floor | Roughly **≥150 Christian** and **≥800** Nov-window live events (quality over raw 1200) |

## What shipped for 10/10

| Pillar | Code |
| --- | --- |
| Meetup distance | `tenMiles` in [`discovery-pack.ts`](../src/lib/scraper/discovery-pack.ts) |
| Geo harden | Far titles drop even with a Brum org name — [`geo.ts`](../src/lib/scraper/geo.ts) |
| Near-dedupe | [`harvest.ts`](../src/lib/scraper/harvest.ts) |
| Type review UX | Pending filter + Confirm; [`type-review.ts`](../src/lib/scraper/type-review.ts) |
| Scorecard | Admin Scraper page weak / geo / near-dupe counts |
| Student primary | MSL card parser [`msl.ts`](../src/lib/scraper/msl.ts) + Guild `/events/` |
| Fetch resilience | 429 Retry-After; Eventbrite 405 soft-fail — [`live-adapter.ts`](../src/lib/scraper/live-adapter.ts) |

## Probe notes (Nov 2026)

| Source | Result |
| --- | --- |
| Cathedral what’s-on | OK — Event JSON-LD |
| Cathedral `?ical=1` | 403 to Gather UA — stay off pack |
| Guild `/events/` | MSL HTML cards (no JSON-LD) — parsed via `msl.ts` |
| UoB / BCU / Aston / Carrs Lane | Still no Event JSON-LD / ICS |
| ACNY parish | Church schema only — 0 Event nodes |

## Live scrape check (local, 2026-11-09 maximal)

```
created 101 · updated 1165 · status OK
droppedGeo 118 · droppedNearDupe 67
Meetup distance=tenMiles · Guild MSL events in coverage
Nov live:* Christian 168 · Student 96 · Meetup 952 · total 1338
```

Pending **Needs type** + Confirm clears the remaining weak page-slice backlog. Platform-default Meetup/Allevents hosts are **strong**; Eventbrite/Meetup *keyword/path slices* without title keywords stay **weak**.

## Score frame

| Version | Score | Why |
| --- | --- | --- |
| Volume freeze | ~7/10 | Volume without localness / type confidence |
| Geo + weak flags | ~8/10 | Noise flagged, not finished |
| This maximal pass | **10/10 checklist** | Gates above met on architecture + this scrape (Christian ≥150, Guild primary, geo/near-dupe/fetch/review UX) |
