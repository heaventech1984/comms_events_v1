import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewFeedbackRow } from "@/lib/feedback-hub/policy";
import { actorFrom } from "@/lib/feedback-hub/service";
import { feedbackImageFullPath } from "@/lib/feedback-hub/images";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please sign in.", { status: 401 });
  const { id } = await params;
  const row = await prisma.feedbackSubmission.findUnique({ where: { id } });
  if (!row?.imagePath || !row.imageMime) return new NextResponse("Not found.", { status: 404 });
  const ok = canViewFeedbackRow(actorFrom(user), {
    kind: row.kind as "issue" | "desirable",
    severity: row.severity,
    submitterId: row.submitterId,
    cellId: row.cellId,
    status: row.status
  });
  if (!ok) return new NextResponse("Forbidden.", { status: 403 });
  try {
    const bytes = await readFile(feedbackImageFullPath(row.imagePath));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": row.imageMime,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
