import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canApproveDesirable } from "@/lib/feedback-hub/policy";
import { actorFrom, approveDesirable } from "@/lib/feedback-hub/service";
import { desirableMarkdownRow } from "@/lib/feedback-hub/markdown";
import { originAllowed, rejectOrigin } from "@/lib/origin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const gate = canApproveDesirable(actorFrom(user));
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  const { id } = await params;
  try {
    const row = await approveDesirable(id, user);
    const markdown = desirableMarkdownRow({
      assignedDId: row.assignedDId ?? "D-???",
      area: row.area,
      wish: row.summary,
      why: row.body,
      heardFrom: `Feedback / ${user.name}`,
      visual: row.imagePath ? `—` : "—"
    });
    await writeAudit({
      actorId: user.id,
      action: "gather-feedback.approve",
      entityType: "FeedbackSubmission",
      entityId: id,
      summary: `${user.name} approved ${row.publicId} as ${row.assignedDId}`
    });
    return NextResponse.json({ ok: true, assignedDId: row.assignedDId, markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
