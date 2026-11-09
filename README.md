# Gather — Birmingham community events

![The Gather sign-in screen](docs/presentation/shots/readme-hero.png)

Gather is a private calendar for one community in Birmingham. An admin makes every account. A person signs in with a cell number and a password, looks at events, presses Attend, and later confirms they went. A cell leader checks new events from the web and looks after their own cell.

This page is for a person who has never made software. You can keep Gather by following the notes below. You do not need to learn the whole program today.

**Watch this first (about two minutes):** [How a change is written down](docs/presentation/how-a-change-is-made.mp4)

The same words are written out underneath, with a link for every step.

Gather is a community demo. It is not a hospital records system, and it does not hold patient notes.

Another city would be a separate copy, with its own saved data, its own admin, and its own calendar.

## 1. Where a change is written down

A change starts as words. Put the words on the right noticeboard before anyone changes the program.

Picture a hall with several boards. A wish on the fridge is a different piece of paper from a rule nailed to the wall, and both are different from the dated book of what already went out.

| What someone said | Write it here | Then open |
| --- | --- | --- |
| An idea for later | [The wish list](docs/desirables.md). Add one row at the bottom. Give it the next wish number (the letter D, a dash, then digits, such as D-016). | [How to update the wish list](docs/tutorials/maintenance/README.md#updating-desirables-wish-list) and [Prompt D](docs/tutorials/maintenance/intro-prompt.md#prompt-d--park-a-wish-copy-this) |
| Something is broken today | A repair on the working line. Use a wish number only when the wish itself is the repair. | [Fix a bug](docs/tutorials/maintenance/from-scratch.md#e-fix-a-bug-daily-loop) |
| Someone is already asking for a check | A comment on that check. On GitHub this page is called a pull request. It means: please look at my change. | [Read a change and leave a comment](docs/tutorials/maintenance/review-and-comment.md) |
| The team has agreed a product rule | [The closed decisions](DECISIONS.md) | Leave the old chat record alone. See section 4 below. |
| What the app does today | [What Gather does](docs/FUNCTIONAL.md) | The sign-off lines stay empty until An, Becca, and Guillaume choose to sign. |
| A wish has been built | First the [dated ship notes](docs/CHANGELOG.md). Then move the row to the [built list](docs/built_features.md), and add the date and a link back to the ship notes. | [When a wish is built](docs/tutorials/maintenance/README.md#when-a-wish-is-built) |
| A leader typed it inside the live app | The Feedback page on the live site. An admin copies an approved row into the wish list. The wish list stays the copy that counts. | The Feedback row in [What Gather does](docs/FUNCTIONAL.md) |
| Someone corrected a helper | One new line in [lessons](docs/agent-lessons.md) | [The helper briefing](AGENTS.md) |
| A batch of work is going out together | [The change-control manual](docs/AEP-001-change-control.md) | Only when a person asks for a numbered batch. A batch does not replace a wish number or the dated ship notes. |

An open wish is a note for later. It is a request to build only when a person asks you to build that wish.

## 2. How a change is made

Do this only after the words are on the right board, and only if a person asked you to build or to repair.

1. **Bring in other people’s latest pages first.** The picture guide is [Start my day](docs/tutorials/maintenance/git-in-pictures.md#3-start-my-day). The shared project address is on the [project card](docs/tutorials/maintenance/project.md).
2. **Stay on the working line called experiment.** That is today’s notebook. The line called main is the quiet shelf. There is no third line called develop.
3. **Read the file you will touch, and the test next to it.** The map is in [section 8](#8-if-you-are-changing-the-program). Change only what the task needs. The daily repair steps are in [Fix a bug](docs/tutorials/maintenance/from-scratch.md#e-fix-a-bug-daily-loop).
4. **Run the two checks** in [section 10](#10-checks-before-you-call-a-change-done).
5. **If the change is about signing in, bringing people in from a file, or sending a list out,** run the security review named in section 10 before you call the work done.
6. **Save, share, and ask for a check only when a person says so.** Saving on your laptop, sharing, and asking for a check are three different steps. The pictures are [Save my work](docs/tutorials/maintenance/git-in-pictures.md#4-save-my-work-on-this-laptop), [Share my page](docs/tutorials/maintenance/git-in-pictures.md#5-share-my-page), and [Ask for a check](docs/tutorials/maintenance/git-in-pictures.md#6-ask-for-a-check). How to read someone else’s change is [the review guide](docs/tutorials/maintenance/review-and-comment.md).
7. **If the work is a wish, put the wish number on the branch name, the check title, and the save message.** The pattern is in [Tracking work](docs/tutorials/maintenance/README.md#tracking-work-d--and-t--ids).

The program that remembers every saved version is called Git. Your laptop has one copy. GitHub is the shared shelf on the web. Cursor is the helper on your laptop. You still decide what gets saved and shared.

## 3. Ask a person before you do these

- Saving a version, sharing it, or opening a check request
- Putting work onto the quiet shelf called main
- Changing who is allowed to do what, the privacy switch for who can see names, or the list of websites the event fetch is allowed to read
- Filling in the sign-off lines for An, Becca, or Guillaume
- Editing any of these files: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `railway.toml`, `scripts/start.sh`, `prisma/schema.prisma`, or a file whose name starts with `.env`
- Changing the version number in `package.json`. It stays at 1.0.0 until a person names a church release
- Upgrading or replacing a library the app depends on
- Tagging a release, updating the live Oracle computer, or changing Railway

Never put secrets, the private settings file, starter passwords, or real members’ details into a note, a film, or a commit.

The short list for helpers is [AGENTS.md](AGENTS.md). The fridge note is [the change-control rule](.cursor/rules/change-control.mdc). The full manual is [the change-control document](docs/AEP-001-change-control.md).

## 4. If you are new to the laptop

Open these in this order. They teach the laptop. They do not teach the calendar yet.

| Order | Note | What you get |
| --- | --- | --- |
| 1 | [Project card](docs/tutorials/maintenance/project.md) | The shared address, and the difference between your own login and the team home |
| 2 | [After the film](docs/tutorials/maintenance/after-the-video.md) | The first clicks, on a Mac or on Windows |
| 3 | [Prompts to paste](docs/tutorials/maintenance/intro-prompt.md) | Words you can paste into Cursor for day one, for a normal day, for the live computer, or for parking a wish |
| 4 | [From scratch](docs/tutorials/maintenance/from-scratch.md) | Tools, copy, run, repair, save, share |
| 5 | [Git in pictures](docs/tutorials/maintenance/git-in-pictures.md) | Everyday situations: where am I, start my day, save, share, two people edited the same line |
| 6 | [Review and comment](docs/tutorials/maintenance/review-and-comment.md) | How to read a change and leave a note |

Come back to this page when the app runs on your computer.

Old conversations live in [the context file](context.md). Sections 1 to 19 are the archive. **Section 20 is the record of what we actually built.** When an old paragraph disagrees with section 20, with [the decisions](DECISIONS.md), or with the program, follow the later one.

## 5. Words you will meet

| Word | Plain meaning | Picture |
| --- | --- | --- |
| Working line | The shared notebook we write in. Its name is `experiment`. | Today’s notebook. |
| Quiet shelf | The line called `main`. We do not write there unless a person asks. | The shelf you do not scribble on. |
| Save | A saved snapshot on your laptop. Git calls this a commit. | Closing a page and dating it. |
| Share | Sending that snapshot to GitHub. Git calls this a push. | Putting the page on the shared shelf. |
| Check request | Asking someone to look before the change joins the shared line. GitHub calls this a pull request. | Passing the dish across the table. |
| Cell | The small group a person belongs to. | A table in the hall. |
| Cell number | The sign-in name. Letters and digits. Several people may share one. The password tells them apart. | A table number on more than one place card. |
| Role | Admin, cell leader, or member. | The badge on the place card. |
| Session | A signed ticket in the browser that means “this is this person”. Signing out, a new password, or switching someone off tears up every ticket for that person. | A cloakroom ticket. |
| Database | The saved records. On your laptop and on the new server it is one file: `prisma/data/gather.db`. | One notebook, not a room of cabinets. |
| Private settings | The file `.env` on your computer. It is never shared. Copy it from `.env.example`. | A card you keep in your pocket. |

## 6. Three places you can open the app

| Place | Address | What it is for |
| --- | --- | --- |
| Your computer | http://localhost:3000 | Learning and changes. That address works only on your machine. |
| The live walk | https://132.145.68.166.sslip.io | The place we show people, and the place we check after a change. It follows the working line. |
| The frozen spare | https://commseventsv1-production.up.railway.app | An older copy. Leave it running. Its automatic updates stay off. |

Leave the Railway spare running until every box in [the gate list](docs/GATE-STATUS.md) is ticked. How the new server was installed is in [the Ubuntu guide](docs/deploy-ubuntu.md). If the live walk breaks, use [the incident card](docs/incident-card.md).

Do not send today’s version to Railway. Railway still has the old kind of database. The start script refuses that mix. Next steps are in [the Railway freeze note](docs/RAILWAY-FREEZE.md).

## 7. Who can do what inside the app

| Person | What they look after |
| --- | --- |
| Member | Home, the calendar, their own Attend, later “I went”, a private rating, and stars as bookmarks. |
| Cell leader | All of that, plus the waiting list of fetched events, events, booking people in their own cell, and numbers and files for that cell. |
| Admin | All of that for the whole community, plus members, bringing people in from a file, fetch settings, organisation rules, the audit list, and the feedback page. |

The rules for “who may” live in `src/lib/policy.ts`, with checks in `tests/unit/policy.test.ts`. What was agreed is in [What Gather does](docs/FUNCTIONAL.md). Changing a role, the privacy switch, or the website allow-list needs a yes first.

## 8. If you are changing the program

Skip this section on day one. It is the map for later.

Picture a community hall. Pages are the rooms. Shared pieces of screen are the furniture. `src/lib` is the rule book in the office. The files named `route.ts` are the hatch: a button hands a form through, and the hatch writes or reads the database. `prisma` is the list of what the notebook can store.

The tool that turns a folder into a web page is called Next. A helper called Prisma reads that list and talks to the database file. You can change Gather without learning either tool in depth. Follow the file the table names.

```text
src/app/                  rooms, and the hatches that answer buttons
  page.tsx                the front door: welcome, or Home once someone is signed in
  login/page.tsx          the sign-in page
  (app)/                  signed-in rooms. The word "(app)" is not part of the address.
    layout.tsx            checks that someone is signed in, then shows the menu
    calendar/             the calendar
    bookings/             bookings
    events/               one event, a new event, or edit
    pending/              fetched events waiting for a person
    members/              people (admin)
    import/               bring people in from a file (admin)
    scraper/              the event-fetch settings (admin)
    insights/             charts (admin and cell leader)
    feedback/             issues and wishes typed in the app
    reports/              reports
    audit/                the audit list
src/components/           shared pieces of screen
src/lib/                  rules
  policy.ts               who may book, cancel, export, or see charts
  auth.ts, session.ts     who this browser is
  booking.ts              Attend, how many places are left, the last place
  scraper/                fetching events. Read the scraper note before you edit.
  insights/               the chart numbers and the files they export
  feedback-hub/           the Feedback page (a different thing from the private “I went” rating)
  import-users.ts         the member file
src/middleware.ts         the door: no ticket, no signed-in room
src/app/globals.css       colours
prisma/schema.prisma      the list of stored things. Ask before you edit this file.
prisma/seed.ts            starter people and events. Prints passwords once.
tests/unit/               checks that do not need the database
tests/integration/        checks that need a test database
e2e/                      checks that drive a real browser
scripts/                  start, nightly fetch, install, backup
docs/                     the notes in section 11
```

A folder with brackets, like `(app)`, shares one frame around those rooms. The brackets stay off the web address. The calendar address `/calendar` is the file `src/app/(app)/calendar/page.tsx`.

A folder named `[id]` is a blank the address fills in. The address `/events/abc` opens the event page with that blank set to abc.

### One button, followed through

A member presses **Attend**.

1. The button is in `src/components/EventActions.tsx`.
2. The browser calls the hatch `src/app/api/bookings/route.ts`.
3. That hatch calls `attendEvent` in `src/lib/booking.ts`. That function asks `src/lib/policy.ts` whether this person may book this person, then checks how many places are left. The last place is locked so two people cannot take it together.
4. Prisma writes one booking row. The shape of that row is the Booking section in `prisma/schema.prisma`.
5. The matching checks are `tests/unit/policy.test.ts` and `tests/integration/booking.test.ts`.

Almost every change has this shape: **screen, then hatch, then a rule in `src/lib`, then the database, then a test.**

The door, before any of that: `src/middleware.ts` looks for the session ticket. Signed-in rooms go through `src/app/(app)/layout.tsx`, which uses `requireUser()` in `src/lib/auth.ts`.

Home is special. `src/app/page.tsx` shows the welcome door when nobody is signed in, and the list when they are. The month grid stays at `/calendar`.

Two different “feedback” things:

| What people see | What it stores | Where it lives |
| --- | --- | --- |
| After **I went** | Loved it, It was fine, or Not for me, plus a private note | `src/lib/feedback.ts` |
| The **Feedback** page | Problems and wishes from leaders | `src/lib/feedback-hub/` and the address `/feedback` |

### Where to start a particular change

Read the row, then the test beside it, then make the smallest edit.

| You want to… | Start here | Then check |
| --- | --- | --- |
| Change who may book, cancel, export, or see charts | `src/lib/policy.ts` | `tests/unit/policy.test.ts`. Ask first. This changes a role. |
| Change Attend, room left, or the last place | `src/lib/booking.ts` | `tests/integration/booking.test.ts` |
| Change the calendar screen | `src/app/(app)/calendar/page.tsx` and `src/components/calendar/` | `src/lib/calendar.ts` and `tests/unit/calendar.test.ts` |
| Change colours | `src/app/globals.css` | Keep the soft blush and berry look. Phone checks: [the phone list](docs/MOBILE-MATRIX.md). |
| Change sign-in or the ticket | `src/lib/session.ts`, `src/lib/auth.ts`, `src/middleware.ts` | `tests/integration/session.test.ts` and `tests/unit/security.test.ts`. Then the security review in section 10. |
| Change the member file | `src/lib/import-users.ts` and `src/app/api/import/route.ts` | `tests/unit/import-excel-cell.test.ts`. Then the security review. Columns are in section 12. |
| Change a file that people download | `src/lib/export-bookings.ts`, `src/lib/export-events.ts`, `src/lib/insights/format.ts` | Then the security review. Members stay refused. |
| Change the “For you” suggestions | `src/lib/recommend.ts` | `tests/unit/recommend.test.ts` |
| Change how events are fetched | `src/lib/scraper/`, especially `run.ts`, `allowlist.ts`, and `harvest.ts` | [The frozen fetch method](docs/scraper-discovery.md) and `tests/unit/scraper.test.ts`. Ask before you widen the website list. |
| Change what the database can store | `prisma/schema.prisma` | Stop and ask. |
| Record a wish, or mark one built | [Wish list](docs/desirables.md) and [built list](docs/built_features.md) | [How to update the list](docs/tutorials/maintenance/README.md#updating-desirables-wish-list) |
| See what a person corrected last time | [Lessons](docs/agent-lessons.md) | Add one line after a correction. |

Motion on screen, when someone asks for it: [the motion notes](docs/EMIL-SKILLS.md). The useful one here is how the app feels on a phone. Keep the current colours. Still is better than the wrong movement.

## 9. Run it on your computer

You need the program called Node, version 20 or newer, and the small tool that comes with it. In the commands below that tool is typed as `npm`. Those three letters are its name.

The database is one file. You do not install a separate database server.

Copy `.env.example` to `.env`. This file stays on your computer.

| Setting name | What to put |
| --- | --- |
| `DATABASE_URL` | Where the database file is. `file:./data/gather.db` means the file `prisma/data/gather.db`. |
| `SESSION_SECRET` | A long random string. It signs the sign-in ticket. |
| `CRON_SECRET` | A second long random string. It guards the nightly fetch. The word CRON in the name is just the setting’s name. Copy it as written. |
| `APP_ORIGIN` | The exact address of this copy, with no slash at the end. On your computer: `http://localhost:3000`. |
| `SCRAPE_LIVE` | Set to `0` to skip fetching the priority websites. |
| `SCRAPE_FIXTURES` | Set to `0` to skip the demo events. If you leave it unset, the demo events run. |

Then, in the project folder:

```bash
npm install
mkdir -p prisma/data
npx prisma db push
npm run db:seed
npm run dev
```

| Line | What it does |
| --- | --- |
| `npm install` | Brings in the libraries this project already chose. |
| `mkdir -p prisma/data` | Makes the folder that will hold the database file. |
| `npx prisma db push` | Lines that file up with the list of stored things. |
| `npm run db:seed` | Puts starter people and events in. Prints cell numbers and first passwords **once** in the text window. The app never shows them again. Running it again does nothing if the admin already exists. |
| `npm run dev` | Starts the app on your computer. |

Open http://localhost:3000 in your browser.

To wipe your local notebook and start again:

```bash
npm run db:reset
```

Other commands:

| Command | Job |
| --- | --- |
| `npm test` | Runs the automatic checks. |
| `npm run typecheck` | Checks that names in the program still match. |
| `npm run test:coverage` | The same checks, plus a report of what they touched. |
| `npm run build` | Builds the version that a server runs. |
| `npm run scrape` | Runs one event fetch. |
| `npm run test:e2e` | Drives a real browser. The letters e2e in the command are its name. Type them as written. Once, run `npm run test:e2e:install` first. |
| `npm run deck` | Builds the member tester slides. |
| `npm run deck:stakeholder` | Builds the stakeholder slides, into `docs/presentation/`. |

## 10. Checks before you call a change done

```bash
npm test
npm run typecheck
```

When someone shares work to `experiment` or `main`, an automatic check on GitHub runs the same idea: the name check, the tests, then a build. The recipe is the file `.github/workflows/ci.yml`. You do not need to open it for a normal change.

After a change to **sign-in**, **a downloaded file**, or **bringing people in from a file**, run Cursor’s `/review-security` before you call the work done.

A walk through the live site as admin, cell leader, and member is described in `.cursor/skills/gather-smoke/SKILL.md`. The checklist is [the review list](docs/REVIEW.md). Walk the live Oracle address, and leave the frozen Railway spare alone.

## 11. Which note to open

| You need… | Open |
| --- | --- |
| The two-minute film | [How a change is written down](docs/presentation/how-a-change-is-made.mp4) |
| Your first week on the laptop | [The maintenance start page](docs/tutorials/maintenance/) |
| What the app does | [What Gather does](docs/FUNCTIONAL.md) |
| Rules the team already closed | [Decisions](DECISIONS.md) |
| The old chats, then the build record | [Context](context.md), section 20 |
| What each demo build shipped | [Ship notes](docs/CHANGELOG.md) |
| Open wishes, and wishes already built | [Wish list](docs/desirables.md), [built list](docs/built_features.md) |
| What is weak, and the live check list | [Review](docs/REVIEW.md) |
| How event fetch is allowed to work | [Scraper method](docs/scraper-discovery.md) |
| The new server, and whether we may switch | [Ubuntu guide](docs/deploy-ubuntu.md), [gate list](docs/GATE-STATUS.md) |
| Leaving Railway as it is | [Railway freeze](docs/RAILWAY-FREEZE.md) |
| When the live walk breaks | [Incident card](docs/incident-card.md) |
| Rules for helpers | [AGENTS.md](AGENTS.md) |
| How we control changes | [Change control](docs/AEP-001-change-control.md) |
| Corrections we should not repeat | [Lessons](docs/agent-lessons.md) |
| Phone checks | [Phone list](docs/MOBILE-MATRIX.md) |
| Pictures for wishes | [Visuals](docs/visuals.md) |
| A stakeholder talk | [Colour and slide beats](docs/presentation/CANVA-TECH-BRIEF.md), [who owns what](docs/presentation/STAKEHOLDER-CHECKLIST.md) |

## 12. The member file, passwords, and the nightly fetch

**Columns in the member file:** Name, Cell number, Cell, Password, Permission.

Permission is `admin`, `cell leader`, or `member`. A cell number is letters and digits only. It may be shared. The password must not be empty, and it must be unique among people who share that cell number. Excel, a plain table file, and a structured text file are all accepted. If any row fails, nobody from that file is created.

**Replacing a password.** An admin opens Members, edits the person, types a new password, and tells the cell leader. The old password cannot be read back. It is stored scrambled.

**Nightly fetch.** Do not start a clock inside the command that runs the app on your computer. On the server, the alarm is:

```cron
0 5 * * * /path/to/app/scripts/scrape-cron.sh
```

That line means 05:00 every day, London time. The path is the script on that computer.

`npm run scrape` and the guarded fetch address both run the scheduled fetch. The admin button **Run now** runs it by hand.

Demo events run unless `SCRAPE_FIXTURES` is `0`. Priority websites, when set, must be secure addresses on the allowed list. The fetch is slow and small on purpose. One failed site is written down and does not stop the others. Saving an event after it is published freezes later fetch updates for that row. Gather does not collect member details from other websites. The method is frozen in [the scraper note](docs/scraper-discovery.md).

## 13. What this build leaves out

- Public sign-up, or invites
- A way for a member to reset their own password
- Email or text messages sent by Gather
- A live link to a wider Birmingham department system
- A warning when two events overlap
- Reminders to mark attendance
- A second city in this same calendar
- Reading ordinary web pages for events (only the agreed feed types)
- Weeks past the 12th time a repeating event happens
- A manager for a deep tree of groups
- Saving bookings on the phone for when the network is down. A stale Attend button is unsafe.

The reasons sit in [What Gather does](docs/FUNCTIONAL.md), in the part called “Out of this phase”, and in [the decisions](DECISIONS.md).
