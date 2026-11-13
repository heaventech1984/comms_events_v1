import { londonDate, londonParts } from "../time";
import { eventsFromJsonLd, extractJsonLdScripts } from "./jsonld";
import { isSeriesSpan, sessionLengthMs } from "./schema-date";
import { clip } from "./text";
import type { ScrapedEvent } from "./types";

/** Upcoming sittings taken from one series page. */
export const SLOT_CAP = 40;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
}

function monthNumber(name: string): number | null {
  const key = name.toLowerCase().slice(0, 4) === "sept" ? "sept" : name.toLowerCase().slice(0, 3);
  return MONTHS[key] ?? null;
}

type SlotMark = { year: number | null; month: number; day: number; hour: number | null; minute: number | null };

/** Dates written on the page, such as "15 Nov 2026" beside "11:30 AM". */
export function slotMarksFromText(text: string): SlotMark[] {
  const re =
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?(?:\s+(\d{4}))?(?:[^0-9]{0,40}?(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/gi;
  const marks: SlotMark[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const day = Number(match[1]);
    const month = monthNumber(match[2] ?? "");
    if (!month || day < 1 || day > 31) continue;
    let hour: number | null = null;
    let minute: number | null = null;
    if (match[6]) {
      hour = Number(match[4]);
      minute = Number(match[5] ?? "0");
      const ap = match[6].toLowerCase();
      if (ap === "pm" && hour < 12) hour += 12;
      if (ap === "am" && hour === 12) hour = 0;
    }
    marks.push({ year: match[3] ? Number(match[3]) : null, month, day, hour, minute });
  }
  return marks;
}

/**
 * One start instant per upcoming sitting.
 * A series that only names the first and last day returns nothing here — the caller keeps that row.
 */
export function upcomingSlotStarts(html: string, seriesStart: Date, now = new Date()): Date[] {
  const marks = slotMarksFromText(visibleText(html));
  const years = marks.map((mark) => mark.year).filter((year): year is number => year != null);
  const defaultYear = years.length ? Math.max(...years) : londonParts(seriesStart).year;
  const clock = londonParts(seriesStart);
  const seen = new Set<string>();
  const starts: Date[] = [];
  for (const mark of marks) {
    const year = mark.year ?? defaultYear;
    const hour = mark.hour ?? clock.hour;
    const minute = mark.minute ?? clock.minute;
    const key = `${year}-${mark.month}-${mark.day}-${hour}-${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    starts.push(londonDate(year, mark.month, mark.day, hour, minute));
  }
  return starts.filter((start) => start.getTime() >= now.getTime() - 60 * 60 * 1000).sort((a, b) => a.getTime() - b.getTime());
}

function slotKey(base: string, startsAt: Date): string {
  return clip(`${base}#${startsAt.toISOString()}`, 240);
}

/**
 * Turn a series page into one-off rows. Two or more upcoming sittings replace the spanning row.
 * One sitting, or none, leaves the original row alone.
 */
export function occurrencesFromDetailHtml(html: string, event: ScrapedEvent, now = new Date()): ScrapedEvent[] {
  const fromScripts = extractJsonLdScripts(html).flatMap((block) => eventsFromJsonLd(block, event.externalUrl || event.fetchedFrom || ""));
  const structured = fromScripts.filter(
    (row) => !isSeriesSpan(row.startsAt, row.endsAt) && row.startsAt.getTime() >= now.getTime() - 60 * 60 * 1000
  );
  const samePage = structured.filter((row) => !event.externalUrl || row.externalUrl === event.externalUrl || row.title === event.title);
  const chosen = samePage.length >= 2 ? samePage : structured.length >= 2 ? structured : [];
  if (chosen.length >= 2) {
    return chosen
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, SLOT_CAP)
      .map((row) => ({
        ...event,
        title: row.title && row.title !== "Untitled event" ? row.title : event.title,
        startsAt: row.startsAt,
        endsAt: isSeriesSpan(row.startsAt, row.endsAt) ? new Date(row.startsAt.getTime() + sessionLengthMs(event.startsAt, event.endsAt)) : row.endsAt,
        sourceKey: slotKey(event.sourceKey, row.startsAt),
        externalUrl: event.externalUrl ?? row.externalUrl
      }));
  }
  if (!isSeriesSpan(event.startsAt, event.endsAt)) return [event];
  const length = sessionLengthMs(event.startsAt, event.endsAt);
  const starts = upcomingSlotStarts(html, event.startsAt, now).slice(0, SLOT_CAP);
  if (starts.length < 2) return [event];
  return starts.map((startsAt) => ({
    ...event,
    startsAt,
    endsAt: new Date(startsAt.getTime() + length),
    sourceKey: slotKey(event.sourceKey, startsAt)
  }));
}
