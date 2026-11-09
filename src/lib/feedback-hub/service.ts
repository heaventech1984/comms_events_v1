import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/session";
import { safeNextPath } from "@/lib/security";
import { FEEDBACK_AREAS, isFeedbackArea, isIssueSeverity } from "./areas";
import { nextCounterId } from "./counter";
import { saveFeedbackImage } from "./images";
import { canViewFeedbackRow } from "./policy";
import type { FeedbackKind } from "./policy";

const RATE_LIMIT = 10;
const ISSUE_STATUSES = ["open", "triaged", "fixed", "wontfix"] as const;
const DESIRABLE_STATUSES = ["pending", "approved", "rejected", "exported"] as const;

export function actorFrom(user: SessionUser) {
  return { id: user.id, role: user.role, cellId: user.cellId };
}

export async function submissionsLastDay(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.feedbackSubmission.count({
    where: { submitterId: userId, createdAt: { gte: since } }
  });
}

export async function listFeedbackForUser(user: SessionUser) {
  const actor = actorFrom(user);
  const all = await prisma.feedbackSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { submitter: { select: { name: true } } }
  });
  return all.filter((row) =>
    canViewFeedbackRow(actor, {
      kind: row.kind as FeedbackKind,
      severity: row.severity,
      submitterId: row.submitterId,
      cellId: row.cellId,
      status: row.status
    })
  );
}

export async function createFeedback(input: {
  user: SessionUser;
  kind: FeedbackKind;
  severity?: string;
  area: string;
  summary: string;
  body: string;
  pageUrl?: string | null;
  image?: { bytes: Buffer; mime: string } | null;
}) {
  const count = await submissionsLastDay(input.user.id);
  if (count >= RATE_LIMIT) throw new Error("Too many submissions today. Try again tomorrow.");

  if (!isFeedbackArea(input.area)) throw new Error("Choose a valid area.");
  const summary = input.summary.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 2000);
  if (!summary || !body) throw new Error("Summary and description are required.");

  let severity: string | null = null;
  if (input.kind === "issue") {
    if (!input.severity || !isIssueSeverity(input.severity)) throw new Error("Choose severity.");
    severity = input.severity;
  }

  const publicId =
    input.kind === "issue"
      ? await nextCounterId("feedback_issue", "I")
      : await nextCounterId("feedback_desirable", "FD");

  const status = input.kind === "issue" ? "open" : "pending";
  const pageUrlRaw = input.pageUrl?.trim();
  const pageUrl =
    pageUrlRaw && pageUrlRaw.startsWith("/") ? safeNextPath(pageUrlRaw) : null;

  const row = await prisma.feedbackSubmission.create({
    data: {
      publicId,
      kind: input.kind,
      status,
      severity,
      area: input.area,
      summary: input.kind === "issue" ? summary : summary.slice(0, 280),
      body,
      pageUrl: pageUrl === "/" ? null : pageUrl,
      submitterId: input.user.id,
      cellId: input.user.cellId
    }
  });

  if (input.image) {
    const saved = await saveFeedbackImage(row.id, input.image.bytes, input.image.mime);
    await prisma.feedbackSubmission.update({
      where: { id: row.id },
      data: { imagePath: saved.relativePath, imageMime: saved.mime }
    });
  }

  return row;
}

export async function triageFeedback(
  id: string,
  user: SessionUser,
  status: string
) {
  const row = await prisma.feedbackSubmission.findUnique({ where: { id } });
  if (!row || row.kind !== "issue") throw new Error("Not found.");
  if (!(ISSUE_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid status.");
  return prisma.feedbackSubmission.update({
    where: { id },
    data: { status, triagedById: user.id }
  });
}

export async function approveDesirable(id: string, user: SessionUser) {
  const row = await prisma.feedbackSubmission.findUnique({ where: { id } });
  if (!row || row.kind !== "desirable") throw new Error("Not found.");
  if (row.status === "approved" || row.status === "exported") return row;
  const assignedDId = await nextCounterId("feedback_desirable_d", "D");
  return prisma.feedbackSubmission.update({
    where: { id },
    data: { status: "approved", assignedDId, triagedById: user.id }
  });
}

export async function rejectDesirable(id: string, user: SessionUser, reason: string) {
  const row = await prisma.feedbackSubmission.findUnique({ where: { id } });
  if (!row || row.kind !== "desirable") throw new Error("Not found.");
  return prisma.feedbackSubmission.update({
    where: { id },
    data: {
      status: "rejected",
      rejectReason: reason.trim().slice(0, 500),
      triagedById: user.id
    }
  });
}

