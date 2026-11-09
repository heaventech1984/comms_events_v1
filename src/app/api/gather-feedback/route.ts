import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canSubmitFeedback } from "@/lib/feedback-hub/policy";
import { actorFrom, createFeedback } from "@/lib/feedback-hub/service";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import type { FeedbackKind } from "@/lib/feedback-hub/policy";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "") as FeedbackKind;
  const gate = canSubmitFeedback(actorFrom(user), kind);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const area = String(form.get("area") ?? "");
  const summary = String(form.get("summary") ?? "");
  const body = String(form.get("body") ?? "");
  const severity = kind === "issue" ? String(form.get("severity") ?? "") : undefined;
  const pageUrl = String(form.get("pageUrl") ?? "");

  let image: { bytes: Buffer; mime: string } | null = null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    const mime = file.type === "image/png" ? "image/png" : file.type === "image/jpeg" ? "image/jpeg" : "";
    if (!mime) return NextResponse.json({ error: "Use JPEG or PNG only." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    image = { bytes, mime };
  }

  try {
    const row = await createFeedback({
      user,
      kind,
      severity,
      area,
      summary,
      body,
      pageUrl: pageUrl || undefined,
      image
    });
    await writeAudit({
      actorId: user.id,
      action: "gather-feedback.submit",
      entityType: "FeedbackSubmission",
      entityId: row.id,
      summary: `${user.name} submitted ${kind} ${row.publicId}`
    });
    return NextResponse.json({ ok: true, publicId: row.publicId, id: row.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
