import { describe, expect, it } from "vitest";
import {
  EMPTY_MEMBER_FILTERS,
  filterMembers,
  filtersAreActive,
  sortMembers,
  uniqueCellNames,
  type MemberListRow
} from "@/lib/members-list";

const rows: MemberListRow[] = [
  { id: "1", name: "Amara Adeyemi", cellNumber: "07000000001", cellName: "—", role: "admin", active: true },
  { id: "2", name: "Priya Nair", cellNumber: "07000000002", cellName: "Sparkbrook", role: "cell leader", active: true },
  { id: "3", name: "Hannah Cole", cellNumber: "07000000004", cellName: "Sparkbrook", role: "member", active: true },
  { id: "4", name: "Owen Reid", cellNumber: "07000000007", cellName: "Erdington", role: "member", active: false }
];

describe("filterMembers", () => {
  it("returns everyone when filters are empty", () => {
    expect(filterMembers(rows, EMPTY_MEMBER_FILTERS)).toHaveLength(4);
  });

  it("searches name, cell number, cell, and permission", () => {
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, q: "hannah" }).map((r) => r.id)).toEqual(["3"]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, q: "07000000002" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, q: "erdington" }).map((r) => r.id)).toEqual(["4"]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, q: "admin" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, q: "inactive" }).map((r) => r.id)).toEqual(["4"]);
  });

  it("filters each column", () => {
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, role: "member" }).map((r) => r.id)).toEqual(["3", "4"]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, cellName: "Sparkbrook" }).map((r) => r.id)).toEqual([
      "2",
      "3"
    ]);
    expect(filterMembers(rows, { ...EMPTY_MEMBER_FILTERS, active: "inactive" }).map((r) => r.id)).toEqual(["4"]);
  });

  it("combines search and column filters", () => {
    expect(
      filterMembers(rows, { q: "spark", role: "member", cellName: "Sparkbrook", active: "active" }).map((r) => r.id)
    ).toEqual(["3"]);
  });
});

describe("sortMembers", () => {
  it("sorts names A→Z and Z→A", () => {
    expect(sortMembers(rows, "name", "asc").map((r) => r.name)[0]).toBe("Amara Adeyemi");
    expect(sortMembers(rows, "name", "desc").map((r) => r.name)[0]).toBe("Priya Nair");
  });

  it("sorts cell numbers with numeric order", () => {
    expect(sortMembers(rows, "cellNumber", "asc").map((r) => r.cellNumber)).toEqual([
      "07000000001",
      "07000000002",
      "07000000004",
      "07000000007"
    ]);
  });

  it("sorts inactive first when Status is A→Z", () => {
    expect(sortMembers(rows, "active", "asc")[0].active).toBe(false);
    expect(sortMembers(rows, "active", "desc")[0].active).toBe(true);
  });
});

describe("uniqueCellNames", () => {
  it("lists cells once, A→Z", () => {
    expect(uniqueCellNames(rows)).toEqual(["—", "Erdington", "Sparkbrook"]);
  });
});

describe("filtersAreActive", () => {
  it("is false for the empty set and true once anything is set", () => {
    expect(filtersAreActive(EMPTY_MEMBER_FILTERS)).toBe(false);
    expect(filtersAreActive({ ...EMPTY_MEMBER_FILTERS, q: " " })).toBe(false);
    expect(filtersAreActive({ ...EMPTY_MEMBER_FILTERS, q: "a" })).toBe(true);
  });
});
