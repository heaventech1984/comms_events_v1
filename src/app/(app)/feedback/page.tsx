import Link from "next/link";
import { isAdmin, requireUser } from "@/lib/auth";
import { canAccessFeedback } from "@/lib/feedback-hub/policy";
import { actorFrom, listFeedbackForUser } from "@/lib/feedback-hub/service";
import { FeedbackHub } from "@/components/feedback/FeedbackHub";
import { safeNextPath } from "@/lib/security";

export default async function FeedbackPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const gate = canAccessFeedback(actorFrom(user));
  if (!gate.ok) {
    return (
      <main className="stack">
        <h1>Feedback</h1>
        <p>Feedback is for admins and cell leaders. Members may get access in a later release.</p>
        <p>
          <Link href="/">Back to home</Link>
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const fromPath = params.from ? safeNextPath(params.from) : undefined;
  const rows = await listFeedbackForUser(user);
  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString()
  }));
  const issues = serialized.filter((r) => r.kind === "issue");
  const desirables = serialized.filter((r) => r.kind === "desirable");

  return (
    <main className="stack">
      <h1>Feedback</h1>
      <p className="lede">Report a problem or suggest an improvement. Approved ideas copy to the wish board in git.</p>
      <FeedbackHub
        isAdmin={isAdmin(user)}
        issues={issues}
        desirables={desirables}
        fromPath={fromPath !== "/" ? fromPath : undefined}
      />
    </main>
  );
}
