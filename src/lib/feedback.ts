import { parseFeedbackRating, type FeedbackRating } from "./constants";
import { prisma } from "./db";
import { LIMITS } from "./security";

export class FeedbackError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function cleanFeedbackComment(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim();
  return text;
}

export function feedbackInputProblem(input: { rating: unknown; comment: unknown }): string | null {
  if (!parseFeedbackRating(input.rating)) return "Choose how it felt.";
  const comment = cleanFeedbackComment(input.comment);
  if (comment.length > LIMITS.feedbackComment) {
    return `A note must be ${LIMITS.feedbackComment} characters or fewer.`;
  }
  return null;
}

export async function saveEventFeedback(opts: {
  userId: string;
  eventId: string;
  rating: FeedbackRating;
  comment: string;
}) {
  const event = await prisma.event.findUnique({ where: { id: opts.eventId } });
  if (!event || event.status !== "PUBLISHED") {
    throw new FeedbackError("That event is not on the calendar.", 404);
  }
  if (event.startsAt > new Date()) {
    throw new FeedbackError("You can leave a note after the event has started.");
  }
  const booking = await prisma.booking.findUnique({
    where: { eventId_userId: { eventId: opts.eventId, userId: opts.userId } }
  });
  if (!booking) {
    throw new FeedbackError("You can only rate an event you booked.");
  }
  if (booking.attendance === "ABSENT") {
    throw new FeedbackError("Feedback is for events you went to.");
  }

  const comment = cleanFeedbackComment(opts.comment);
  return prisma.eventFeedback.upsert({
    where: { userId_eventId: { userId: opts.userId, eventId: opts.eventId } },
    create: {
      userId: opts.userId,
      eventId: opts.eventId,
      rating: opts.rating,
      comment
    },
    update: { rating: opts.rating, comment }
  });
}

export async function eventsNeedingFeedback(userId: string, now = new Date()) {
  const [bookings, existing] = await Promise.all([
    prisma.booking.findMany({
      where: {
        userId,
        attendance: "ATTENDED",
        event: { status: "PUBLISHED", startsAt: { lt: now } }
      },
      include: { event: true },
      orderBy: { event: { startsAt: "desc" } },
      take: 8
    }),
    prisma.eventFeedback.findMany({
      where: { userId },
      select: { eventId: true }
    })
  ]);
  const done = new Set(existing.map((row) => row.eventId));
  return bookings.filter((booking) => !done.has(booking.eventId));
}
