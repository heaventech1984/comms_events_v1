# AEP-001 — Agent change control (Gather)

Document ID: AEP-001
Version: 1.0.0
Status: Active for agents on this repo
Applies to: AI coding agents in this repository
Batch that added this doc: REL-2026-001
App version: unchanged (package.json stays 1.0.0)

Gather is a closed demo calendar for one Birmingham community. It is not NHS production.
Source of truth for day-to-day agent work remains AGENTS.md. This file is the drawer manual. The fridge note is .cursor/rules/change-control.mdc.

Governing line: Preserve first. Inspect second. Plan third. Ask where required. Change as little as possible. Test what you changed. Write down what you actually did.

The agent is an implementation assistant. It does not approve releases or deploys.

## 1. Purpose

1. Keep working code and config.
2. Change only what a human asked for.
3. Keep dependency versions locked.
4. Make every change traceable and reversible.
5. Use a named batch when a set of changes ships together.
6. Ask a human before consequential edits and before any production-style release.

## 2. Operating rules

Only do work the user asked for. Do not refactor, rename, or "improve" neighbours. Do not swap libraries because another looks nicer. Do not widen the task.

Prefer the smallest edit. Reuse what is already in src/. Match existing style. Do not create, delete, or rename files unless the task needs that. Read a file before overwriting it.

Before editing:
1. Look at the repo layout.
2. Read the code and config you will touch.
3. Check branch and git status. Never discard user changes.
4. Note Node, npm, and package.json version. Do not change them as a side effect.
5. List files and side effects.
6. If the ask or the tree is unclear, stop and ask.

## 3. Versions and dependencies

Treat approved versions as fixed. Do not, on your own: upgrade or downgrade packages, change Next, React, Prisma, or Node, replace a dependency, relock, change CI or Railway, or change an API contract.

Protected files — stop and ask before any edit:
- package.json
- package-lock.json
- .github/workflows/ci.yml
- railway.toml
- scripts/start.sh
- prisma/schema.prisma
- any .env file

Python lockfiles are not part of this app. Ignore requirements.txt, pyproject.toml, poetry.lock, uv.lock, and environment.yml unless a human adds them.

If a dependency change is actually required, stop and show: current version, proposed version, why it is necessary, compatibility risk, what behaviour changes, security and maintenance effect, and how to roll back. Wait for a yes.

Do not run: npm update, npm audit fix, npm install <pkg>@latest, or any blanket upgrade. Use npm ci when installing from the lockfile.

## 4. Git

Git is the record. Check status before you start. Never throw away uncommitted work. Never force-push main or master. Never rewrite published tags. There are no release tags yet; do not invent one.

Branch meanings in this repo:
- experiment — daily work. This is the integration line. There is no develop branch.
- main — quiet shelf. Do not commit or merge to it unless the user asks.
- feature/… or fix/… — optional short branches off experiment, only if the user asks.
- release/… or hotfix/… — only when the user asks for a numbered church release.

Do not commit, push, or open a PR unless the user asks. A commit message, when asked, names the why. Do not stage unrelated files or videos/.

Before a large edit, record HEAD SHA and say what the last known good commit is. That SHA is the checkpoint. Do not make a checkpoint commit unless the user asks.

## 5. Release batches

Group related work as REL-YYYY-NNN (example REL-2026-001). The id is not the app version. It does not replace D-xxx wishes or dated rows in docs/CHANGELOG.md.

When a human asks for a batch, record: id, objective, tasks or D-ids, changes, files, whether a protected file changes, compatibility, tests, risks, rollback, approval, and the commit SHA once one exists.

Do not mix an unrelated fix, feature, and refactor in one batch. Do not call a batch done just because files were edited. Finish with the completion report in section 12.

This document's own batch is REL-2026-001. Do not open docs/releases/ for it.

## 6. Semantic versioning

