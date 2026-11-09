import { prisma } from "../db";
import {
  CATEGORIES,
  FEEDBACK_RATINGS,
  type Category,
  type FeedbackRating,
  parseCategory,
  parseFeedbackRating
} from "../constants";
import type { InsightsScope } from "../policy";
import { formatDateTime } from "../time";

export const FEEDBACK_RATING_LABELS: Record<FeedbackRating, string> = {
  LOVED: "Loved it",
  OK: "It was fine",
  NOT_FOR_ME: "Not for me"
};

export type FeedbackFilters = {
  from: Date;
  to: Date;
  category: Category | "";
  rating: FeedbackRating | "";
  q: string;
  cellId: string | null;
};

export type FeedbackRow = {
  id: string;
  rating: FeedbackRating;
  ratingLabel: string;
  createdAt: string;
  memberName: string;
  cellName: string;
  cellId: string | null;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventStartsAt: string;
  online: boolean;
};

export type FeedbackSummary = {
  total: number;
  byRating: Record<FeedbackRating, number>;
};

export function parseFeedbackQuery(params: Record<string, string | undefined>): {
  rating: FeedbackRating | "";
  q: string;
} {
  const rating = parseFeedbackRating(params.rating ?? "") ?? "";
  const q = String(params.q ?? "").trim().slice(0, 80);
  return { rating, q };
}

/**
 * Ratings only — never select comment. Scoped like insights (cell leader = own cell).
 */
export async function loadFeedbackRows(
  scope: InsightsScope,
  filters: FeedbackFilters
): Promise<{ rows: FeedbackRow[]; summary: FeedbackSummary; scopeLabel: string }> {
  const cellFilter =
    scope.kind === "cell" ? scope.cellId : filters.cellId ? filters.cellId : undefined;

  const rowsRaw = await prisma.eventFeedback.findMany({
    where: {
      createdAt: { gte: filters.from, lt: filters.to },
      ...(filters.rating ? { rating: filters.rating } : {}),
      user: cellFilter ? { cellId: cellFilter } : undefined,
      event: {
        ...(filters.category ? { category: filters.category } : {}),
        status: "PUBLISHED"
      }
    },
    // Never select comment — private to the member.
    select: {
      id: true,
      rating: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          cellId: true,
          cell: { select: { name: true } }
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          category: true,
          startsAt: true,
          online: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const q = filters.q.toLowerCase();
  const rows: FeedbackRow[] = [];
  const byRating: Record<FeedbackRating, number> = {
    LOVED: 0,
    OK: 0,
    NOT_FOR_ME: 0
  };

  for (const row of rowsRaw) {
    const rating = parseFeedbackRating(row.rating);
    if (!rating) continue;
    if (q) {
      const hay = `${row.user.name} ${row.event.title} ${row.user.cell?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    byRating[rating] += 1;
    rows.push({
      id: row.id,
      rating,
      ratingLabel: FEEDBACK_RATING_LABELS[rating],
      createdAt: formatDateTime(row.createdAt),
      memberName: row.user.name,
      cellName: row.user.cell?.name ?? "No cell",
      cellId: row.user.cellId,
      eventId: row.event.id,
      eventTitle: row.event.title,
      eventCategory: CATEGORIES.includes(row.event.category as Category)
        ? row.event.category
        : row.event.category,
      eventStartsAt: formatDateTime(row.event.startsAt),
      online: row.event.online
    });
  }

  let scopeLabel = "All cells";
  if (scope.kind === "cell" || cellFilter) {
    const cell = await prisma.cell.findUnique({
      where: { id: scope.kind === "cell" ? scope.cellId : cellFilter! },
      select: { name: true }
    });
    scopeLabel = cell?.name ? `Your cell · ${cell.name}` : "Your cell";
    if (scope.kind === "region" && cellFilter) {
      scopeLabel = cell?.name ? `Cell · ${cell.name}` : "One cell";
    }
  }

  return {
    rows,
    summary: { total: rows.length, byRating },
    scopeLabel
  };
}

export function feedbackExportTable(rows: FeedbackRow[]) {
  return {
    name: "Member feedback",
    columns: [
      "When rated",
      "Rating",
      "Member",
      "Cell",
      "Event",
      "Event type",
      "Event starts",
      "Format"
    ],
    rows: rows.map((r) => [
      r.createdAt,
      r.ratingLabel,
      r.memberName,
      r.cellName,
      r.eventTitle,
      r.eventCategory,
      r.eventStartsAt,
      r.online ? "Online" : "In person"
    ])
  };
}

export function feedbackFiltersFromInsights(
  base: { from: Date; to: Date; category: Category | ""; cellId: string | null },
  extra: { rating: FeedbackRating | ""; q: string }
): FeedbackFilters {
  return {
    from: base.from,
    to: base.to,
    category: parseCategory(base.category) ?? base.category,
    cellId: base.cellId,
    rating: extra.rating,
    q: extra.q
  };
}
