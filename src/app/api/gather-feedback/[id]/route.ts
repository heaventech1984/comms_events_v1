import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canTriageFeedback } from "@/lib/feedback-hub/policy";
import { actorFrom, triageFeedback } from "@/lib/feedback-hub/service";
import { prisma } from "@/lib/db";
import { originAllowed, rejectOrigin } from "@/lib/origin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const row = await prisma.feedbackSubmission.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const gate = canTriageFeedback(actorFrom(user), {
    kind: row.kind as "issue" | "desirable",
    severity: row.severity,
    submitterId: row.submitterId,
    cellId: row.cellId,
    status: row.status
  });
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  try {
    const updated = await triageFeedback(id, user, status);
    await writeAudit({
      actorId: user.id,
      action: "gather-feedback.triage",
      entityType: "FeedbackSubmission",
      entityId: id,
      summary: `${user.name} set ${updated.publicId} to ${status}`
    });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