App version lives only in package.json "version". Format MAJOR.MINOR.PATCH.
- PATCH: backwards-compatible fix
- MINOR: backwards-compatible feature
- MAJOR: breaking change
Pre-release tags, if a human ever asks: v1.2.0-alpha.1, v1.2.0-beta.1, v1.2.0-rc.1

The agent may recommend a bump. It must not edit the version number until the human says yes. Published tags stay immutable. Today the approved version is 1.0.0 until a church release.

## 7. Release lifecycle

1. Development on experiment (or a short feature/fix branch the user asked for).
2. Integration only through a PR the user asked to open. Do not merge to main yourself.
3. Testing: npm test and npm run typecheck after non-trivial code changes. Say if you could not run them.
4. Release candidate only when the user asks: freeze the change set, name a proposed version, write docs/releases/REL-YYYY-NNN.md.
5. Human approval of the change set, tests, any dependency edits, and the deploy.
6. Production-style release only after that yes: tag, notes, deploy by the path in docs/deploy-ubuntu.md. Do not push SQLite experiment onto Railway while Railway still has a Postgres URL. scripts/start.sh refuses Postgres URLs. See docs/RAILWAY-FREEZE.md.
7. After deploy, check the walk host and write down anything that broke. Oracle is the product walk. Do not smoke Railway.

The agent prepares and recommends. It does not approve or promote a release.

## 8. Testing

Do not claim tests passed unless you ran them. If you did not run them, say so.
For app code: npm test and npm run typecheck. Auth, export, or import changes also need Cursor /review-security before the work is called done.
For this policy install: no app tests are required, because no app code changes. Do not pretend otherwise.
Check git diff for stray files and protected-file edits.

## 9. Documentation map

| Concern | Where it lives |
| --- | --- |
| Short agent index | AGENTS.md |
| This manual | docs/AEP-001-change-control.md |
| Fridge note | .cursor/rules/change-control.mdc |
| On-demand skill | .cursor/skills/change-control/SKILL.md |
| Project overview | README.md |
| What shipped | docs/CHANGELOG.md |
| Corrections | docs/agent-lessons.md |
| Wishes | docs/desirables.md and docs/built_features.md |
| Approved app version | package.json "version" |
| Numbered release pack | docs/releases/REL-YYYY-NNN.md only after the human approves that release |

A numbered release pack, when asked for, records: batch id, app version, commit SHA, branch and tag, Node and npm, lockfile name, changes, tests and results, known issues, who approved, date, and how to return to the previous tag. Use values you verified.

## 10. Rollback

The rollback for REL-2026-001 is: delete the files this batch added and revert the AGENTS.md lines. Last known good code commit is the HEAD you recorded before editing. Do not overwrite that commit. Do not deploy a rollback unless the user asks.

For a later stable release: keep its tag, its docs/releases file, and the lockfile that belonged to it. Restoring means checking out that approved state, not inventing a new fix on the way down.

## 11. Permissions

Written rules are not a substitute for GitHub protections, but the agent does not change those settings unless asked.
Minimum behaviour: do not use credentials, do not print .env, do not skip hooks, do not force-push.

## 12. Completion report

End every consequential task with:

Task identification — what was asked, and the REL id if any.
Implementation — done, files created, files modified, files deleted.
Environment integrity — dependency versions before and after, runtime changes, config changes, whether a protected file was modified.
Quality assurance — commands run, results, regressions, leftovers.
Version control — branch, HEAD SHA, diff summary, proposed version (do not apply it).
Release readiness — batch status, risks, approval still needed, rollback.

## 13. Conflicts

If an instruction fights this manual or could change dependencies, schema, CI, Railway, or main:
stop, name the clash, name the consequence, offer the smallest safe alternative, and wait.

An unclear ask is not permission to delete, upgrade, or deploy.

## 14. Order of priority

1. Keep working behaviour.
2. Keep versions and the lockfile.
3. Stay inside the ask.
4. Small, traceable edits.
5. Recoverable history.
6. Release steps in section 7.
7. Human approval for consequential changes.
