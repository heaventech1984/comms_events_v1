import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ImportForm } from "@/components/ImportForm";
import { prisma } from "@/lib/db";

type HistoryPerson = { name: string; cell: string; cellNumber: string; permission: string };
type HistoryEdit = { name: string; from: { cell: string; cellNumber: string; permission: string }; to: { cell: string; cellNumber: string; permission: string } };

function historyFromSummary(summary: string): { filename: string; added: HistoryPerson[]; edited: HistoryEdit[] } {
  try {
    const parsed = JSON.parse(summary) as { version?: number; filename?: string; created?: HistoryPerson[]; edited?: HistoryEdit[] };
    if (parsed.version === 1) return { filename: parsed.filename ?? "Import", added: parsed.created ?? [], edited: parsed.edited ?? [] };
  } catch {
    // Older audit rows contain a human-readable summary only.
  }
  return { filename: "Previous import", added: [], edited: [] };
}

export default async function ImportPage() {
  const user = await requireUser();
  if (user.role !== "admin") {
    return (
      <main className="stack">
        <div className="page-head">
          <h1>Import people</h1>
          <p className="lede">Only an admin can import people. Ask them if someone new needs an account.</p>
        </div>
        <p>
          <Link className="button" href="/calendar">Back to calendar</Link>
        </p>
      </main>
    );
  }
  const runs = await prisma.auditLog.findMany({
    where: { action: "users.import", entityType: "User" },
    include: { actor: { select: { name: true } } },
    orderBy: { at: "desc" }
  });
  const history = runs.map((run) => ({
    id: run.id,
    at: `${run.at.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    actor: run.actor?.name ?? "Former admin",
    ...historyFromSummary(run.summary)
  }));
  return <ImportForm history={history} />;
}
