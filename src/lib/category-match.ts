import { CATEGORIES, parseCategory, type Category } from "./constants";

/**
 * How close two Gather types are. Same type is 1.
 * Neighbouring types (work, campus socials, church socials) score in between.
 * Like putting similar recipe cards next to each other in a kitchen drawer.
 */
const AFFINITY: Record<Category, Record<Category, number>> = {
  Christian: { Christian: 1, Networking: 0.05, Professional: 0.05, Student: 0.15, Meetup: 0.35 },
  Networking: { Christian: 0.05, Networking: 1, Professional: 0.7, Student: 0.25, Meetup: 0.4 },
  Professional: { Christian: 0.05, Networking: 0.7, Professional: 1, Student: 0.3, Meetup: 0.2 },
  Student: { Christian: 0.15, Networking: 0.25, Professional: 0.3, Student: 1, Meetup: 0.5 },
  Meetup: { Christian: 0.35, Networking: 0.4, Professional: 0.2, Student: 0.5, Meetup: 1 }
};

/** Words that mean a Gather type, including near-synonyms. */
const ALIASES: Record<Category, string[]> = {
  Christian: [
    "christian",
    "church",
    "cathedral",
    "faith",
    "worship",
    "gospel",
    "prayer",
    "eucharist",
    "parish",
    "chapel",
    "sermon",
    "anglican",
    "catholic",
    "baptist",
    "bible",
    "fellowship",
    "liturgy",
    "mass"
  ],
  Networking: ["networking", "network", "founders", "startup", "startups", "coworking", "breakfast"],
  Professional: ["professional", "career", "careers", "business", "director", "chamber", "cpd", "leadership"],
  Student: ["student", "students", "university", "campus", "freshers", "undergraduate", "guild"],
  Meetup: ["meetup", "mixer", "social", "walk"]
};

const STOP = new Set(["at", "the", "a", "an", "of", "in", "and", "for", "to", "on", "with", "by"]);

export function categoryAffinity(from: string, to: string): number {
  const a = parseCategory(from);
  const b = parseCategory(to);
  if (!a || !b) return 0;
  return AFFINITY[a][b];
}

/** Letters-only distance, including a swapped pair. So "christain" still counts as "christian". */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dist[i][0] = i;
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dist[i][j] = Math.min(dist[i][j], dist[i - 2][j - 2] + 1);
      }
    }
  }
  return dist[a.length][b.length];
}

function stem(token: string): string {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw)) continue;
    const token = stem(raw);
    if (token.length < 2 || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

function tokensClose(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  return editDistance(a, b) <= 1;
}

/** 0–1 share of overlapping words, allowing a one-letter slip on longer words. */
export function tokenOverlap(left: string, right: string): number {
  const a = tokenize(left);
  const b = tokenize(right);
  if (a.length === 0 || b.length === 0) return 0;
  let hits = 0;
  for (const token of a) {
    if (b.some((other) => tokensClose(token, other))) hits += 1;
  }
  return hits / Math.max(a.length, b.length);
}

function aliasHit(token: string, alias: string): boolean {
  if (token === alias || stem(token) === alias) return true;
  if (alias.length >= 6 && token.length >= 5 && editDistance(token, alias) <= 1) return true;
  return false;
}

/** Guess a Gather type from free text when the letters are close, not only exact. */
export function nearestCategoryFromText(text: string): Category | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  for (const category of CATEGORIES) {
    for (const alias of ALIASES[category]) {
      if (tokens.some((token) => aliasHit(token, alias))) return category;
    }
  }
  return null;
}
