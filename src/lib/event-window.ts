/** Attend stays open until the finish time. At that instant it closes. */
export function eventStillBookable(endsAt: Date, now: Date): boolean {
  return now.getTime() < endsAt.getTime();
}

/** Attendance can be confirmed any time after an event has finished. */
export function attendanceAvailable(endsAt: Date, now: Date): boolean {
  return now.getTime() >= endsAt.getTime();
}
