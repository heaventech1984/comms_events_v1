import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageMembers } from "@/lib/policy";
import { MembersAdminTable } from "@/components/MembersAdminTable";

export default async function MembersPage() {
  const user = await requireUser(["admin", "cell leader"]);
  const members = await prisma.user.findMany({
    where: user.role === "admin" ? {} : { cellId: user.cellId ?? "__none__" },
    include: { cell: true },
    orderBy: { name: "asc" }
  });
  const canManage = canManageMembers(user);

  return (
    <main>
      <div className="page-head">
        <h1>Members</h1>
        <p className="lede">
          {canManage
            ? "Everyone in Gather. Search, filter, and sort, then Edit or Delete selected before a fresh Import."
            : "People in your cell. Search, filter, and sort the list. An admin adds or edits accounts."}
        </p>
      </div>
      <MembersAdminTable
        canManage={canManage}
        selfId={user.id}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          cellNumber: m.cellNumber,
          cellName: m.cell?.name ?? "—",
          role: m.role,
          active: m.active
        }))}
      />
    </main>
  );
}
