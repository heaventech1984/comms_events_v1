import type { Actor, Decision } from "@/lib/policy";

export type FeedbackKind = "issue" | "desirable";

export type FeedbackRow = {
  kind: FeedbackKind;
  severity: string | null;
  submitterId: string;
  cellId: string | null;
  status: string;
};

const allow: Decision = { ok: true };
const deny = (reason: string): Decision => ({ ok: false, status: 403, reason });

/** v1: admin + cell leader only. Members: v2. */
export function canAccessFeedback(actor: Actor): Decision {
  if (actor.role === "admin") return allow;
  if (actor.role === "cell leader" && actor.cellId) return allow;
  return deny("Feedback is for admins and cell leaders.");
}

export function canSubmitFeedback(actor: Actor, kind: FeedbackKind): Decision {
  const gate = canAccessFeedback(actor);
  if (!gate.ok) return gate;
  if (kind !== "issue" && kind !== "desirable") return deny("Unknown feedback kind.");
  return allow;
}

export function canViewFeedbackRow(actor: Actor, row: FeedbackRow): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "cell leader") return false;
  if (row.submitterId === actor.id) return true;
  if (row.cellId && actor.cellId === row.cellId) return true;
  if (row.kind === "issue" && row.severity === "blocks") return true;
  return false;
}

export function canTriageFeedback(actor: Actor, row: FeedbackRow): Decision {
  if (actor.role === "admin") return allow;
  if (actor.role === "cell leader" && row.kind === "issue") {
    if (row.submitterId === actor.id) return allow;
    if (row.cellId && actor.cellId === row.cellId) return allow;
  }
  return deny("You cannot update this row.");
}

export function canApproveDesirable(actor: Actor): Decision {
  if (actor.role === "admin") return allow;
  return deny("Only an admin can approve desirables.");
}
