# Desirables

Picture: a **fridge noticeboard** for ideas we may explore later. Not a bug list. Not a product decision.

| Use this | For |
| --- | --- |
| **This file** | **Open** wishes (`D-` ids) |
| [`built_features.md`](built_features.md) | Wishes **already built** (index) |
| [`CHANGELOG.md`](CHANGELOG.md) | Technical ship log |
| [`DECISIONS.md`](../DECISIONS.md) | Closed product calls |
| [`FUNCTIONAL.md`](FUNCTIONAL.md) | What the app does today |
| [`visuals.md`](visuals.md) | Where optional pictures live |

**Counters:** Next **D:** `016` · Next **T:** `001` (bump when you assign ids; never reuse a number).

**Park** → pull `experiment` → new row at bottom → assign `D-id` → bump Next D  
**Work** → branch / PR / commit use `D-xxx`; tasks as `T-xxx` in PR (Level A — see [maintenance README](tutorials/maintenance/README.md#tracking-work-d--and-t--ids))  
**Ship** → CHANGELOG done → copy row to [`built_features.md`](built_features.md) (+ Proof) → delete from Open  
**Not here** → bugs (fix / PR), in-flight PR (comment only), policy ([`DECISIONS.md`](../DECISIONS.md))

**How to update:** [maintenance README — Updating desirables](tutorials/maintenance/README.md#updating-desirables-wish-list). Paste **Prompt D** from [intro-prompt.md](tutorials/maintenance/intro-prompt.md). Agents: park only unless asked to build.

**In-app intake:** leaders and admins use [`/feedback`](/feedback) on the live site; [`desirables.md`](desirables.md) stays canonical after an admin copies an approved row.

**Status (Open only):** `idea` · `scoped` · `in-progress` · `blocked` · `out-of-scope`

Never put passwords, `.env`, or real member data in this file or linked images.

## Open

| Id | Status | Date | Area | Wish (one sentence) | Why it matters | Visual (optional) | Heard from |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D-001 | idea | 2026-11-09 | For you | True meaning-match for suggestions (e.g. “quiet worship” ≈ Christian without shared words). | Better personalisation without manual type rules; needs a paid embedding model. | — | REVIEW |
| D-002 | idea | 2026-11-09 | Scraper | Re-scrape or backfill to fix already-stored midnight junk end times. | Display is honest for new rows; old DB rows may still lie. | — | REVIEW |
| D-003 | idea | 2026-11-09 | Mobile | Real-device sign-off (iPhone, Android, tablet) per MOBILE-MATRIX. | Playwright matrix is green; hardware is the last mobile gate. | — | REVIEW |
| D-004 | out-of-scope | 2026-11-09 | UI | §16 teal palette refresh plus Forgot password and Notify Me. | Big visual leap; product has not asked to ship this yet. | `design-mockups/02-home-menu.png` | REVIEW |
| D-005 | idea | 2026-11-09 | Security | Login throttle by IP or global rate, not cell number only. | Slows guessing across many numbers from one host. | — | REVIEW backlog |
| D-006 | idea | 2026-11-09 | Security | Attendee export via POST-only (GET cookie download is awkward). | Safer, more auditable exports. | — | REVIEW backlog |
| D-007 | idea | 2026-11-09 | Security | Dummy bcrypt work when the account is missing (timing). | Stops login timing hints. | — | REVIEW backlog |
| D-008 | idea | 2026-11-09 | Security | `Secure` cookie from `APP_ORIGIN`, not only `NODE_ENV`. | Correct cookies behind proxies and staging. | — | REVIEW backlog |
| D-009 | blocked | 2026-11-09 | Ops | Stop seeding demo passwords on first production boot (track C). | Production must not self-seed demo users. | — | REVIEW backlog |
| D-010 | blocked | 2026-11-09 | Ops | Prisma migrations instead of `db push` on every start (track C). | Reproducible schema upgrades. | — | REVIEW backlog |
| D-011 | idea | 2026-11-09 | Data | Index on `(status, startsAt)` for calendar and pending queries. | Cheaper at scale. | — | REVIEW backlog |
| D-012 | idea | 2026-11-09 | Leaders | One-screen “my cell this week” digest (lighter than full Insights). | Quick read without chart overload. | — | Final test brainstorm |
| D-013 | idea | 2026-11-09 | Members | “Add to calendar” (.ics) from a booking or event page. | Familiar pattern for reminders. | — | Final test brainstorm |
| D-014 | idea | 2026-11-09 | Pending | Bulk discard or tag beyond current multi-approve. | Faster on heavy scrape days. | — | Final test brainstorm |
| D-015 | idea | 2026-11-09 | Insights | Explicit audit reason on sensitive attendee export or share. | Governance and explainability. | — | Healthcare alignment |
