import { prisma } from "@/lib/db";

const PAD = 3;

export async function nextCounterId(key: string, prefix: string): Promise<string> {
  const row = await prisma.appCounter.findUnique({ where: { key } });
  const next = (row?.value ?? 0) + 1;
  await prisma.appCounter.upsert({
    where: { key },
    create: { key, value: next },
    update: { value: next }
  });
  return `${prefix}-${String(next).padStart(PAD, "0")}`;
}
