# Changelog

What each Gather demo build shipped. Newest first.

A **changelog** is a dated notebook of “what we put on the noticeboard,” not the full story of *why* (that stays in [`DECISIONS.md`](../DECISIONS.md)).

| Where | What people open | Code |
| --- | --- | --- |
| Oracle (runs `experiment`) | https://132.145.68.166.sslip.io | Newest app change in this file: *People attendance, next or past 7 days* |
| Railway (announced demo, auto-deploy paused) | https://commseventsv1-production.up.railway.app | Last Postgres build. It does not include the 28 Oct notes. |

`package.json` stays `1.0.0` until a numbered church release.

Git history is the source of truth. Smoke checklists live in [`REVIEW.md`](REVIEW.md). Sign-off stays blank in [`FUNCTIONAL.md`](FUNCTIONAL.md) until An, Becca and Guillaume choose to sign.

Style later: [Keep a Changelog](https://keepachangelog.com/).

---

## 2026-11-24 — People attendance, next or past 7 days

- Insights calls the list People attendance. It opens on the next 7 days, the people who clicked Attend, soonest day first. Past 7 days lists people marked as having gone, latest day first. Each day is a blush band with a berry edge, and the events and names sit indented under the day.
- Show on Reach, Showing up, and Room reloads beside those tiles. Show on People attendance stays on that card.

## 2026-11-24 — Say I went until the end of the day

- After an event finishes, I went stays available until the end of that calendar day even if you never clicked Attend. Pressing it records that you went, then asks how it felt. I didn’t stays only for someone who already booked.

## 2026-11-24 — Attend until the finish, then mark the day

- Attend stays open until the event finishes. After it finishes, on the calendar day it occupies, a booked person can press I attended or I didn’t. I attended then asks how it felt. The next London day, those buttons and the ask are gone.
- Insights lists people marked attended, grouped by the London day the event started. Its own menu is the past 7, 30, or 90 days. Reach, Showing up, and Room & sharing share a second menu for those same three windows. The activity charts keep the period they already had.
- Saving or deleting a published event returns to the calendar view you came from. Back to calendar on an event is a button. The attendee table is Name, Cell number, Attendance, and Action.

## 2026-11-19 — Show attendees and booking controls consistently

- Insights starts with published events in the next seven London calendar days, including today, that have at least one attendee. It lists each attendee's name and cell number; analytics default to the last 30 days, with feedback filters kept in the feedback section.
- Every signed-in role sees all event attendees directly below the booking count. Admins and cell leaders can remove any attendee; admins can book any active member, while cell leaders can book only members of their own cell. The old attendee-visibility selector is removed because it no longer controls the event page.
- Calendar Today and previous/next controls sit right-aligned below the time-band setting and immediately above the calendar.

## 2026-11-18 — Configure Eventbrite discovery and filter Pending by platform

- Admins can configure Brave Eventbrite search weekdays, page count (up to 10), location, alternative search terms, and whether full manual runs include the search. The Scraper page previews the formed query, using the Europe/London calendar month seven days after each run, and has a separate button to run only Eventbrite discovery immediately. Searches paginate up to 20 results per page, stop when Brave reports no more results, and continue to fetch direct event pages through Gather's existing safety and Pending-review flow.
- Pending can be filtered by source platform, derived from each event's external link so existing rows remain filterable without backfilling the database.

## 2026-11-17 — Discover Eventbrite event pages through search

- The scraper can use a configured Brave Search API key to discover individual UK Eventbrite event links from fixed Birmingham searches. It keeps only direct event-page URLs, fetches pages through Gather’s existing allowlist and robots-aware scraper, and sends new search-discovered events to Pending for review. Search is capped at five queries and 60 page URLs per run.
- The production integration remains inactive until `BRAVE_SEARCH_API_KEY` is configured with an API plan that grants storage rights. No API key was present during this deployment.

---

## 2026-11-17 — Paste event details and show current time

- When a public event page cannot be read, admins and cell leaders can paste its copied content. Gather extracts a draft for review without fetching the blocked page or storing the pasted source text.
- Day and Week calendar grids show a live London-time line in today’s column while it is within the visible time band.

---

## 2026-11-17 — Add events from a page and show category art on calendar events

- Admins and cell leaders can import public HTTPS event pages through the existing scraper parsers, choose an extracted event, review and edit the prefilled details, and save it. Imports are bounded, DNS-pinned, robots-aware and restricted to public HTTPS destinations; likely duplicates are flagged. Robots denials, robots fetch failures and Cloudflare challenges now have distinct messages. The robots parser honors more-specific Allow rules, such as a site's permitted iCal path. DNS pinning handles Node's address-family lookup mode. Successful imports are recorded for admins. Admins can add an already allowlisted page as a recurring feed or request review before a new host can be allowlisted.
- Day and Week event cards show the existing category artwork before the title. The Month selected-day agenda already uses the same artwork.

---

## 2026-11-17 — Shift recurring event schedules

- **Edit Series** now lets an editor change the selected start and end date/time. The same London calendar-time shift and selected duration apply to this and later occurrences; earlier events stay unchanged. The update preserves event rows and bookings, attendance and feedback, and rejects a shifted occurrence that lands in a nonexistent London clock time.

---

## 2026-11-17 — Return to the same calendar place

- Adding or editing an event keeps the calendar view and selected day for the return link, including after saving. A bare calendar visit and sign-in with no requested destination open Day.

---

## 2026-11-17 — Edit one event or its series

- Recurring events offer **Edit One Off** and **Edit Series**. One-off edits affect only the selected event. Series edits update shared details for that event and later occurrences, preserving their dates, times, bookings, attendance and feedback; earlier occurrences stay unchanged. The edit is confirmed with the number of affected events.

---

## 2026-11-13 — Filter pending from scraper settings

- The scraper screen has Filter Out from current settings beside Run now. It discards pending events whose type is unticked or whose city is outside the miles. Meetup events stay. A card with no city can have its own page opened once.

## 2026-11-13 — Scraper miles from the city centre

- The scraper keeps an event when the city on the page is within a circle around Birmingham city centre. The circle starts at 10 miles and can be changed on the scraper screen. Town pages further out are not opened.

## 2026-11-13 — Clocks for this week's pending cards

- The 120 event-page openings go to pending cards in the next 7 days first. A page that had no clock is not opened again. A single event page uses a clock already in that download, such as 7:30 PM, even when the hidden data is only midnight.

## 2026-11-13 — Tag buttons show a mark

- Each tag button shows a small mark in front of the word, such as ✝️ Christian. The saved tag is still the word.

## 2026-11-13 — Pending opens on the next 7 days

- Pending review starts on today through the same weekday next week. From and To change that window. All open dates shows every card that has not finished. Cards outside the window stay in the queue.

## 2026-11-13 — Four categories and tags

- Categories are Social, Professional, Faith, and Activities. An event has one. Tags such as Christian, University, Meetup, In Person, and Online can be several.
- Calendar, Home, and Pending can select more than one category and more than one tag. The old Any format row is gone. The Calendar tab remembers the last categories and tags in this browser.
- The scraper sets the shelf and the tags from the title it already has. A search-page address cannot set Faith or the Christian tag unless the title agrees. The Meetup tag is only for meetup.com.

## 2026-11-13 — One card per series date

- A page with many dates, such as Book Magic every Sunday, becomes one pending event per sitting. Each sitting keeps that day's clock (11:30–12:00), not a span from the first date to the last.
- The old spanning pending row is discarded when those sittings are saved. Past sittings are not added.

## 2026-11-13 — Pending clocks from the event page

- A listing that only has a date no longer stays as **00:00–00:00**. The scrape opens the event page (up to 120 a run) and copies a real clock when that page has one.
- Back to pending returns to the same filters and the same scroll.

## 2026-11-12 — Calendar starts on today

- Week and list open on today and run seven days. ← shows the seven days before that. Month stays a Monday month. Day stays one day.
- Back to calendar returns to the same view, date, and scroll. A fresh week or day grid starts at 08:00, scrolled to the bottom.

## 2026-11-12 — Cell leaders see who is going

- On an event, a cell leader sees the same name and cell-number list a member sees, when the admin switch is Count and Name + Cell.
- The “Your cell” table is unchanged. It still lists only that leader’s own cell, with attendance and remove.

## 2026-11-12 — Pending cards keep Approve and Discard

- A search page no longer labels an event. `keywords=christian` does not make a DevOps workshop Christian. The title has to agree.
- Pending cards always end with Approve and Discard. A doubtful type stays the **Needs type** flag, for the event page later. Opening Pending rewrites labels the title does not support.

## 2026-11-09 — Book people in your cell (F04)

- Cell leaders see a **Book people in your cell** panel on the event page: a named list with Book, not a cramped dropdown.
- Honest empty copy when the cell is missing, empty, full, or already going. Search appears for larger cells.
- Policy `canDelegateBooking` + helper tests; leader e2e books a cell member onto a future event.

## 2026-11-09 — Members expert list (admin + cell leader)

- Members is one searchable list for **admin** and **cell leader**. Filter by name, cell number, cell, permission, and active/inactive. Sort any column **A→Z** or **Z→A**.
- Admin still Adds, Edits, and Delete-selected. Cell leaders see their own cell only and cannot create or delete accounts.
- Header clicks reverse the same sort. Showing *n of N* and Clear filters.

## 2026-11-09 — Formatting (D-016–D-019, D-021)

- Home shows the next booked/starred event, then only bands that have something in them (D-016).
- Month cells use category dots, not chopped `14:0…` clocks; tap a day for full titles (D-017).
- After Attend, Bookings says **Going** until the event ends (D-018).
- Event page is title, when, where, Attend — junk `Place. T` / form labels / scraper kicker gone (D-019).
- Welcome and Home no longer start at opacity 0, so the brand does not blink empty (D-021).
- Long titles wrap; blank place crumbs become “In person”.

## 2026-11-09 — Feedback page (issues + desirables)

- `/feedback` for admin and cell leader: **Issues** first (`I-xxx`), **Desirables** second (`FD-xxx` queue). Optional one image (JPEG/PNG, 500KB). Admin approves desirables → assigns `D-xxx`, copies markdown row for [`desirables.md`](desirables.md). Members gated until v2. API: `/api/gather-feedback`. Policy tests in `tests/unit/feedback-hub-policy.test.ts`.

## 2026-11-09 — Desirables board (D- / T- ids)

- Open wishes: [`desirables.md`](desirables.md) (`D-001`–`D-015` seeded). Built index: [`built_features.md`](built_features.md) (`D-R01`–`D-R09` retro). Pictures: [`visuals.md`](visuals.md), [`design-mockups/README.md`](design-mockups/README.md), [`desirables/visuals/`](desirables/visuals/). How-to: [maintenance README](tutorials/maintenance/README.md#updating-desirables-wish-list).

## 2026-11-09 — Pending polish + member feedback hub

- Pending: Event Link opens the listing in a **new tab**; the tile body still opens edit. Hover/focus preview on fine pointers. Multi-select + **Approve selected** / **Discard selected** (`POST /api/events/batch`).
- Date-only scrapes show **Time not listed** instead of `00:00–01:00` (schema-date wired into JSON-LD / microdata / ICS).
- Insights **Member feedback**: cell-scoped ratings table + filters + CSV export dataset. Free-text notes stay private.

## 2026-11-09 — Mobile UX max-out (web + PWA shell)

- Month view: day tap stays on `view=month&d=…`; full-title **day agenda** under the grid; category dots on narrow screens; tablet/desktop split layout.
- Phone map starts collapsed; week scroll `touch-action` hardened; dialogs scroll on short candybar / landscape so “Ask me next time” stays reachable; safe-area / 16px input / hover gates audited.
- Web app manifest (standalone, no service worker for bookings). Playwright matrix: candybar, landscape, tablet, WebKit, Firefox + [`docs/MOBILE-MATRIX.md`](MOBILE-MATRIX.md). `SEED_UI_STRESS=1` fixtures for long titles / busy day.

## 2026-11-09 — For you + after-event feedback

- Home **For you**: suggests upcoming events from what this person booked and what they marked as attended. Neighbouring types (e.g. Networking ~ Professional) and close title spellings count. No cloud AI.
- After **I went**: a three-choice “How was it?” box (Loved it / It was fine / Not for me) plus an optional private note. Feeds the next suggestions. Audit stores the rating, not the comment.

## 2026-11-09 — Scraper extras-only box + readable scrape results

- Priority box stores **gap-fillers only**; pack URLs are stripped on save/load. Run still merges the full Birmingham pack.
- Re-scrape **refreshes** place and Event Link when the feed has richer detail (keeps prior when thin).
- Scraper page shows a clear **Last scrape** card (counts, top sites, Pending shortcuts) instead of one long status line.

## 2026-11-09 — Pending type/format filters + pack-first scrape

- Pending matches calendar chips: **All types** / each type, **Any format** / In person / Online, plus Needs type.
- Tiles show place, Online/In person, clearer Event Link, and **Open listing**.
- Run now always fetches the frozen discovery pack first; Priority box lines are extras. Friendlier run summary (site counts, not a URL dump).

## 2026-11-09 — Maximal scraper 10/10 checklist

- Meetup **tenMiles**; geo drops far trip titles even with a Brum org/feed.
- Cross-host **near-dedupe** (title + start ±15m); Eventbrite **429/405** soft-fail.
- Pending **Needs type** filter + Confirm; Scraper quality scorecard (weak / geo / near-dupe).
- Student primary: Guild MSL event cards ([`msl.ts`](../src/lib/scraper/msl.ts)). Scorecard: [`scraper-quality-vnext.md`](scraper-quality-vnext.md).

## 2026-11-09 — Less repeated place / date / time

- Tidies scraped places (`Birmingham, Birmingham, gb` → one city).
- Day groups show the date once; tiles show clocks only.
- Event header ranges show the date once on the same day (`10:00–11:30`).

## 2026-11-09 — Scraper quality vNext (geo + category review)

- Birmingham / West Midlands **geo filter** after live harvest ([`geo.ts`](../src/lib/scraper/geo.ts)); far Allevents cities dropped from the pack.
- Category **strong / weak / none** — aggregator page-only guesses flag `needsTypeReview` for human confirm ([`categorise.ts`](../src/lib/scraper/categorise.ts)).
- Church primary: Cathedral what’s-on (JSON-LD). Direct iCal feeds 403 to bots; uni HTML still lacks Event schema — notes in [`scraper-quality-vnext.md`](scraper-quality-vnext.md).

## 2026-11-08 — Frozen Birmingham discovery pack (stretch)

- Locked multi-source scrape for the five types (Eventbrite slices + nearby cities, Meetup faith/keyword finds, Allevents Brum/WM/Midlands, Ticketmaster, cathedral, Luma, Visit Birmingham). Method: [`docs/scraper-discovery.md`](scraper-discovery.md).
- Caps: **100** Priority URLs, 2500 events/run, 1500ms pause. Christian feeds listed first. Empty Settings installs the pack; `FORCE_DISCOVERY_PACK=1` re-applies. Admin Coverage: this week + whole month by day/type.
- Seed helper: `npx tsx scripts/seed-discovery-pack.ts`. Freeze harvest: **~1204** live November events (**~175 Christian**).

## 2026-11-07 — Pending hides past events

- Pending review only shows events that have not finished yet (end time, or start + 3 hours if no end). Past PENDING rows are marked discarded when someone opens Pending, so they leave the queue.

## 2026-11-07 — Members: Delete selected (batch)

- Admin Members: checkboxes, Select all on this page, **Delete selected**. Type `DELETE`, confirm count. Skips your own account. Same cascade as single delete (bookings/stars). One audit line. Cap 500 per request.

## 2026-11-07 — After-the-video plain run-through

- [`docs/tutorials/maintenance/after-the-video.html`](tutorials/maintenance/after-the-video.html) (+ `.md`) — eight short steps for non-tech viewers (Mac or Windows) after the training film.

## 2026-11-04 — Project card: target central home `heaventech1984`

- [`docs/tutorials/maintenance/project.md`](tutorials/maintenance/project.md) notes the demo move from `ai-xps` → `heaventech1984`, with a human transfer checklist. No passwords in the repo.

## 2026-11-04 — Film guide + shareable keep-Gather page

- Filming: [`docs/tutorials/maintenance/film-guide.md`](tutorials/maintenance/film-guide.md) — windows to open, take order, voice readout, crisp stills, free Mac record tools.
- Shareable HTML: [`docs/tutorials/maintenance/keep-gather.html`](tutorials/maintenance/keep-gather.html) — visual numbered paths + long “when something feels stuck” section.

## 2026-11-03 — Intro GitHub and maintenance prompt

- New door: [`docs/tutorials/maintenance/intro-prompt.md`](tutorials/maintenance/intro-prompt.md) — copy-paste Cursor prompts (first day, daily, **Oracle**) plus numbered action lists in plain words.

## 2026-11-01 — Maintain-from-scratch tutorials

- New shelf: [`docs/tutorials/maintenance/`](tutorials/maintenance/) — project card (own GitHub login + central `ORG` repo; `ai-xps` sample only), from-scratch, Git in pictures, comment/review on the central pull-request page, FAQ. Video later; recipe first.

## 2026-11-01 — Pending Event Link labels

- Pending Event Link shows a short “On Birmingham Cathedral” / “On Meetup” style label. Hover still has the full URL.

## 2026-11-01 — Pending tiles hardened + Meetup allowlist

- Pending cards keep the category chip inside the tile, show start–end time, and clip long Event Links (flex + overflow containment so thumbs cannot float outside).
- Seed includes a long cathedral Event Link so e2e checks every pending tile. Playwright asserts chip, end time, and link stay inside the card on desktop and phone.
- `meetup.com` / `www.meetup.com` are on the Priority URL allowlist. Use a Birmingham find page (not the bare homepage — that response is over Gather’s size cap and lists other cities).
- Oracle pulled the earlier fix; refresh hard after redeploy if the old layout is cached.

## 2026-10-28 — Cathedral what's-on is the starter feed

- The suggested priority address is `https://www.birminghamcathedral.com/whats-on/`. The old `calendar.ics` example returns 404.
- A fresh seed stores that address. An empty list still means demo events only.
- On Oracle that address is saved. One run created 15 pending cathedral events.

## 2026-10-28 — Cutover gate checked; CI pinned to Ubuntu 24.04

- Oracle gate: systemd, HTTPS door, `APP_ORIGIN`, closed port 3000, disk-alert test, last-place booking test, and no leftover seed cell numbers are ticked in [`deploy-ubuntu.md`](deploy-ubuntu.md) and [`GATE-STATUS.md`](GATE-STATUS.md).
- Still blocking a Railway stop: green CI, one Attend, off-box backup, Telegram, telling Becca and Guillaume.
- GitHub Actions runs on `ubuntu-24.04` so Playwright can install Chromium. `ubuntu-latest` is 26.04, which Playwright 1.51 does not support.

## 2026-10-28 — Missing pages return 404, and the bare IP goes to the named site (`26c2525`)

- A missing event, or one a member cannot see, answers 404 with “Not found”, not a success status.
- The “Loading…” line is gone, so it cannot stay announced after the page has drawn.
- HTTP on the bare Oracle IP redirects to `https://132.145.68.166.sslip.io`.

## 2026-10-28 — Scraper Run now saves the priority list first (`8952c03`)

- Run now stores the priority box, then fetches. A host that is not on the allowlist is named and not fetched.
- A demo-only run says the pending list looks the same because existing demo events are updated in place.
- Leftovers (missing-event status, bare-IP certificate, sticky “Loading…”) are in [`REVIEW.md`](REVIEW.md).

## 2026-10-28 — Readable berry and the closed build record (`ba096bd` … `c74751f`)

- Button gradient light stop `#B14E58` and muted ink `#7A6266`, so white labels and hints clear 4.5:1.
- `context.md` section 20 is the rule for the app. Sections 1–19 stay as the October archive.

## 2026-10-28 — Bookings chips + Discard≠blacklist tests (`fb48a4f`)

- My bookings uses the same coloured attendance chip as the event page.
- Unit + integration cover Discard ≠ blacklist; E2E covers discard copy, CSV download, empty far-future month.

## 2026-10-27 — Week timetable calendar + brand mark (`7a7e96d` … `db65ee0`)

- Calendar defaults to **Week**; week/day use a Google-style time grid (hours × days, event blocks). Month view unchanged.
- Official Gather mark on welcome/topbar/favicon; login door is mark + Gather wordmark.
- Responsive shell: fluid type/spacing; compact chrome through iPad portrait (≤900px); tablet/desktop week-grid proportions; Apple web-app meta.
- Phone Menu and the top bar are opaque, so the page does not show through them.

## 2026-10-26 — UX redesign (Home browse, mark, calendar stars) (`24c0ec3` … `45de4e3`)

- Signed-in Home absorbs Search: kinds + upcoming list on `/?types=` / `format=`; `/search` redirects there. Phone tabs: Home, Calendar, Bookings. Sign out sits on that bar.
- Signed-out `/` is the mark, the catchphrase, and the sign-in fields together. Sign out returns to that door on `APP_ORIGIN`.
- `/api/health` answers without a sign-in, for an uptime check.
- GatherMark refined (soft pin fill, clearer people).
- Calendar: ★ on week/month rows; Saved strip; week/day list skips empty days.
- Bookings: Upcoming / Past; spots left when capacity is set; ★ when starred.
- Insights: Average fill explained; section headings; readable week bar labels. Reports: files vs Insights; Fill column on recent events.

## 2026-10-25 — Welcome hallway (entry UX)

- `/` is a welcome (mark, “Find. Book. Gather.”, one berry button, five event kinds), not a redirect to the month grid.
- `/search` asks the kind, then lists upcoming events (`types=` / `format=`); calendar stays a chosen destination.
- Phone bottom tabs: Home, Search, Calendar, Bookings. Menu keeps leader/admin links only.
- Sign-in with no `next=` returns to `/`. Sketch order from `docs/design-mockups/`; blush/berry tokens unchanged.
- Hardening: middleware keeps `?types=` in `next=`; signed-in `/login?next=` honours it; list rows clamp long titles; place names capped at 200; empty / kind-off / 50-cap copy; blush `themeColor`.
- RSI / touch: hover styles only on fine pointers; `:active` press feedback; ~44px targets on coarse pointers (nav, day cells, calendar event chips, back/Edit links, tab bar).

## 2026-10-24 — Ubuntu + SQLite Phase 1 (Oracle Tier 1 hardened; do not push to Railway yet)

- Prisma provider **sqlite**; `.env.example` `file:./data/gather.db`; CI uses SQLite (no Postgres service).
- SQLite-safe Attend lock + scrape lock; WAL + busy_timeout; `/api/health`.
- `scripts/start.sh`: no per-boot `db push` (use `BOOTSTRAP=1`); refuses Postgres URLs.
- [`deploy-ubuntu.md`](deploy-ubuntu.md), [`incident-card.md`](incident-card.md), `scripts/install-ubuntu.sh`, dual backup + disk alert, Caddy/systemd templates.
- **Ops:** pause Railway redeploy before this commit lands on a Railway-connected branch — Postgres URL + SQLite schema will not start.

## 2026-10-20 — Soft blush / berry UI (style only)

- Visual restyle from Gelain-style refs: blush paper, berry CTAs, sage/gold gentle accents.
- Tokens in `globals.css`; map/Insights/category art follow. No behaviour changes.
- Nav fits admin links: shorter labels, wrapping flex topbar, secondary Sign out.
- Insights KPIs: clumped into Reach / Showing up / Room & sharing; softer centred tiles.
- Event cards: small category illustrations + soft colour washes (calendar, bookings, pending, detail).

## 2026-10-20 — Fix scraper / members / import after shared-cell login

- Password uniqueness only among people who share the same cell number (faster create/import).
- Origin check accepts Referer / same-origin when browsers omit Origin (manual scrape + member save).
- Import: rich-text Excel cells, safer parse errors, audit failures no longer block create/import.
- Scraper “Run now”, member Save, and import show clear busy / error states.

## 2026-10-19 — Shared cell number + unique password login

- Several people may share one cell number; login picks the person by unique password (Guillaume B).
- Create/import reject reused passwords; Prisma drops unique on `cellNumber` (index kept).

## 2026-10-19 — Apple/tech UX + stakeholder pack + login rules

- Cool Apple/tech UI tokens (less cream); SF-style system stack; blue accent.
- Cell login IDs: alphanumeric, any length. Passwords: non-empty, any length.
- Stakeholder Canva brief, requirements-loop, checklist, `npm run deck:stakeholder`.
- README hero screenshot + presentation links.

## 2026-10-19 — Emil Kowalski skills (local; commit when ready)

- Vendor copy of all [emilkowalski/skills](https://github.com/emilkowalski/skills) under `.cursor/skills/` (MIT).
- Gather how-to: [`EMIL-SKILLS.md`](EMIL-SKILLS.md). Prefer `mobile-native` before heavy motion; keep current product tokens.

## 2026-10-18 — agent briefing (local; commit when ready)

- Root [`AGENTS.md`](../AGENTS.md) + thin [`CLAUDE.md`](../CLAUDE.md).
- Karpathy always-on rule; keep teach-An; [`docs/agent-lessons.md`](agent-lessons.md); optional smoke skill.
- Skip Loop Engineering / autopilot until CI/PR chore pain is real.

---

## 2026-10-18 — tester evening + live smoke (`28a9929`)

Commits `da8c50d` … `28a9929`.

- Multi-select event types (`types=`), Month/Week/Day as view tabs, All types clears the filter.
- Login: dropdown of active cell numbers (no names); “Choose your cell number.”
- Event form: Find on map, Online beside Event Link, `?d=` prefills 09:00 London; pending Save/Publish/Discard/Back stay on `/pending`.
- Quiet Add on month cells and week/day headings (reviewers only).
- Pending queue as noticeboard tiles by London day; equal-height tiles.
- Members Return without save; import example table + CSV template (admin only; leaders who type `/import` see a sentence).
- Reports: “Events in a date range” card (CSV/Excel); per-event attendee export kept.
- Drop stale scraper Priority URLs instead of blocking the whole settings save.
- Railway: stop login prerender so the image builds without Postgres (`force-dynamic`).
- Live smoke as admin, cell leader, and member — see [`REVIEW.md`](REVIEW.md).

**Known leftover:** “Didn’t attend” sticky on Test Guillaume from an earlier smoke not re-checked this run. §16 phone redesign still backlog.

---

## 2026-10-17 — calendar fix, Insights, scraper 8, tester deck (`dc1fbc6` … `6378449`)

- Day/week follow `d=YYYY-MM-DD`; Previous/Today/Next step by view; map stays when empty.
- Insights for admin (region) and cell leader (own cell); export and share totals only.
- High-severity review fixes (open redirect, session bump, cron secret, last-place booking lock, confirm dialogs).
- Scraper: DST-safe fixtures, allowlisted ICS/JSON-LD, freeze human-edited rows, bound live fetches.
- Tester deck (no secrets); attendance prompt session-snooze; blank FUNCTIONAL sign-off named for An, Becca, Guillaume.
- Docs: calendar notes, Insights decisions, REVIEW and FUNCTIONAL written.

---

## 2026-10-16 — Guillaume demo asks (`96bf9d2`, `dc0de12`)

- Member attendee view: Count / initials / **Count and Name + Cell**.
- Manual events: place text + map pin; Event Link label; return to pending after publish/discard.
- Mobile mockups recorded in `context.md` §16 (target look; not shipped UI).

---

## 2026-10 — first Railway deploy (`cf89aa6` … `902a286`)

- Initial Gather app (Next.js, Prisma, cream parish UI).
- Postgres on Railway; Railpack builder; bind to `PORT`.

---

## How to add the next entry

1. Ship on `experiment` (commit SHA at the top).
2. Add a new `## YYYY-MM-DD — short title (\`abc1234\`)` section **above** this list.
3. Bullet what people can *do*, not every file touched.
4. Point leftovers and smoke steps at [`REVIEW.md`](REVIEW.md).
5. When go-live needs numbered releases: bump `package.json` and use `## 1.1.0 — …` as the heading.
