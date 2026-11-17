import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { prisma } from "@/lib/db";
import { fromDatetimeLocalValue } from "@/lib/time";
import { writeAudit } from "@/lib/audit";
import { deleteOccurrence } from "@/lib/series";
import { CATEGORIES, type Category } from "@/lib/constants";
import { decodeTags, encodeTags, parseTagsParam, withAttendance, withCostDefault } from "@/lib/tags";
import { stripTypeReviewNotes } from "@/lib/scraper/type-review";
import { eventInputProblem } from "@/lib/security";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "You cannot edit events." }, { status: 403 });
  }
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { _count: { select: { bookings: true } } } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.seriesMode === "future" && (!event.seriesId || event.status === "PENDING")) {
    return NextResponse.json({ error: "Series editing is only available for published recurring events." }, { status: 400 });
  }

  // Pending “Confirm type” / quick type switch — clear review notes and freeze scrape fields.
  if (body.confirmType === true) {
    const category = String(body.category ?? event.category);
    if (!CATEGORIES.includes(category as Category)) {
      return NextResponse.json({ error: "Choose a valid event type." }, { status: 400 });
    }
    await prisma.event.update({
      where: { id },
      data: {
        category,
        notes: stripTypeReviewNotes(event.notes),
        humanEditedAt: new Date(),
        reviewedById: user.id
      }
    });
    await writeAudit({
      actorId: user.id,
      action: "event.confirm-type",
      entityType: "Event",
      entityId: event.id,
      summary: `${user.name} confirmed type ${category} for ${event.title}`
    });
    return NextResponse.json({ ok: true, id: event.id });
  }

  // Status-only patches (pending Approve/Discard) must not wipe capacity.
  const capacity =
    body.capacity === undefined
      ? event.capacity
      : String(body.capacity).trim() === ""
        ? null
        : Number(body.capacity);
  if (body.seriesMode !== "future" && capacity !== null && capacity < event._count.bookings) {
    return NextResponse.json({ error: "Capacity cannot be below the current booking count." }, { status: 400 });
  }
  const category = String(body.category ?? event.category);
  if (!CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "Choose a valid event type." }, { status: 400 });
  }
  const nextStatus =
    body.status === "PUBLISHED" || body.status === "DISCARDED" ? String(body.status) : event.status;
  const statusChanging = nextStatus !== event.status;
  const title = String(body.title ?? event.title).trim();
  const notes = body.notes !== undefined ? String(body.notes).trim() || null : event.notes;
  const online = body.online === true || body.online === "on" || (body.online === undefined && event.online);
  const organisationName = String(body.organisationName ?? event.organisationName);
  const externalUrl = body.externalUrl !== undefined ? String(body.externalUrl).trim() || null : event.externalUrl;
  const placeName =
    body.placeName !== undefined ? String(body.placeName).trim() || null : event.placeName;
  const startsAt = body.startsAt ? fromDatetimeLocalValue(String(body.startsAt)) : event.startsAt;
  const endsAt = body.endsAt ? fromDatetimeLocalValue(String(body.endsAt)) : event.endsAt;
  const lat = body.lat !== undefined && String(body.lat) ? Number(body.lat) : event.lat;
  const lng = body.lng !== undefined && String(body.lng) ? Number(body.lng) : event.lng;
  const problem =
    (title ? null : "Title is required.") ??
    eventInputProblem({
      title,
      notes: notes ?? "",
      externalUrl: externalUrl ?? "",
      capacity,
      startsAt,
      endsAt,
      placeName
    });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const tags = encodeTags(
    withAttendance(
      withCostDefault(
        body.tags === undefined
          ? decodeTags(event.tags)
          : parseTagsParam((Array.isArray(body.tags) ? body.tags.map(String) : String(body.tags).split(",")).join(",")),
        `${title}\n${notes ?? ""}`
      ),
      online
    )
  );

  if (body.seriesMode === "future" && event.seriesId) {
    const editedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const where = { seriesId: event.seriesId!, startsAt: { gte: event.startsAt } };
      const occurrences = await tx.event.findMany({
        where,
        select: { id: true, _count: { select: { bookings: true } } }
      });
      if (capacity !== null && occurrences.some((occurrence) => occurrence._count.bookings > capacity)) {
        return { error: "Capacity cannot be below the booking count for any event in this series." };
      }
      if (!occurrences.some((occurrence) => occurrence.id === event.id)) {
        return { error: "This event is no longer part of the series." };
      }
      await tx.event.updateMany({
        where,
        data: {
          title,
          organisationName,
          category,
          online,
          tags,
          placeName,
          lat: Number.isFinite(lat) ? lat : event.lat,
          lng: Number.isFinite(lng) ? lng : event.lng,
          externalUrl,
          notes,
          capacity,
          humanEditedAt: editedAt
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "event.series.edit",
          entityType: "Event",
          entityId: event.seriesId,
          summary: `${user.name} edited ${title} for this and ${occurrences.length - 1} later series occurrence${occurrences.length === 2 ? "" : "s"}`
        }
      });
      return { id: event.id };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: result.id });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title,
      organisationName,
      category,
      startsAt,
      endsAt,
      online,
      tags,
      placeName,
      lat: Number.isFinite(lat) ? lat : event.lat,
      lng: Number.isFinite(lng) ? lng : event.lng,
      externalUrl,
      notes,
      capacity,
      status: nextStatus,
      reviewedById: statusChanging ? user.id : event.reviewedById,
      // Publish/discard is not a freeze; only a later Save stamps humanEditedAt.
      humanEditedAt: statusChanging ? event.humanEditedAt : new Date()
    }
  });
  if (nextStatus !== event.status) {
    await writeAudit({
      actorId: user.id,
      action: nextStatus === "PUBLISHED" ? "event.publish" : "event.discard",
      entityType: "Event",
      entityId: event.id,
      summary: `${user.name} set ${event.title} to ${nextStatus}`
    });
  }
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "You cannot delete events." }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode === "future" ? "future" : "this";
  await deleteOccurrence({ eventId: id, mode, actor: user });
  return NextResponse.json({ ok: true });
}
