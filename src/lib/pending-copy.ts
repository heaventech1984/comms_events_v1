import { formatDate, formatDateTimeRange, formatTimeRange, londonParts } from "./time";

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

/** Friendly site name for a hostname (or the bare host if unknown). */
export function friendlyHostLabel(hostnameOrUrl: string): string {
  try {
    const host = hostnameOrUrl.includes("://")
      ? hostKey(new URL(hostnameOrUrl).hostname)
      : hostKey(hostnameOrUrl);
    return EVENT_LINK_SITE_NAMES[host] ?? host;
  } catch {
    return hostnameOrUrl || "listing";
  }
}

/**
 * Short label for the pending Event Link row. Full URL stays in the tooltip.
 * Prefer a known site name; otherwise the bare hostname (no long path).
 */
export function eventLinkLabel(url: string): string {
  try {
    const host = hostKey(new URL(url).hostname);
    const site = EVENT_LINK_SITE_NAMES[host] ?? host;
    return `On ${site}`;
  } catch {
    return "On source page";
  }
}

/**
 * Midnight clocks with a missing or default +1h end usually mean the feed had a date
 * but no real start time (common on AllEvents). Show plain words instead of 00:00–01:00.
 */
export function clockLooksUnset(startsAt: Date, endsAt: Date | null | undefined): boolean {
  const a = londonParts(startsAt);
  if (a.hour !== 0 || a.minute !== 0) return false;
  if (!endsAt) return true;
  const b = londonParts(endsAt);
  if (a.year === b.year && a.month === b.month && a.day === b.day) {
    if (b.hour === 0 && b.minute === 0) return true;
    if (b.hour === 1 && b.minute === 0) return true;
  }
  // Same instant stored twice (date-only end = start).
  if (endsAt.getTime() === startsAt.getTime()) return true;
  return false;
}

/** Clock under a day heading — or “Time not listed” when the feed had no real time. */
export function pendingClockLabel(startsAt: Date, endsAt: Date | null | undefined): string {
  if (clockLooksUnset(startsAt, endsAt)) return "Time not listed";
  return formatTimeRange(startsAt, endsAt);
}

/** Start as full London date-time; end as clock only when same day. */
export function pendingWhen(startsAt: Date, endsAt: Date | null | undefined): string {
  if (clockLooksUnset(startsAt, endsAt)) {
    return `${formatDate(startsAt)} · Time not listed`;
  }
  return formatDateTimeRange(startsAt, endsAt);
}

/** First name for a short greeting (An Te → An). */
export function firstNameOf(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

/** Pending page lede — personal, role-aware, one clear tip. */
export function pendingReviewLede(user: { name: string; role: string }): string {
  const first = firstNameOf(user.name);
  if (user.role === "admin") {
    return `${first} — tap a tile to edit details, or the Event link to open the listing in a new tab. Use the chips to vet one type or Online / In person.`;
  }
  return `${first} — tap a tile to edit, or the Event link for the listing (new tab). Approve or Discard when you are ready.`;
}
