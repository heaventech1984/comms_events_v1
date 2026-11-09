# Gather — review

Dated ship notes: [`CHANGELOG.md`](CHANGELOG.md). Scores below from 17 October are a closed community demo, not an NHS production system. The 28 October section is the later read.

## 9 November 2026 — Book people in your cell (F04)

| Sev | Item | Status |
| --- | --- | --- |
| High | Cell leaders could not find “book a member of my cell” on the event | **Shipped** — own panel under Attend; list + Book; honest empty states |
| — | Account create / edit / delete stays admin-only | **Held** |

## 9 November 2026 — Members expert list

| Sev | Item | Status |
| --- | --- | --- |
| — | Admin + cell leader Members: search, column filters, A→Z / Z→A | **Shipped** |
| — | Account create / edit / delete stays admin-only | **Held** (FUNCTIONAL: admin creates every account) |

## 9 November 2026 — Formatting stress (D-016–D-019, D-021)

Destructive pass on long titles, junk place crumbs, empty Home bands, chopped month clocks, and first-paint ghosting. Fixes shipped on `experiment`. Login cell directory left open as **D-020**.

## 9 November 2026 — Oracle critic (product walk host)

Host: https://132.145.68.166.sslip.io at `6158e98`. Health `{ok:true}`. Door and calendar bounce walked. Attend not walked (imported cells, no seed `07000`). Railway was the wrong window; do not re-walk it for UX. Wishes parked as **D-016–D-021** in [`desirables.md`](desirables.md). Railway spare steps: [`RAILWAY-FREEZE.md`](RAILWAY-FREEZE.md).

| Sev | Item | Status |
| --- | --- | --- |
| High | Signed-in Home is six empty bands (`HomeDashboard`) | **Shipped** D-016 |
| High | Month cells truncate to chopped clocks (`14:0…`) | **Shipped** D-017 |
| High | Attend then Bookings shows unconfirmed | **Shipped** D-018 |
| Med | Event page is a form dump (`Place. T`, date twice, Attend below) | **Shipped** D-019 |
| Med | Login dropdown lists every live cell | **Open** D-020 |
| Low | Welcome first paint ghosts the brand (opacity 0 animation) | **Shipped** D-021 |
| — | Door is one form (no kind icons, no second Sign in); `?next=/calendar` bounce works | **Held** |
| — | Search tab and pink Loading… bar (Railway-only; gone on this host) | **N/A Oracle** |

## 9 November 2026 — Feedback hub (`/feedback`)

| — | Leader submit issue + member gate; admin approve desirable + copy row | **Shipped** — e2e `feedback.spec.ts` |

## 9 November 2026 — Pending polish + member feedback hub

| Sev | Item | Status |
| --- | --- | --- |
| — | Event Link new tab vs tile → edit; hover preview; multi-approve | **Shipped** |
| — | Allevents-style `00:00–01:00` clocks → Time not listed | **Shipped** — display + parser wire-up |
| — | Leaders/admins see member feedback (ratings) with filters + export | **Shipped** — Insights section; comments still private |
| Med | Re-scrape to refresh already-stored midnight junk ends | **Open** — display layer fixes old rows; new scrapes store honest ends |

## 9 November 2026 — Mobile UX max-out (web + PWA shell)

| Area | Score | Notes |
| --- | --- | --- |
| UX / mobile | **8.5 / 10** | Was ~6.5. Month day-agenda (§16 flow, blush/berry), tablet split, collapsible phone map, manifest, Playwright form-factor matrix. Manual hardware gate still optional for 9/10 — see [`MOBILE-MATRIX.md`](MOBILE-MATRIX.md). |

| Sev | Item | Status |
| --- | --- | --- |
| — | Month agenda under grid; day tap keeps `view=month` | **Shipped** |
| — | Tablet / desktop month + agenda columns | **Shipped** |
| — | PWA manifest (no offline Attend cache) | **Shipped** |
| — | E2E candybar / landscape / tablet / WebKit / Firefox | **Shipped** — matrix + full suite on desktop/phone/webkit |
| — | `SEED_UI_STRESS` long titles / busy day | **Shipped** |
| Med | Real-device sign-off (iPhone + Android + tablet) | **Open** — checklist in MOBILE-MATRIX |
| — | §16 teal palette / Forgot / Notify Me | **Out of scope** (unchanged) |

