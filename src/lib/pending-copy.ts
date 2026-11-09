import { formatDate, formatDateTimeRange, formatTimeRange, londonParts } from "./time";
import type { Role } from "./constants";

/**
 * Discard confirm copy — Discard changes event status only.
 * It must never imply blacklisting the organisation.
 */
export const DISCARD_EVENT_CONFIRM_BODY =
  "The event leaves the pending list. This does not blacklist the organisation — they can still appear in future scrapes.";

export function discardTouchesOrganisation(): boolean {
  return false;
}

/** Known scrape hosts → short names readers recognise on the pending tile. */
const EVENT_LINK_SITE_NAMES: Record<string, string> = {
  "birminghamcathedral.com": "Birmingham Cathedral",
  "carrslane.co.uk": "Carrs Lane",
  "meetup.com": "Meetup",
  "eventbrite.co.uk": "Eventbrite",
  "eventbrite.com": "Eventbrite",
  "allevents.in": "AllEvents",
  "skiddle.com": "Skiddle",
  "luma.com": "Luma",
  "lu.ma": "Luma",
  "ticketmaster.co.uk": "Ticketmaster",
  "visitbirmingham.com": "Visit Birmingham",
  "guildofstudents.com": "Guild of Students",
  "birmingham.ac.uk": "University of Birmingham",
  "bcu.ac.uk": "Birmingham City University",
  "bcusu.com": "BCU Students' Union",
  "aston.ac.uk": "Aston University",
  "astonsu.com": "Aston Students' Union",
  "iod.com": "Institute of Directors",
  "greaterbirminghamchambers.com": "Greater Birmingham Chambers",
  "birmingham.impacthub.net": "Impact Hub Birmingham",
  "digbethdiningclub.com": "Digbeth Dining Club",
  "achurchnearyou.com": "A Church Near You",
  "calendar.google.com": "Google Calendar",
  "outlook.office365.com": "Outlook Calendar",
  "cloud.churchsuite.com": "ChurchSuite",
  "churchsuite.com": "ChurchSuite"
};

function hostKey(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** Site name for a hostname (with or without www). */
export function friendlyHostLabel(hostname: string): string {
  const host = hostKey(hostname);
  return EVENT_LINK_SITE_NAMES[host] ?? host;
}

/**
 * Short label for the pending Event Link row. Full URL stays in the tooltip.
 * Prefer a known site name; otherwise the bare hostname (no long path).
 */
export function eventLinkLabel(url: string): string {
  try {
    const host = hostKey(new URL(url).hostname);
    return `On ${friendlyHostLabel(host)}`;
  } catch {
    return "On source page";
  }
}

/**
 * Clock under a day heading. Date-only / midnight-only feeds (common from Allevents)
 * show "Time not listed" instead of a fake 00:00–01:00.
 */
export function pendingClockLabel(startsAt: Date, endsAt: Date | null | undefined): string {
  const start = londonParts(startsAt);
  const startMidnight = start.hour === 0 && start.minute === 0;
  if (!startMidnight) {
    return formatTimeRange(startsAt, endsAt);
  }
  if (!endsAt) return "Time not listed";
  const end = londonParts(endsAt);
  const sameDay = end.year === start.year && end.month === start.month && end.day === start.day;
  const endEqualsStart = endsAt.getTime() === startsAt.getTime();
  const endOneHour =
    sameDay && end.hour === 1 && end.minute === 0 && startsAt.getTime() + 60 * 60 * 1000 === endsAt.getTime();
  if (endEqualsStart || endOneHour || (sameDay && end.hour === 0 && end.minute === 0)) {
    return "Time not listed";
  }
  return formatTimeRange(startsAt, endsAt);
}

/** Full when-line for previews: date + honest clock. */
export function pendingWhen(startsAt: Date, endsAt: Date | null | undefined): string {
  const clock = pendingClockLabel(startsAt, endsAt);
  if (clock === "Time not listed") {
    return `${formatDate(startsAt)} · Time not listed`;
  }
  return formatDateTimeRange(startsAt, endsAt);
}

/** Personal greeting + tip for Pending review. */
export function pendingReviewLede(user: { name: string; role: Role }): string {
  const first = user.name.trim().split(/\s+/)[0] || "Hello";
  const who = user.role === "admin" ? "as admin" : "for your cell";
  return `${first} — review scraped listings ${who}. Tap a tile for details, or the Event Link for the listing in a new tab. Select several to approve together.`;
}
