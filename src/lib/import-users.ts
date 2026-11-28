import ExcelJS from "exceljs";
import Papa from "papaparse";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { normaliseCellNumber, isValidCellNumber } from "./cell-number";
import { parseRole, type Role } from "./constants";
import { writeAudit } from "./audit";
import { LIMITS } from "./security";
import type { SessionUser } from "./session";

export const IMPORT_TEMPLATE_CSV =
  "Name,Cell number,Cell,Password,Permission\r\nExample Person,07000000999,Sparkbrook,ChangeMe1!,member\r\n";

export type ImportPersonLine = {
  name: string;
  cell: string;
  cellNumber: string;
  permission: string;
};

export type ImportEditLine = {
  name: string;
  from: { cell: string; cellNumber: string; permission: string };
  to: { cell: string; cellNumber: string; permission: string };
};

type Row = {
  name: string;
  cellNumber: string;
  cell: string;
  password: string;
  permission: string;
  region?: string;
  department?: string;
  team?: string;
};

type CellMeta = { name: string; region?: string; department?: string; team?: string };

function flattenNestedJson(input: unknown): { rows: Record<string, unknown>[]; cells: CellMeta[] } {
  if (Array.isArray(input)) return { rows: input as Record<string, unknown>[], cells: [] };
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.users) || Array.isArray(obj.rows)) {
      const rows = (obj.users ?? obj.rows) as Record<string, unknown>[];
      const cells = Array.isArray(obj.cells) ? (obj.cells as CellMeta[]) : [];
      if (obj.regions && typeof obj.regions === "object") {
        walkTree(obj.regions, [], cells);
      }
      return { rows, cells };
    }
    const cells: CellMeta[] = [];
    walkTree(obj, [], cells);
    return { rows: [], cells };
  }
  return { rows: [], cells: [] };
}

function walkTree(node: unknown, path: string[], cells: CellMeta[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkTree(item, path, cells);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.name === "string" && path.length >= 3) {
    cells.push({
      region: path[0],
      department: path[1],
      team: path[2],
      name: obj.name
    });
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === "users" || key === "rows" || key === "cells") continue;
    walkTree(value, [...path, key], cells);
  }
}

/** Excel/Google Sheets cells may be plain strings or rich-text / hyperlink objects. */
export function excelCellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.text === "string") return v.text.trim();
    if (v.result !== undefined) return excelCellText(v.result);
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((part) => part.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  const map = new Map(Object.keys(row).map((k) => [k.toLowerCase().replace(/[^a-z]/g, ""), k]));
  for (const key of keys) {
    const found = map.get(key.toLowerCase().replace(/[^a-z]/g, ""));
    if (found && row[found] != null) return excelCellText(row[found]);
  }
  return "";
}

function toRow(raw: Record<string, unknown>): Row {
  return {
    name: pick(raw, ["name"]),
    cellNumber: pick(raw, ["cellnumber", "cell number"]),
    cell: pick(raw, ["cell"]),
    password: pick(raw, ["password"]),
    permission: pick(raw, ["permission", "duty", "role"]),
    region: pick(raw, ["region"]) || undefined,
    department: pick(raw, ["department"]) || undefined,
    team: pick(raw, ["team"]) || undefined
  };
}

export async function parseImportFile(filename: string, buffer: Buffer): Promise<{
  rows: Row[];
  cells: CellMeta[];
}> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, string>>(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true
    });
    return { rows: parsed.data.map((r) => toRow(r)), cells: [] };
  }
  if (lower.endsWith(".json")) {
    const json = JSON.parse(buffer.toString("utf8"));
    const { rows, cells } = flattenNestedJson(json);
    return { rows: rows.map((r) => toRow(r)), cells };
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], cells: [] };
  const header: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    header[col] = excelCellText(cell.value);
  });
  const rows: Row[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const raw: Record<string, unknown> = {};
    row.eachCell((cell, col) => {
      raw[header[col] || `col${col}`] = cell.value;
    });
    rows.push(toRow(raw));
  });
  return { rows, cells: [] };
}

