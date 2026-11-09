import { describe, expect, it } from "vitest";
import { bookableCellMembers, bookCellEmptyReason } from "@/lib/book-cell";

const leader = { id: "l", name: "Priya" };
const hannah = { id: "h", name: "Hannah Cole" };
const daniel = { id: "d", name: "Daniel Wright" };
const fatima = { id: "f", name: "Fatima Begum" };
const cell = [leader, hannah, daniel, fatima];

describe("bookableCellMembers", () => {
  it("drops the leader and anyone already going", () => {
    expect(bookableCellMembers({ members: cell, bookedIds: ["h"], actorId: "l" })).toEqual([
      daniel,
      fatima
    ]);
  });

  it("filters by name", () => {
    expect(
      bookableCellMembers({ members: cell, bookedIds: [], actorId: "l", query: "fat" }).map((m) => m.id)
    ).toEqual(["f"]);
  });
});

describe("bookCellEmptyReason", () => {
  it("explains a missing cell instead of pretending everyone is booked", () => {
    expect(
      bookCellEmptyReason({ hasCell: false, memberCount: 0, bookableCount: 0, full: false })
    ).toMatch(/not linked to a cell/i);
  });

  it("explains an empty cell, a full event, and all booked", () => {
    expect(
      bookCellEmptyReason({ hasCell: true, memberCount: 1, bookableCount: 0, full: false })
    ).toMatch(/no other people/i);
    expect(
      bookCellEmptyReason({ hasCell: true, memberCount: 4, bookableCount: 0, full: true })
    ).toMatch(/full/i);
    expect(
      bookCellEmptyReason({ hasCell: true, memberCount: 4, bookableCount: 0, full: false })
    ).toMatch(/already going/i);
  });

  it("is silent when someone can still be booked", () => {
    expect(
      bookCellEmptyReason({ hasCell: true, memberCount: 4, bookableCount: 3, full: false })
    ).toBeNull();
  });
});
