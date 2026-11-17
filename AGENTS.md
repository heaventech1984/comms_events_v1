# Gather agent briefing

Gather is a closed calendar for one Birmingham community (demo, not NHS production). The product uses a soft blush / berry UI. **Product walks, critic, and smoke: Oracle** https://132.145.68.166.sslip.io (`experiment`). Railway is a frozen Postgres spare until the Ubuntu gate says stop ([`docs/deploy-ubuntu.md`](docs/deploy-ubuntu.md)).

**Source of truth for agents.** This file is authoritative. `CLAUDE.md` and Cursor rules are adapters; do not duplicate this briefing elsewhere. Follow the project instructions below in Codex too.

Product walk: https://132.145.68.166.sslip.io
Railway spare (auto-deploy paused, last Postgres): https://commseventsv1-production.up.railway.app

Ubuntu / Oracle cutover: [`docs/deploy-ubuntu.md`](docs/deploy-ubuntu.md). **Do not push SQLite to Railway while it still has a Postgres URL.** `scripts/start.sh` refuses Postgres URLs. Railway next steps: [`docs/RAILWAY-FREEZE.md`](docs/RAILWAY-FREEZE.md). Open critic wish: [`docs/desirables.md`](docs/desirables.md) **D-020**. Formatting ships **D-016–D-019, D-021**.

Branch for work: `experiment`. Ship notes: [`docs/CHANGELOG.md`](docs/CHANGELOG.md). Smoke checklist: [`docs/REVIEW.md`](docs/REVIEW.md). Product calls: [`DECISIONS.md`](DECISIONS.md). What it does and sign-off: [`docs/FUNCTIONAL.md`](docs/FUNCTIONAL.md). Frozen scraper method: [`docs/scraper-discovery.md`](docs/scraper-discovery.md); do not casually replace it with an open crawl. Change control: [`docs/AEP-001-change-control.md`](docs/AEP-001-change-control.md).

## Commands

