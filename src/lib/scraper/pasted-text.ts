import { LIMITS } from "../security";
import { londonParts } from "../time";
import { cleanText, clip, looksOnline, stripHtml } from "./text";
import { parseMslTimeRange } from "./msl";
import type { ScrapedEvent } from "./types";

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

/** Extract one user-pasted event when the copied page has no machine-readable markup. */
export function eventFromPastedText(rawText: string, sourceUrl: string): ScrapedEvent | null {
  const text = stripHtml(rawText).replace(/\u00a0/g, " ");
  const lines = text.split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean);
  const title = labelled(lines, ["title", "event", "event name", "name"]) || lines.find((line) =>
    !/^(about|location|venue|when|date|time|details|register|book now|share|add to calendar)$/i.test(line) &&
    !/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(line) &&
    !/\b\d{1,2}:?\d{0,2}\s*(?:am|pm)\b/i.test(line)
  ) || "";
  const dateValue = labelled(lines, ["date", "day"]) || lines.find((line) =>
    /\b\d{1,2}(?:st|nd|rd|th)?[-\s,]+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[-\s,]+\d{4}\b/i.test(line)
  ) || "";
  const timeValue = labelled(lines, ["time", "hours"]) || lines.find((line) =>
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(line)
  ) || "";
  const datePart = normaliseDateLine(dateValue);
  const timePart = timeValue.replace(/^(?:time|hours)\s*[:–-]\s*/i, "");
  const parsedTime = datePart && timePart
    ? parseMslTimeRange(`${datePart} ${timePart}`, londonParts(new Date()).year)
    : null;
  if (!title || !parsedTime) return null;

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
