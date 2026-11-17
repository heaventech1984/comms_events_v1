import { PrismaClient } from "@prisma/client";
import { TAGS, type Tag } from "../src/lib/constants";
import { decodeTags, encodeTags, inferTags, withCostDefault } from "../src/lib/tags";

const prisma = new PrismaClient();

type EventRow = {
  id: string;
  title: string;
  organisationName: string;
  tags: string;
  online: boolean;
  externalUrl: string | null;
  notes: string | null;
  status: string;
  updatedAt: Date;
};

function counts(rows: Array<{ tags: Tag[] }>): Record<Tag, number> {
  return Object.fromEntries(TAGS.map((tag) => [tag, rows.filter((row) => row.tags.includes(tag)).length])) as Record<
    Tag,
    number
  >;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const unknownArgs = process.argv.slice(2).filter((arg) => arg !== "--apply");
  if (unknownArgs.length) throw new Error(`Unknown argument: ${unknownArgs[0]}`);

  const rows = (await prisma.event.findMany({
    where: { status: { in: ["PENDING", "PUBLISHED"] } },
    select: {
      id: true,
      title: true,
      organisationName: true,
      tags: true,
      online: true,
      externalUrl: true,
      notes: true,
      status: true,
      updatedAt: true
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { id: "asc" }]
  })) as EventRow[];

  const changes = rows.flatMap((row) => {
    const before = decodeTags(row.tags);
    const inferred = inferTags({
      title: row.title,
      organisationName: row.organisationName,
      externalUrl: row.externalUrl,
      notes: row.notes,
      online: row.online
    });
    // A stored Fee is already an explicit Paid label; keep it unless a future human changes it.
    const after = before.includes("Fee") ? withCostDefault([...inferred, "Fee"], `${row.title}\n${row.notes ?? ""}`) : inferred;
    const encoded = encodeTags(after);
    return encoded === row.tags ? [] : [{ row, before, after, encoded }];
  });
  const changedIds = new Set(changes.map((change) => change.row.id));

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        includedStatuses: ["PENDING", "PUBLISHED"],
        excludedStatuses: ["DISCARDED"],
        scanned: rows.length,
        changed: changes.length,
        beforeCounts: counts(rows.map((row) => ({ tags: decodeTags(row.tags) }))),
        afterCounts: counts([
          ...rows.filter((row) => !changedIds.has(row.id)).map((row) => ({ tags: decodeTags(row.tags) })),
          ...changes.map((change) => ({ tags: change.after }))
        ]),
        changes: changes.slice(0, 40).map(({ row, before, after }) => ({
          id: row.id,
          status: row.status,
          title: row.title,
          before,
          after
        }))
      },
      null,
      2
    )
  );

  if (apply && changes.length) {
    let updated = 0;
    let skippedConcurrentEdit = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const change of changes) {
          const result = await tx.event.updateMany({
            where: { id: change.row.id, tags: change.row.tags, updatedAt: change.row.updatedAt },
            data: { tags: change.encoded }
          });
          if (result.count === 1) updated += 1;
          else skippedConcurrentEdit += 1;
        }
      },
      { maxWait: 10_000, timeout: 120_000 }
    );
    console.log(JSON.stringify({ applied: updated, skippedConcurrentEdit }));
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Could not retag events.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
