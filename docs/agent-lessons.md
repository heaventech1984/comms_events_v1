# Agent lessons

One mistake → one rule. Newest first. Keep lines short.

| Date | Mistake | Rule to prevent it |
| --- | --- | --- |
| 2026-11-12 | A search page stamped Christian on a DevOps card, and Confirm buttons pushed Approve aside | Pending cards only Approve and Discard. A doubtful type is a flag for the event page later. A search URL never sets the type unless the title agrees. |
| 2026-11-09 | Front-door notes assumed a programmer and used shortened jargon | Write the read-me for someone who has never made software. Define each specialist word in the same breath. Do not rely on acronyms. |
| 2026-11-09 | Walked the critic on Railway after Oracle was already home | Product walks and UX critique go to https://132.145.68.166.sslip.io (`experiment`). Railway is a frozen Postgres spare until the Ubuntu gate says stop. |
| 2026-11-09 | Stakeholder asked for “scrape the whole internet” like ChatGPT | Keep allowlist + discovery pack. Treat Priority URLs as extras on top of the pack. Say clearly we do not open-crawl; widen pack only with probe + ask. |
| 2026-11-04 | Central GitHub password shared in Telegram/chat for demo transfer | Never write central account passwords, recovery codes, or private keys into the repo, tutorials, commits, or tool calls. Note only public `ORG` / username on the project card. Tell the owner to change the password if it was sent in chat. Agents do not log into that account. |
| 2026-10-28 | Shipped a fix and a live page walk, then only mentioned them in chat | Changelog row for what shipped (with the commit). REVIEW row for what broke or stayed open. Name both files in the reply. |
| 2026-10-23 | Stakeholder Telegram drafts too long / dashy / bullet-heavy | Fossil: short caveman prose, no em dashes, few bullets, kind soft close. See `.cursor/rules/stakeholder-telegram.mdc`. |
| 2026-10-20 | Shared-cell passwords checked with bcrypt against *every* user; Origin-only CSRF blocked some browser POSTs | Scope password uniqueness to the same `cellNumber`; allow Referer / `Sec-Fetch-Site: same-origin` when Origin is missing. |
| 2026-10-19 | Dumping motion libraries / teal redesign while “using Emil skills” | Emil skills = on demand; keep current product tokens; ask before new UI deps (`docs/EMIL-SKILLS.md`). |
| 2026-10-19 | “Password required” with only `if (!password)` | Trim first — whitespace-only strings are truthy in JS. |
| 2026-10-18 | Assumed Ask mode could write files / commit | If Ask mode: explain only; tell the user to switch to Agent to apply. |
| 2026-10-17 | Login page prerendered at Railway image build (no Postgres) | Pages that need DB at request time: `export const dynamic = "force-dynamic"`. |
| 2026-10-17 | Leftover Meetup Priority URL 400'd whole settings save | Drop disallowed URLs; save the rest; tell the admin. |

When the user corrects you, add a row here before ending the turn.