## 9 November 2026 — For you + after-event feedback

| Sev | Item | Status |
| --- | --- | --- |
| — | Personal suggestions from booked + attended events, close types and spellings | **Shipped** — Home **For you**. Local matching only (no cloud AI). Loved / not-for-me ratings nudge the list. |
| — | After-event note | **Shipped** — three-choice box after **I went** (dialog, Home, event page). Comment private; audit has the rating only. |
| Med | True meaning-match (e.g. “quiet worship” ≈ Christian with no shared words) | **Open** — would need a paid embedding model. Current matcher uses types + words. |

## 7 November 2026 — Batch member delete + past pending

| Sev | Item | Status |
| --- | --- | --- |
| — | Need to clear many people before a new Import structure | **Shipped** — admin Members: checkboxes + Delete selected; typed DELETE + count confirm; cannot delete self; cascade matches single delete. |
| — | Past events still listed under Pending | **Shipped** — Pending only shows open/future events; past PENDING auto-discarded on open. |

## 8 November 2026 — Discovery pack freeze (1000 / 150 Christian)

| — | Stretch to ~1000 Nov live events with ≥150 Christian | **Hit** ~1204 Nov / ~175 Christian. Pack capped at 100 Priority URLs; Christian slices first. Docs: `docs/scraper-discovery.md`. Pushed `experiment` to ai-xps + heaventech; Oracle seeded. Skiddle still WAF-challenges new fetches; Eventbrite may 405 from some IPs. |

## 28 October 2026 — Oracle walk and Guillaume’s scraper

Host checked: https://132.145.68.166.sslip.io at `8952c03`. Railway was not this build.

| Sev | Item | Status |
| --- | --- | --- |
| — | Guillaume: Meetup URL saved but few/no Meetup events; pending thumbs/URL/time look broken | **Fixed** `9018849` (+ harden follow-up). `meetup.com` allowlisted. Pending tiles: end time, category chip inside the card, Event Link ellipsis, flex/overflow containment. Live probe: Birmingham find URL returned 9 Meetup events; bare `meetup.com/` is “Response too large.” Oracle was still on `230a0e7` when the screenshot was taken; pulled to `610ef0a` then the harden commit. Save Birmingham find URL + Run now still needed for Meetup rows. E2E pending asserts every tile on desktop + phone. |
| — | Guillaume: priority URL not saved; Run now left pending looking the same | **Fixed** `8952c03`. Run now saves the box first. A host off the allowlist is named and not fetched. A demo-only run says pending will look the same. Allowlist later widened for Meetup (1 Nov). |
| — | Guillaume 20 Oct: delete a member, not only deactivate | **Shipped** after 17 Oct. The member form has a delete control. Bookings and stars for that person are removed. Audit rows stay, with the actor cleared. An admin cannot delete their own account. |
| — | CI database and browser tests | **Current:** GitHub Actions uses SQLite (`file:./data/ci.db`) and runs Playwright. The 17 Oct testing table below still says Postgres and “no browser suite”. That table is the 17 Oct snapshot. |
| Med | Missing or hidden event returns HTTP 200 with “That page or event does not exist.” `/nope` returns 404. | **Fixed** `26c2525`. A missing event is HTTP 404. The stuck “Loading…” line was removed in the same change. |
| Med | `http://132.145.68.166` redirects to HTTPS on the bare IP. That certificate is for the `sslip.io` name, so the browser stops. | **Fixed** `26c2525`. HTTP on the bare IP redirects to `https://132.145.68.166.sslip.io`. Typing `https://` plus the bare IP can still fail the certificate, because no public certificate is issued for a raw address. |
| — | On this Oracle database, a member saw bookers’ names and cell numbers | **Setting** — admin switch is Count and Name + Cell. Code default remains count only. |
| Low | “Loading…” stays in the status text after Calendar, Bookings, and the event page have drawn | **Fixed** `26c2525`. That loading line is no longer rendered. |
| — | Page walk: guest bounced to sign-in; admin, leader, and member rooms matched their roles; bad event fields were refused; port 3000 did not answer from outside | **Pass** |
| — | Scraper destruction probe, 28 Oct afternoon | **Used.** Oracle’s priority list was empty, so runs only updated demo rows. Random `.ics`, `http://`, `javascript:`, and a private IP are refused. Meetup was refused then; allowlisted 1 Nov. A Google Calendar `.ics` link is refused by that host’s robots.txt. `https://www.birminghamcathedral.com/whats-on/` returned 21 events. That address is now saved on Oracle (`a732f4a`). The run created 15 pending events (the feed had 21 rows; repeats share one key). The old placeholder `calendar.ics` is a 404. |

