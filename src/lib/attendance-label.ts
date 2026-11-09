/**
 * Shared chip label for attendance enums on event + bookings pages.
 * Future UNCONFIRMED means they clicked Attend — say Going, not the database word.
 */
export function attendanceLabel(value: string, opts?: { past?: boolean }): string {
  if (value === "ATTENDED") return "Attended";
  if (value === "ABSENT") return "Didn’t";
  if (value === "UNCONFIRMED" && opts?.past === false) return "Going";
  return "Unconfirmed";
}

export function attendanceChipClass(value: string): string {
  return `attendance-chip attendance-${value.toLowerCase()}`;
}
