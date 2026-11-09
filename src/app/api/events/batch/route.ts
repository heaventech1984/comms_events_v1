import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const BATCH_CAP = 50;

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "You cannot review events." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    ids?: unknown;
    status?: unknown;
  };
  const status = body.status === "PUBLISHED" || body.status === "DISCARDED" ? body.status : null;
  if (!status) {
    return NextResponse.json({ error: "Choose Approve or Discard." }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.map((id) => String(id).trim()).filter(Boolean))].slice(0, BATCH_CAP)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one event." }, { status: 400 });
  }

  const events = await prisma.event.findMany({
    where: { id: { in: ids }, status: "PENDING" },
    select: { id: true, title: true }
  });
  if (events.length === 0) {
    return NextResponse.json({ error: "None of those events are still pending." }, { status: 404 });
  }

  await prisma.event.updateMany({
    where: { id: { in: events.map((e) => e.id) } },
    data: { status, reviewedById: user.id }
  });

  const action = status === "PUBLISHED" ? "event.batch-publish" : "event.batch-discard";
  const verb = status === "PUBLISHED" ? "approved" : "discarded";
  await writeAudit({
    actorId: user.id,
    action,
    entityType: "Event",
    entityId: events[0]!.id,
    summary: `${user.name} ${verb} ${events.length} pending event(s): ${events
      .slice(0, 5)
      .map((e) => e.title)
      .join("; ")}${events.length > 5 ? "…" : ""}`
  });

  return NextResponse.json({
    ok: true,
    updated: events.length,
    skipped: ids.length - events.length,
    status
  });
}
