import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canApproveDesirable } from "@/lib/feedback-hub/policy";
import { actorFrom, rejectDesirable } from "@/lib/feedback-hub/service";
import { originAllowed, rejectOrigin } from "@/lib/origin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const gate = canApproveDesirable(actorFrom(user));
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason ?? "");
  try {
    const row = await rejectDesirable(id, user, reason || "Not taken forward.");
    await writeAudit({
      actorId: user.id,
      action: "gather-feedback.reject",
      entityType: "FeedbackSubmission",
      entityId: id,
      summary: `${user.name} rejected ${row.publicId}`
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reject.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