## 17 October 2026

Read of the working tree on 17 October 2026, after Guillaume’s 16 October notes and the calendar tester notes.

## Scorecard

| Area | Before this sprint | After | Why |
| --- | --- | --- | --- |
| Security | 5 | 8 | Open redirect, Event Link, colours, cron secret, formula injection, session revocation, headers. Still: `'unsafe-inline'` scripts, seed-on-start, no IP throttle. |
| Reliability | 5 | 7 | Last-place booking is locked. Day/week calendar was wrong. Still: `db push` on every start, no migrations, weekly series drift at the clock change. |
| Testing | 1 | 7 | Vitest, coverage gate on core libs, CI with Postgres. No browser end-to-end suite yet. |
| Accessibility | 6 | 7 | Confirm dialogs, `aria-current` on chips, error/loading/not-found pages. Month grid on a phone is still dense. |
| Neatness | 5 | 7 | Calendar split into a pure lib + components. Maps share one module. Insights is one calculation for page, file and share. |
| Product fit | 6 | 8 | Guillaume’s four asks plus the three calendar bugs, plus Insights for leaders. §16 mobile UI is still the next visual pass. |

## Security

| Sev | Item | Status |
| --- | --- | --- |
| High | Login `next=` open redirect | **Fixed** — `safeNextPath` |
| High | Logout / password reset left cookies valid | **Fixed** — `sessionVersion` |
| High | Cron secret in the query string, `!==` compare | **Fixed** — Bearer + `timingSafeEqual` |
| Med | Spreadsheet formula injection | **Fixed** — `safeCell` |
| Med | Import unbounded | **Fixed** — 2 MB / 2,000 rows |
| Med | `/import` page was client-only; leaders who typed the URL saw the form | **Fixed** — page checks admin; API still 403 |
| Med | Event Link any scheme | **Fixed** — http(s) only |
| Med | Category colours unvalidated | **Fixed** — `#rrggbb` |
| Med | No security headers | **Fixed** — CSP + HSTS + nosniff + frame deny |
| Med | Login throttle is per cell number only | **Backlog** — add IP / global limit |
| Med | GET export is a cookie-authenticated download | **Backlog** — prefer POST (Insights already POSTs) |
| Med | Login skips bcrypt when the account is missing | **Backlog** — dummy hash |
| Low | `Secure` cookie follows `NODE_ENV` | **Backlog** — derive from `APP_ORIGIN` |

## Data and ops

| Sev | Item | Status |
| --- | --- | --- |
| High | Two bookings can take the last place | **Fixed** — `SELECT … FOR UPDATE` |
| High | Seed demo passwords on first production boot | **Backlog** (track C) — stop seeding in production |
| High | `prisma db push` on every start; no migrations | **Backlog** (track C) |
| Med | No indexes on `(status, startsAt)` | **Backlog** |
| Med | Weekly series uses +7 UTC days (clocks go back 25 Oct) | **Fixed** for seed and scrape fixtures via London calendar days |
| Med | Scrape lock is check-then-act | **Fixed** — atomic `INSERT … ON CONFLICT` claim |
| Med | Any `https://…/*.ics` bypassed the host allowlist | **Fixed** — host must be on the list |
| Low | Unused `react-leaflet` | Removed earlier this week |

## UI and UX

