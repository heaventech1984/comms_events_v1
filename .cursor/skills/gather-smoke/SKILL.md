---
name: gather-smoke
description: >-
  Run the Gather Oracle smoke checklist as admin, cell leader, and member.
  Use when the user asks to smoke-test, verify live deploy, or walk three roles
  on https://132.145.68.166.sslip.io.
---

# Gather live smoke

Closed demo only. Do not put passwords in chat logs or docs.

**Host:** Oracle https://132.145.68.166.sslip.io (`experiment`). Railway is a frozen Postgres spare — do not smoke or critic there.

Oracle uses **imported** cells (`Centre`, `T1C1`, …), not seed `07000` accounts. Ask the owner for a cell + password, or use a number they already typed in the browser. Never paste passwords into commits or the tester deck.

## Base URL

https://132.145.68.166.sslip.io

## Pass 1 — admin

1. Login dropdown: identifiers only, first option “Choose your cell number”.
2. Calendar: Week for today; Christian then **All types** restores other types; map stays.
3. Pending: tiles by day.
4. Add event `?d=YYYY-MM-DD`: starts ~09:00; Find on map; Online beside Event Link.
5. Reports: “Events in a date range”.
6. Import: example table + Download CSV template.
7. Members add: **Return** present (does not save).

## Pass 2 — cell leader

1. Add on a day visible; pending reachable.
2. Nav has no Import / Scraper / Audit (those stay in Menu).
3. `/import` shows a sentence + Back to calendar (not the form).

## Pass 3 — member

1. Phone tabs: Home, Calendar, Bookings (no Search).
2. No Add event / no day Add.
3. `/login?next=https://example.com` after sign-in lands on a path on this app (not example.com).

## Done

Record pass/fail in `docs/REVIEW.md` (or tell the user the ticks). Do not fill FUNCTIONAL sign-off.
