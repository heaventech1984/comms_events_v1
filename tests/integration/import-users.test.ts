import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { importUsers } from "@/lib/import-users";

const url = process.env.TEST_DATABASE_URL;
const prisma = url ? new PrismaClient({ datasourceUrl: url }) : null;

function csv(lines: string[]) {
  return Buffer.from(["Name,Cell number,Cell,Password,Permission", ...lines].join("\n"));
}

const actor = {
  id: "import-test-actor",
  name: "Importer",
  cellNumber: "07991000000",
  role: "admin" as const,
  cellId: null
};

describe.skipIf(!prisma)("import people", () => {
  const db = prisma!;

  beforeAll(async () => {
    await db.user.create({
      data: {
        id: actor.id,
        name: actor.name,
        cellNumber: actor.cellNumber,
        passwordHash: await hashPassword("ActorPass1"),
        role: "admin"
      }
    });
  });

  afterAll(async () => {
    const users = await db.user.findMany({
      where: { cellNumber: { startsWith: "07991000" } },
      select: { id: true }
    });
    const ids = users.map((user) => user.id);
    await db.booking.deleteMany({ where: { userId: { in: ids } } });
    await db.event.deleteMany({ where: { title: "Import history event" } });
    await db.auditLog.deleteMany({ where: { actorId: actor.id } });
    await db.user.deleteMany({ where: { id: { in: [...ids, actor.id] } } });
    await db.cell.deleteMany({ where: { name: { in: ["Import Spark", "Import Digbeth", "Import Held"] } } });
    await db.$disconnect();
  });

  it("updates cell, number, and permission and keeps the booking", async () => {
    const hash = await hashPassword("SecretPass1");
    const cell = await db.cell.create({ data: { name: "Import Spark" } });
    const user = await db.user.create({
      data: { name: "Ada Lovelace", cellNumber: "07991000001", passwordHash: hash, role: "member", cellId: cell.id }
    });
    const event = await db.event.create({
      data: {
        title: "Import history event",
        organisationName: "Test",
        category: "Meetup",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        status: "PUBLISHED"
      }
    });
    await db.booking.create({ data: { eventId: event.id, userId: user.id, bookedById: user.id } });

    const result = await importUsers({
      actor,
      filename: "import-people.csv",
      buffer: csv(["ada lovelace,07991000002,Import Digbeth,SecretPass1,cell leader"])
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.edited[0]?.from.cell).toBe("Import Spark");
    expect(result.edited[0]?.to).toEqual({
      cell: "Import Digbeth",
      cellNumber: "07991000002",
      permission: "cell leader"
    });
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.name).toBe("Ada Lovelace");
    expect(saved.cellNumber).toBe("07991000002");
    expect(saved.role).toBe("cell leader");
    expect(saved.passwordHash).toBe(hash);
    expect(await db.booking.count({ where: { userId: user.id, eventId: event.id } })).toBe(1);
  });

  it("creates a person when the password is different", async () => {
    const before = await db.user.count({ where: { name: "Grace Hopper" } });
    const result = await importUsers({
      actor,
      filename: "import-people.csv",
      buffer: csv(["Grace Hopper,07991000003,Import Spark,OtherPass1,member"])
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(1);
    expect(result.added[0]?.name).toBe("Grace Hopper");
    expect(await db.user.count({ where: { name: "Grace Hopper" } })).toBe(before + 1);
  });

  it("refuses the file when the name and password match two people", async () => {
    const hash = await hashPassword("SharedPass1");
    await db.user.create({
      data: { name: "Same Name", cellNumber: "07991000011", passwordHash: hash, role: "member" }
    });
    await db.user.create({
      data: { name: "Same Name", cellNumber: "07991000012", passwordHash: hash, role: "member" }
    });
    const result = await importUsers({
      actor,
      filename: "import-people.csv",
      buffer: csv(["Same Name,07991000013,Import Digbeth,SharedPass1,member"])
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => /more than one person/i.test(error.reason))).toBe(true);
    const numbers = await db.user.findMany({
      where: { name: "Same Name", cellNumber: { startsWith: "079910000" } },
      select: { cellNumber: true }
    });
    expect(numbers.map((row) => row.cellNumber).sort()).toEqual(["07991000011", "07991000012"]);
  });

  it("refuses a move onto a cell number that already uses that password", async () => {
    const hash = await hashPassword("TakenPass1");
    const ada = await db.user.create({
      data: { name: "Ada Held", cellNumber: "07991000021", passwordHash: hash, role: "member" }
    });
    await db.user.create({
      data: { name: "Other Held", cellNumber: "07991000022", passwordHash: hash, role: "member" }
    });
    const result = await importUsers({
      actor,
      filename: "import-people.csv",
      buffer: csv(["Ada Held,07991000022,Import Held,TakenPass1,member"])
    });
    expect(result.ok).toBe(false);
    const saved = await db.user.findUniqueOrThrow({ where: { id: ada.id } });
    expect(saved.cellNumber).toBe("07991000021");
  });
});
