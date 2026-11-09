import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { FeedbackError, feedbackInputProblem, saveEventFeedback } from "@/lib/feedback";
import { parseFeedbackRating } from "@/lib/constants";
import { originAllowed, rejectOrigin } from "@/lib/origin";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const problem = feedbackInputProblem({ rating: body?.rating, comment: body?.comment });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const rating = parseFeedbackRating(body?.rating);
  if (!rating) return NextResponse.json({ error: "Choose how it felt." }, { status: 400 });

  try {
    const row = await saveEventFeedback({
      userId: user.id,
      eventId: String(body?.eventId ?? ""),
      rating,
      comment: String(body?.comment ?? "")
    });
    await writeAudit({
      actorId: user.id,
      action: "feedback.save",
      entityType: "EventFeedback",
      entityId: row.id,
      summary: `${user.name} left ${rating} feedback on an event`
    });
    return NextResponse.json({ ok: true, id: row.id, rating: row.rating });
  } catch (error) {
    if (error instanceof FeedbackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
