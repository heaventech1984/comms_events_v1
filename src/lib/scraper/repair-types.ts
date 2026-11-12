import { prisma } from "../db";
import { TYPE_REVIEW_NOTE, TYPE_WEAK_NOTE } from "./categorise";
import { settleScrapedType } from "./type-review";

/**
 * Rows already saved from a search page can still say Christian when the title does not.
 * Opening Pending rewrites those labels. A type the title does support is left flagged.
 */
export async function repairUnsupportedTypeStamps(): Promise<number> {
  const rows = await prisma.event.findMany({
    where: {
      OR: [{ notes: { contains: TYPE_WEAK_NOTE } }, { notes: { contains: TYPE_REVIEW_NOTE } }]
    },
    select: { id: true, title: true, organisationName: true, category: true, notes: true }
  });
  const updates = [];
  for (const row of rows) {
    const settled = settleScrapedType(row);
    if (!settled.changed) continue;
    updates.push(
      prisma.event.update({
        where: { id: row.id },
        data: { category: settled.category, notes: settled.notes }
      })
    );
  }
  if (updates.length) await prisma.$transaction(updates);
  return updates.length;
}
