import { prisma } from "../src/lib/db";
import { decodeTags, encodeTags, shelfForStoredCategory } from "../src/lib/tags";

/** One pass: old shelves become the four categories, and stickers are filled in. */
async function main() {
  const rows = await prisma.event.findMany({
    select: { id: true, category: true, tags: true, externalUrl: true, online: true }
  });
  let updated = 0;
  for (const row of rows) {
    const shelf = shelfForStoredCategory(row.category, row.externalUrl, row.online);
    const tags = encodeTags([...decodeTags(row.tags), ...shelf.tags]);
    if (row.category === shelf.category && row.tags === tags) continue;
    await prisma.event.update({
      where: { id: row.id },
      data: { category: shelf.category, tags }
    });
    updated += 1;
  }
  console.log(`Events retagged ${updated} of ${rows.length}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Could not retag events.";
  console.error(message);
  process.exit(1);
});