```bash
npm install
npm test              # unit (integration needs TEST_DATABASE_URL)
npm run typecheck
npm run test:coverage
npm run build
npm run dev           # local; needs SQLite DATABASE_URL=file:./data/gather.db
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy blocks the `.ps1` shims. Use `npm ci` to install the existing lockfile; do not update dependencies.

## Working rules

- Work on `experiment`; use `main` only if explicitly instructed, and never invent a `develop` branch. Check branch and working tree before editing. Preserve uncommitted work you did not create, including `videos/` and other untracked files; do not stage it, move it, or delete it.
- Inspect only relevant files. Before editing, check the branch and worktree, read the relevant code and tests, and identify side effects. State assumptions when they matter; if the request or worktree is unclear, stop and ask. Prefer the smallest change that directly meets the request, follow existing patterns in `src/`, and do not refactor adjacent code just because it could be improved.
- Do not add unrequested features, speculative abstractions, configurability, or handling for impossible cases. For multi-step work, state a brief plan and verifiable success checks, then continue until they pass.
- Explain work plainly and in short chunks. Define technical terms needed to follow the explanation; when useful, give one simple everyday analogy and one brief line explaining how the change works. Avoid basic background explanations unless useful or requested.
- Keep responses concise, avoid repeating information or successful commands, and prefer targeted checks. Do not sacrifice correctness, security, or reliability for brevity. Do not generate documentation unless requested.
- After non-trivial code changes, run `npm test` and `npm run typecheck`. Before a proposed release, run the relevant tests and typechecks. Use targeted checks where sufficient; optional role smoke is documented in `.cursor/skills/gather-smoke/SKILL.md`.
- Follow [`docs/AEP-001-change-control.md`](docs/AEP-001-change-control.md) for consequential change control. `REL-YYYY-NNN` is a release-batch envelope; it does not replace a D-xxx wish ID or `docs/CHANGELOG.md`. For consequential work, include the completion report required by that manual.
- After a human correction, add one line to [`docs/agent-lessons.md`](docs/agent-lessons.md).

## Stakeholder messages

When drafting Telegram, WhatsApp, or email for people outside the IDE, use An's preferred voice: brief, plain, kind, and polite; avoid em dashes, jargon, pressure, and long bullet lists. Cover the practical point once and stop. A few small natural typos or odd turns are acceptable, but do not force them. Do not use this style for code or in-IDE teaching.

## Product and code guardrails

- Prefer existing patterns in `src/` and the soft blush / berry tokens in `src/app/globals.css` (`--paper`, `--accent-gradient`, `--accent` / `--terracotta` alias, `--sage` / `--gold`). This palette is authoritative; do not switch to system-blue or do the §16 teal redesign unless asked.
- The scraper must not label an event Christian or any other type from a search page or feed URL alone. The title must agree. Pending cards only have Approve and Discard. A doubtful type is a flag for the event page later.
- Do not invent App Store or offline PWA caching of bookings; stale Attend is unsafe.
- On-demand Emil UI/motion skills live under [`.cursor/skills/`](.cursor/skills/) (see [`docs/EMIL-SKILLS.md`](docs/EMIL-SKILLS.md)). For phone feel, `mobile-native` is the highest-value skill; use animation skills when motion is requested. Keep current product tokens, prefer existing CSS/components, ask before adding UI libraries, and prefer no motion over wrong motion. Do not change Attend, auth, booking, or privacy behavior for visual polish alone. `animate-expo` and `write-swift` are usually wrong for this Next.js web app.

## Security review for auth, export, and import changes

Codex cannot run Cursor's `/review-security` command. For changes to authentication, exports, or imports, perform and report this review before calling the work done:

- **All affected paths:** trace the request from UI/API through helpers to storage; check authentication, role/cell authorization, origin/CSRF protections, input validation, error handling, audit behavior, and whether logs or responses expose secrets or personal data.
- **Authentication:** check password hashing and verification, login throttling, cookie `HttpOnly` / `SameSite` / `Secure` behavior, session expiry and revocation, and secret handling.
- **Exports:** check role and row scope, date/input validation, personal-data minimization, spreadsheet/CSV formula injection, and audit logging.
- **Imports:** check admin-only access, file/type/size and row validation, all-or-nothing behavior, password hashing and uniqueness, safe error messages, and that raw passwords are never logged or persisted.
- Review the relevant tests and state any remaining security risks. Do not claim a Cursor command ran.

## Production and deployment

- Oracle production is `ubuntu@132.145.68.166`; app path `/var/www/gather`; SQLite database `/var/www/gather/prisma/data/gather.db`; systemd service `gather`; health URL https://132.145.68.166.sslip.io/api/health.
- Keep production database access read-only by default. For inspection, use SSH and a read-only SQLite connection (`mode=ro`, `PRAGMA query_only=ON`) with `SELECT` queries. Do not expose `.env`, credentials, private keys, or unnecessary member data. Never reseed production.
- Production is not updated by GitHub pull. Preserve the Oracle deployment workflow: create a Git bundle locally, transfer it by SCP, and fast-forward merge it on Oracle. **Do not replace this with `git pull`.** Do not assume GitHub is up to date with production. Follow the established operator procedure; do not invent or run deployment commands unless deployment was explicitly requested.
- A deployment requires an explicit user request. Only then follow the established steps, including `npm ci`, Prisma generate, build, and `systemctl restart gather`; finish with the documented health check. Do not change Railway or deploy to Oracle unless explicitly asked.
- Back up databases before risky migrations. Prisma migration cutover remains out of scope unless asked.
- Do not print or copy production `.env` secrets. Do not change production files or databases, restart production services, or run destructive database actions without explicit authorization.

## Ask first

- `git commit`, `git push`, opening or merging a PR, or any change to `main`.
- Any production deployment, release tag, or change to Oracle or Railway.
- Changing roles, privacy toggles, or scraper allowlists.
- Installing Loop Engineering or another unattended agent loop.
- Filling FUNCTIONAL sign-off for An, Becca, or Guillaume.
- Editing protected files: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `railway.toml`, `scripts/start.sh`, `prisma/schema.prisma`, or any `.env` file.
- Upgrading, downgrading, replacing, or relocking a dependency; do not run `npm update` or `npm audit fix`.
- Bumping `package.json` `version`.

## Never

- Commit secrets, `.env`, seed passwords, or real member data into docs or the tester deck.
- Force-push any branch, skip hooks unless explicitly asked, or commit straight to `main` without an explicit instruction.
- Move, delete, or stage untracked work you did not create.
- Dump huge third-party rulebooks or the full AEP-001 manual into always-on rules; use documented on-demand skills instead.

## Wishes and shipped work

- For a wish without a request to build: append one Open row to [`docs/desirables.md`](docs/desirables.md) using the next **D-** ID, then bump **Next D**. If a change is already in flight, use a pull-request comment.
- When a wish ships (human or explicit ask), move its row to [`docs/built_features.md`](docs/built_features.md) with a CHANGELOG **Proof** link; do not bulk-import CHANGELOG. Wish implementation commits/PRs must reference **D-xxx**.
- Do not implement from desirables unless asked.

## Out of scope unless asked

§16 teal phone redesign, Prisma migrate cutover, stopping production seed, Loop/autopilot systems, and merge to `main`.

## Multi-agent collaboration

- This project supports Cursor, Codex, Claude Code, Grok and other compatible agents.
- AGENTS.md is the authoritative shared instruction file.
- Tool-specific rules belong in their respective adapters.
- Never assume another agent's changes are committed or pushed.
- Preserve other developers' uncommitted work.
- Use individual feature branches and reviewed pull requests for shared contributions.
- Never assume production access or deployment permissions.
