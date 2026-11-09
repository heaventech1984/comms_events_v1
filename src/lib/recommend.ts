import { parseCategory, type Category } from "./constants";
import { prisma } from "./db";
import { categoryAffinity, tokenOverlap } from "./category-match";

export type TasteKind = "loved" | "attended" | "committed" | "skipped";

export type TasteSignal = {
  eventId: string;
  title: string;
  organisationName: string;
  category: Category;
  kind: TasteKind;
};

export type RecommendCandidate = {
  id: string;
  title: string;
  organisationName: string;
  category: string;
  startsAt: Date;
  endsAt: Date;
  online: boolean;
  placeName: string | null;
  seriesId?: string | null;
};

export type Recommendation = RecommendCandidate & {
  score: number;
  reason: string;
};

const WEIGHT: Record<TasteKind, number> = {
  loved: 4,
  attended: 3,
  committed: 1.6,
  skipped: -2
};

const SCORE_FLOOR = 0.35;

function haystack(title: string, organisationName: string): string {
  return `${title} ${organisationName}`;
}

function reasonFor(signal: TasteSignal): string {
  const title = signal.title;
  if (signal.kind === "loved") return `Because you loved ${title}`;
  if (signal.kind === "attended") return `Because you went to ${title}`;
  if (signal.kind === "skipped") return `Because ${title} was not for you`;
  return `Because you booked ${title}`;
}

/**
 * Rank upcoming events from what this person booked, went to, or rated.
 * Close types (Networking ~ Professional) and similar titles both count.
 */
export function scoreRecommendations(
  signals: TasteSignal[],
  candidates: RecommendCandidate[],
  limit = 4
): Recommendation[] {
  if (signals.length === 0) return [];
  const scored: Recommendation[] = [];

  for (const candidate of candidates) {
    const candidateCategory = parseCategory(candidate.category);
    if (!candidateCategory) continue;
    const candidateHay = haystack(candidate.title, candidate.organisationName);
    let score = 0;
    let bestWeight = 0;
    let reason = "";

    for (const signal of signals) {
      if (signal.eventId === candidate.id) continue;
      const affinity = categoryAffinity(signal.category, candidateCategory);
      const overlap = tokenOverlap(haystack(signal.title, signal.organisationName), candidateHay);
      const sameOrg =
        signal.organisationName.trim().toLowerCase() === candidate.organisationName.trim().toLowerCase() ? 0.35 : 0;
      const closeness = affinity * 0.65 + overlap * 0.35 + sameOrg;
      const weighted = closeness * WEIGHT[signal.kind];
      score += weighted;
      if (Math.abs(weighted) >= Math.abs(bestWeight)) {
        bestWeight = weighted;
        reason = reasonFor(signal);
      }
    }

    if (score < SCORE_FLOOR || !reason) continue;
    scored.push({ ...candidate, score, reason });
  }

  scored.sort((a, b) => b.score - a.score || a.startsAt.getTime() - b.startsAt.getTime());
  const seen = new Set<string>();
  const unique: Recommendation[] = [];
  for (const row of scored) {
    const key = row.seriesId
      ? `s:${row.seriesId}`
      : `t:${row.title.trim().toLowerCase()}|${row.organisationName.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= limit) break;
  }
  return unique;
}

function kindFrom(attendance: string, rating: string | null): TasteKind | null {
  if (rating === "NOT_FOR_ME" || attendance === "ABSENT") return "skipped";
  if (rating === "LOVED") return "loved";
  if (attendance === "ATTENDED") return "attended";
  if (attendance === "UNCONFIRMED") return "committed";
  return null;
}

export async function loadRecommendations(userId: string, now = new Date(), limit = 4): Promise<Recommendation[]> {
  const [bookings, feedbacks] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, event: { status: "PUBLISHED" } },
      include: { event: true }
    }),
    prisma.eventFeedback.findMany({ where: { userId } })
  ]);
  const ratingByEvent = new Map(feedbacks.map((row) => [row.eventId, row.rating]));

  const signals: TasteSignal[] = [];
  const bookedIds = new Set<string>();
  for (const booking of bookings) {
    bookedIds.add(booking.eventId);
    const category = parseCategory(booking.event.category);
    if (!category) continue;
    const kind = kindFrom(booking.attendance, ratingByEvent.get(booking.eventId) ?? null);
    if (!kind) continue;
    signals.push({
      eventId: booking.event.id,
      title: booking.event.title,
      organisationName: booking.event.organisationName,
      category,
      kind
    });
  }

  if (signals.length === 0) return [];

  const candidates = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: { gte: now },
      ...(bookedIds.size ? { id: { notIn: [...bookedIds] } } : {})
    },
    orderBy: { startsAt: "asc" },
    take: 80
  });

  return scoreRecommendations(signals, candidates, limit);
}