| Sev | Item | Status |
| --- | --- | --- |
| High | Day/week empty; All types stuck; map vanishes | **Fixed** — re-checked 17 Oct evening; Week/Day are view tabs, not type chips |
| Med | Type chips only one at a time | **Fixed** — multi-select `types=` |
| Med | Login cell number free text | **Fixed** — dropdown of active numbers (no names) |
| Med | Add event felt lat/lng-only | **Fixed** — Find on map + pin; Online by Event Link |
| Med | Pending is a flat list; publish felt calendar-bound | **Fixed** — tiles by day; Save/Back stay on pending |
| Med | Reports only one event at a time | **Fixed** — date-range event file |
| Med | Import format not shown as a file | **Fixed** — example table + CSV template |
| Med | Leftover Meetup Priority URL 400'd the whole settings save | **Fixed** — drop disallowed URLs, save the rest, say so |
| — | 17 Oct evening tester list (multi-select, login dropdown, Find on map, Online by Event Link, quiet Add, pending tiles, Return, import template, reports range) | **Shipped** on `experiment` (`da8c50d`–`28a9929`). Re-smoke after each deploy (below). |
| High | Delete / discard / deactivate with no confirm | **Fixed** — `ConfirmDialog` |
| High | Silent client fetch failures | **Fixed** — `requestJson` |
| Med | No loading / error / not-found pages | **Fixed** |
| Med | Member cannot be deactivated | **Fixed** — form sends `on`/`off` |
| Med | Guillaume 20 Oct: prefer **delete** members (remove) over deactivate-only | **Superseded** — see 28 Oct section. The form now deletes. This row is the 17 Oct backlog. |
| Med | Empty tables have no message | **Backlog** |
| Low | Attend vs “booked” copy mix | **Backlog** |
| — | §16 mobile redesign (teal) | **Out of scope** — flow shipped 9 Nov (month agenda); teal palette not adopted |
| — | Phone month agenda + PWA matrix | **Shipped** 9 Nov — see MOBILE-MATRIX |

## Testing

| Item | Status |
| --- | --- |
| Unit tests for calendar, security, policy, exports, Insights | **In** |
| Integration: last-place race, role matrix, session bump | **In** (runs in CI against Postgres) |
| Coverage gate 90% lines on named libs | **In** |
| GitHub Actions on `experiment` and `main` | **In** |
| Browser end-to-end | **Backlog** on 17 Oct. Playwright is in CI now — see 28 Oct. |

## Live smoke (run after each deploy)

Re-run 18 October 2026 on https://commseventsv1-production.up.railway.app (admin, then leader, then member).

1. **Pass.** Week `d=2026-10-18` with Christian lists prayer / gathering / Test Guillaume / Eucharist only. All types restores Networking breakfast. Day view same date works. Map stays.
2. **Pass.** Login dropdown: numbers only, “Choose your cell number”. `/login?next=https://example.com` as member lands on `/calendar`.
3. **Pass (admin).** Pending tiles by London day; Add event `?d=` prefills 09:00–10:00; Find on map + Online by Event Link; Reports “Events in a date range”; Import example + CSV template; Members Return present. Menu at 390px.
4. **Pass (leader).** Add on days; no Import/Scraper/Audit in nav; `/import` is a sentence + Back to calendar (not the form).
5. **Pass (member).** Nav is Calendar + My bookings only; no Add event / day Add.
6. **Known leftover.** Attend already recorded on Test Guillaume from earlier smoke; “Didn’t attend” sticky from 17 Oct not re-checked this run.

Attendance prompt “Ask me next time” is session-snoozed (`sessionStorage`), so it no longer returns on every navigation. Confirming Attended / Didn’t attend still clears it for good.

## Opportunities

1. Prisma migrate; never seed production; health check; backups.
2. Browser tests (Playwright) for calendar filters, Attend, Insights export.
3. Nonce-based CSP.
4. Confirm live ICS against a real cathedral/uni feed on Railway.
5. Indexes. Broader live harvest (Eventbrite/Meetup APIs) still out.
6. Manual hardware gate on real iPhone / Android / tablet ([`MOBILE-MATRIX.md`](MOBILE-MATRIX.md)). §16 teal redesign stays out.

OpenStreetMap’s public tiles are fine for the demo. A regional rollout should use a tile provider with a usage agreement.
