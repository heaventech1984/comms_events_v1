import { cleanText } from "./scraper/text";

/**
 * Collapse repeated city / venue / country crumbs from aggregator place strings.
 * Like wiping a sticky label that says “kitchen, kitchen, house” down to “kitchen”.
 */
export function tidyPlaceName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = cleanText(raw);
  if (!s) return null;

  // Meetup placeholder spam
  if (/^(see main event text)([,\s—–-]+\1)*([,\s]+(?:gb|uk))?$/i.test(s)) return null;

  s = s.replace(/\s*[—–]\s*/g, " — ");

  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const norm = part.toLowerCase().replace(/\.$/, "");
    if (/^(gb|uk|united kingdom|england)$/i.test(norm)) continue;
    // Lone Meetup region crumbs like ", al,"
    if (/^[a-z]{2}$/i.test(norm) && !/^(uk)$/i.test(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(part);
  }

  let result = out.join(", ");
  const split = result.match(/^(.+?)\s+—\s+(.+)$/);
  if (split) {
    const venue = split[1].trim();
    let rest = split[2].trim();
    if (rest.toLowerCase().startsWith(venue.toLowerCase())) {
      rest = rest.slice(venue.length).replace(/^[\s,]+/, "");
    }
    // Drop a second copy of the city that only appeared after the venue name
    result = rest ? `${venue} — ${rest}` : venue;
  }

  result = result.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  return result || null;
}
