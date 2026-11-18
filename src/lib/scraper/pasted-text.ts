import { LIMITS } from "../security";
import { londonParts } from "../time";
import { cleanText, clip, looksOnline, stripHtml } from "./text";
import { parseMslTimeRange } from "./msl";
import type { ScrapedEvent } from "./types";

const MONTH_NUMBER: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12
};
const MONTH_FULL = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_PATTERN = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function labelled(lines: string[], keys: string[]): string {
  const key = keys.join("|");
  const match = lines.find((line) => new RegExp(`^(?:${key})\\s*[:–-]\\s*`, "i").test(line));
  return match?.replace(new RegExp(`^(?:${key})\\s*[:–-]\\s*`, "i"), "").trim() ?? "";
}

function normaliseDateLine(value: string): string {
  return value
    .replace(/^[A-Za-z]+,?\s+/, "")
    .replace(/\b(\d{1,2})-([A-Za-z]{3,9})-(\d{4})\b/g, "$1 $2 $3")
    .replace(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/g, "$2 $1 $3")
    .replace(/\b(jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi, (month) => ({
      jan: "January", feb: "February", mar: "March", apr: "April", jun: "June",
      jul: "July", aug: "August", sep: "September", sept: "September", oct: "October",
      nov: "November", dec: "December"
    })[month.toLowerCase()] ?? month);
}

function dateLine(lines: string[]): string {
  const withLabel = labelled(lines, ["date", "day"]);
  if (withLabel) return withLabel;
  const pattern = new RegExp(
    `\\b(?:${MONTH_PATTERN})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b|\\b\\d{1,2}(?:st|nd|rd|th)?[-\\s]+(?:${MONTH_PATTERN})(?:[-\\s]+\\d{4})?\\b`,
    "i"
  );
  return lines.find((line) => pattern.test(line)) ?? "";
}

function normalisePastedDate(value: string, currentYear: number): { value: string; hasYear: boolean } | null {
  const monthFirst = value.match(new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"));
  const dayFirst = value.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[-\\s]+(${MONTH_PATTERN})(?:[-\\s]+(\\d{4}))?\\b`, "i"));
  const match = monthFirst ?? dayFirst;
  if (!match) return null;
  const monthName = monthFirst ? match[1]! : match[2]!;
  const day = Number(monthFirst ? match[2] : match[1]);
  const yearText = match[3];
  const year = yearText ? Number(yearText) : currentYear;
  const month = MONTH_NUMBER[monthName.toLowerCase()];
  if (!month || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return {
    value: yearText ? normaliseDateLine(value) : `${day} ${MONTH_FULL[month]} ${year}`,
    hasYear: Boolean(yearText)
  };
}

/** Extract one user-pasted event when the copied page has no machine-readable markup. */
export function eventFromPastedText(rawText: string, sourceUrl: string, now = new Date()): ScrapedEvent | null {
  const text = stripHtml(rawText).replace(/\u00a0/g, " ");
  const lines = text.split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean);
  const title = labelled(lines, ["title", "event", "event name", "name"]) || lines.find((line) =>
    !/^(about|location|venue|when|date|time|details|register|book now|share|add to calendar)$/i.test(line) &&
    !/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(line) &&
    !/\b\d{1,2}:?\d{0,2}\s*(?:am|pm)\b/i.test(line)
  ) || "";
  const dateValue = dateLine(lines);
  const timeValue = labelled(lines, ["time", "hours"]) || lines.find((line) =>
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(line)
  ) || "";
  const currentYear = londonParts(now).year;
  const date = normalisePastedDate(dateValue, currentYear);
  const timePart = timeValue.replace(/^(?:time|hours)\s*[:–-]\s*/i, "");
  const timeRange = timeValue.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|\u2013|\u2014|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)?.[0];
  const parsedTime = date && (timeRange || timePart)
    ? parseMslTimeRange(`${date.value} ${timeRange ?? timePart}`, currentYear)
    : null;
  if (!title || !parsedTime) return null;
  if (!date!.hasYear && parsedTime.startsAt < now) return null;

  const placeName = labelled(lines, ["location", "venue", "where", "place"]) ||
    lines.find((line) => /\b(?:Birmingham|Gas Street South|Gas Street Church)\b/i.test(line)) || "";
  const organisationName = labelled(lines, ["organisation", "organizer", "organiser"]) ||
    (() => {
      try { return new URL(sourceUrl).hostname.split(".")[0].replace(/[-_]/g, " "); } catch { return "Event organiser"; }
    })();
  const description = labelled(lines, ["description", "about", "details"]);
  const notes = description || null;
  const host = (() => { try { return new URL(sourceUrl).hostname; } catch { return "pasted-content"; } })();
  return {
    sourceKey: `pasted:${clip(`${host}:${title}:${parsedTime.startsAt.toISOString()}`, 180)}`,
    title: clip(title, LIMITS.titleLength),
    organisationName: clip(organisationName, LIMITS.titleLength),
    category: "Social",
    startsAt: parsedTime.startsAt,
    endsAt: parsedTime.endsAt,
    online: looksOnline(title, placeName, notes ?? ""),
    placeName: placeName ? clip(placeName, LIMITS.placeLength) : null,
    lat: null,
    lng: null,
    externalUrl: sourceUrl,
    notes: notes ? clip(notes, LIMITS.textLength) : null,
    fetchedFrom: sourceUrl,
    needsTypeReview: true
  };
}
