# Scraper quality — vNext toward 8–9 / 10

**Applied in code (this pass).** Builds on the frozen discovery pack.

## What changed

| Pillar | What we did |
| --- | --- |
| Cleaner geo | [`src/lib/scraper/geo.ts`](../src/lib/scraper/geo.ts) keeps online, trusted primary hosts, WM lat/lng box, local place names; drops far cities (e.g. Nottingham/Leicester without a Brum signal). Applied after every live fetch. Far Allevents cities (Stoke/Leicester/Nottingham) removed from the pack. |
| Human category review | [`categorise.ts`](../src/lib/scraper/categorise.ts) returns **strong / weak / none**. Aggregator page-only guesses are **weak** → `needsTypeReview` + note asking admin to confirm before Publish. Title/host matches stay **strong**. |
| Primary calendars | **Working church primary:** Cathedral what’s-on (schema.org Event JSON-LD). Direct Tribe iCal URLs return **HTTP 403** to our bot — left off the pack. **Uni / Carrs Lane** HTML probed: no Event JSON-LD or ICS yet — stay allowlisted, not in the Priority pack until they expose calendars. |

## Probe notes (Nov 2026)

| Source | Result |
| --- | --- |
| `birminghamcathedral.com/whats-on/` | OK — ~21 Event JSON-LD nodes + `.ics` links in HTML |
| Cathedral `?ical=1` feeds | 403 Forbidden to Gather UA |
| Guild / UoB / BCU SU / Aston SU / Carrs Lane events pages | 200 HTML, **0** Event schema / ICS |

## Still open (for a later 9/10)

- Structured uni / SU calendars when Guild, BCU, Aston expose ICS or Event JSON-LD.
- Optional admin “confirm type” bulk tool on Pending.
- Re-enable Eventbrite on Oracle when that IP stops getting HTTP 405.
- Tighter Meetup distance (tenMiles) once volume is enough without fiftyMiles.

## Live scrape output (local, 2026-11-09)

```
createdCount: 90 · updatedCount: 1155 · leftPending: 90
droppedGeo: 116
Cathedral what’s-on: 21 events OK
Nov live:* rows: 1265  (Christian 157 · Networking 68 · Professional 36 · Student 41 · Meetup 963)
Weak category notes (human review): 788
Cathedral-sourced in Nov: 12
Coverage THIS WEEK: 580  (Christian 91 · … · Meetup 416)
Coverage THIS MONTH table: 664  (Christian 97 · … · Meetup 487)
```

## Score frame

| Version | Score | Why |
| --- | --- | --- |
| Volume freeze (~1200 Nov) | ~7/10 | Lots of rows; noisy geo + soft categories |
| This vNext | **~8/10** | Geo drops far rows; weak types flagged for humans; cathedral HTML primary works |
| Still short of 9 | — | Meetup/Allevents-heavy; ~62% weak categories; uni calendars still empty; some trip titles slip via Birmingham Meetup feeds |

**Assumptions:** Score is editorial (volume + localness + type confidence + primary-calendar health), not a unit test. Trade-off: geo is name/bbox based — online and Brum-scoped feeds can still keep distant trip titles until place text is richer.
