import { dayKeyOf, formatDayKey } from "./calendar";

/** A calendar day is the London date the event is shown on. */
function londonDay(date: Date): string {
  return formatDayKey(dayKeyOf(date));
}

/** Attend stays open until the finish time. At that instant it closes. */
export function eventStillBookable(endsAt: Date, now: Date): boolean {
  return now.getTime() < endsAt.getTime();
}

/**
 * After the finish, while today is still a London day the event occupies.
 * A same-day finish is that day only. A finish the next morning includes that morning.
 */
export function onAttendanceDay(startsAt: Date, endsAt: Date, now: Date): boolean {
  if (now.getTime() < endsAt.getTime()) return false;
  const today = londonDay(now);
  return today >= londonDay(startsAt) && today <= londonDay(endsAt);
}
