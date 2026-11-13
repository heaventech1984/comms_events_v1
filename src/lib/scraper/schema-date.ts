import { londonDate, londonParts } from "../time";

export type ParsedSchemaInstant = {
  at: Date;
  /** True when the source gave a calendar day with no real clock time. */
  dateOnly: boolean;
};

/**
 * Parse schema.org / microdata start or end values.
 * Date-only strings ("2026-11-10") become London midnight and mark dateOnly —
 * callers should not invent a fake 01:00 end for those.
 */
export function parseSchemaInstant(raw: string | null | undefined): ParsedSchemaInstant | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    return { at: londonDate(year, month, day, 0, 0), dateOnly: true };
  }

  // Trailing T00:00(:00) with no offset often means "day only" from aggregators.
  const midnightLocal = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00)?(?:\.0+)?$/.exec(s);
  if (midnightLocal) {
    const year = Number(midnightLocal[1]);
    const month = Number(midnightLocal[2]);
    const day = Number(midnightLocal[3]);
    return { at: londonDate(year, month, day, 0, 0), dateOnly: true };
  }

  // Aggregators sometimes emit UTC midnight for a calendar day (Allevents / schema dumps).
  const midnightUtc = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00)?(?:\.0+)?Z$/i.exec(s);
  if (midnightUtc) {
    const year = Number(midnightUtc[1]);
    const month = Number(midnightUtc[2]);
    const day = Number(midnightUtc[3]);
    return { at: londonDate(year, month, day, 0, 0), dateOnly: true };
  }

  const at = new Date(s);
  if (Number.isNaN(at.getTime())) return null;
  return { at, dateOnly: false };
}

/** End instant for a start: keep date-only ends honest; otherwise default +1h only when timed. */
export function resolveSchemaEnd(
  start: ParsedSchemaInstant,
  endRaw: string | null | undefined
): Date {
  const end = parseSchemaInstant(endRaw);
  if (end && !Number.isNaN(end.at.getTime()) && end.at.getTime() > start.at.getTime()) {
    return end.at;
  }
  if (start.dateOnly) {
    // Same midnight — display layer shows "Time not listed" instead of 00:00–01:00.
    return start.at;
  }
  return new Date(start.at.getTime() + 60 * 60 * 1000);
}

function nextLondonMidnight(date: Date): Date {
  const p = londonParts(date);
  const noon = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  noon.setUTCDate(noon.getUTCDate() + 1);
  return londonDate(noon.getUTCFullYear(), noon.getUTCMonth() + 1, noon.getUTCDate(), 0, 0);
}

/**
 * True when the stored range is a calendar day with no real clock.
 * Next-midnight ends (00:00 the following day) count too — they are not a timed event.
 */
export function isDateOnlyStoredRange(startsAt: Date, endsAt: Date | null | undefined): boolean {
  const start = londonParts(startsAt);
  if (start.hour !== 0 || start.minute !== 0) return false;
  if (!endsAt) return true;
  if (endsAt.getTime() === startsAt.getTime()) return true;
  if (endsAt.getTime() === nextLondonMidnight(startsAt).getTime()) return true;
  const end = londonParts(endsAt);
  const sameDay = end.year === start.year && end.month === start.month && end.day === start.day;
  return sameDay && end.hour === 1 && end.minute === 0;
}