export async function importUsers(opts: {
  actor: SessionUser;
  filename: string;
  buffer: Buffer;
}) {
  let rows: Row[];
  let cells: CellMeta[];
  try {
    ({ rows, cells } = await parseImportFile(opts.filename, opts.buffer));
  } catch (error) {
    console.error("import parse failed", error);
    return {
      ok: false as const,
      created: 0,
      errors: [
        {
          row: 0,
          reason: "Could not read that file. Save as .xlsx or .csv with the template column headers and try again."
        }
      ]
    };
  }

  const errors: { row: number; reason: string }[] = [];
  if (rows.length === 0) {
    return {
      ok: false as const,
      created: 0,
      errors: [{ row: 0, reason: "No data rows found. Check the header row and that people are listed underneath." }]
    };
  }
  if (rows.length > LIMITS.importRows) {
    return {
      ok: false as const,
      created: 0,
      errors: [{ row: 0, reason: `The file has ${rows.length} rows. The limit is ${LIMITS.importRows} per import.` }]
    };
  }

  const seenPasswordsByCell = new Map<string, Set<string>>();
  const prepared: Array<Row & { role: Role; cellNumber: string; rowNumber: number }> = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const cellNumber = normaliseCellNumber(row.cellNumber);
    if (!row.name) errors.push({ row: rowNumber, reason: "Name is missing." });
    if (!isValidCellNumber(cellNumber)) {
      errors.push({
        row: rowNumber,
        reason: "Cell number must be letters and digits only (spaces are removed automatically)."
      });
    }
    if (!row.cell) errors.push({ row: rowNumber, reason: "Cell is missing." });
    if (!row.password) {
      errors.push({ row: rowNumber, reason: "Password is required." });
    } else if (cellNumber) {
      const seen = seenPasswordsByCell.get(cellNumber) ?? new Set<string>();
      if (seen.has(row.password)) {
        errors.push({
          row: rowNumber,
          reason: "Password is repeated for this cell number in the file. Each person on the same cell number needs a unique password."
        });
      } else {
        seen.add(row.password);
        seenPasswordsByCell.set(cellNumber, seen);
      }
    }
    const role = parseRole(row.permission);
    if (!role) errors.push({ row: rowNumber, reason: "Permission must be admin, cell leader, or member." });
    if (role && cellNumber) prepared.push({ ...row, role, cellNumber, rowNumber });
  });

  const people = prepared.length
    ? await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          cellNumber: true,
          passwordHash: true,
          role: true,
          cell: { select: { name: true } }
        }
      })
    : [];

  type Planned =
    | { kind: "create"; row: (typeof prepared)[number] }
    | {
        kind: "update";
        row: (typeof prepared)[number];
        person: (typeof people)[number];
      };
  const planned: Planned[] = [];
  const claimed = new Set<string>();

  for (const row of prepared) {
    const named = people.filter((person) => person.name.trim().toLowerCase() === row.name.trim().toLowerCase());
    const matches = [];
    for (const person of named) {
      if (await verifyPassword(row.password, person.passwordHash)) matches.push(person);
    }
    if (matches.length > 1) {
      errors.push({ row: row.rowNumber, reason: "This name and password match more than one person." });
      continue;
    }
    if (matches.length === 1) {
      const person = matches[0];
      if (claimed.has(person.id)) {
        errors.push({ row: row.rowNumber, reason: "This person is listed more than once in the file." });
        continue;
      }
      claimed.add(person.id);
      planned.push({ kind: "update", row, person });
      continue;
    }
    planned.push({ kind: "create", row });
  }

  for (const item of planned) {
    for (const person of people) {
      if (item.kind === "update" && person.id === item.person.id) continue;
      const move = planned.find((entry) => entry.kind === "update" && entry.person.id === person.id);
      const occupiedNumber = move && move.kind === "update" ? move.row.cellNumber : person.cellNumber;
      if (occupiedNumber !== item.row.cellNumber) continue;
      if (await verifyPassword(item.row.password, person.passwordHash)) {
        errors.push({
          row: item.row.rowNumber,
          reason:
            "Password is already used by someone with this cell number. Each person on the same cell number needs a unique password."
        });
        break;
      }
    }
  }

  if (errors.length) {
    return { ok: false as const, created: 0, updated: 0, added: [], edited: [], errors };
  }

  const hashed = new Map<string, string>();
  for (const item of planned) {
    if (item.kind === "create") hashed.set(String(item.row.rowNumber), await hashPassword(item.row.password));
  }

  const added: ImportPersonLine[] = [];
  const edited: ImportEditLine[] = [];
  await prisma.$transaction(async (tx) => {
    const cellByName = new Map<string, string>();
    const existingCells = await tx.cell.findMany();
    existingCells.forEach((c) => cellByName.set(c.name.toLowerCase(), c.id));
    for (const meta of cells) {
      const key = meta.name.toLowerCase();
      if (!cellByName.has(key)) {
        const cell = await tx.cell.create({
          data: {
            name: meta.name,
            region: meta.region ?? null,
            department: meta.department ?? null,
            team: meta.team ?? null
          }
        });
        cellByName.set(key, cell.id);
      }
    }
    for (const item of planned) {
      const row = item.row;
      const key = row.cell.toLowerCase();
      let cellId = cellByName.get(key);
      if (!cellId) {
        const cell = await tx.cell.create({
          data: {
            name: row.cell,
            region: row.region ?? null,
            department: row.department ?? null,
            team: row.team ?? null
          }
        });
        cellId = cell.id;
        cellByName.set(key, cellId);
      }
      const needsCell = row.role !== "admin";
      const nextCellId = needsCell ? cellId : row.cell ? cellId : null;
      if (item.kind === "update") {
        const from = {
          cell: item.person.cell?.name ?? "",
          cellNumber: item.person.cellNumber,
          permission: item.person.role
        };
        const to = { cell: row.cell, cellNumber: row.cellNumber, permission: row.role };
        const same =
          from.cell.trim().toLowerCase() === to.cell.trim().toLowerCase() &&
          from.cellNumber === to.cellNumber &&
          from.permission === to.permission;
        if (same) continue;
        await tx.user.update({
          where: { id: item.person.id },
          data: { cellNumber: row.cellNumber, role: row.role, cellId: nextCellId }
        });
        edited.push({ name: item.person.name, from, to });
        continue;
      }
      const passwordHash = hashed.get(String(row.rowNumber));
      if (!passwordHash) throw new Error("Missing password hash for a new person.");
      await tx.user.create({
        data: {
          name: row.name,
          cellNumber: row.cellNumber,
          passwordHash,
          role: row.role,
          cellId: nextCellId,
          active: true
        }
      });
      added.push({ name: row.name, cell: row.cell, cellNumber: row.cellNumber, permission: row.role });
    }
  });

  try {
    const history = JSON.stringify({
      version: 1,
      filename: opts.filename,
      created: added,
      edited
    });
    await writeAudit({
      actorId: opts.actor.id,
      action: "users.import",
      entityType: "User",
      summary: history
    });
  } catch (error) {
    console.error("users.import audit failed", error);
  }
  return { ok: true as const, created: added.length, updated: edited.length, added, edited, errors: [] };
}
