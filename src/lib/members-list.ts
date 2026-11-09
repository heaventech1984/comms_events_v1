export type MemberSortKey = "name" | "cellNumber" | "cellName" | "role" | "active";
export type SortDir = "asc" | "desc";

export type MemberListRow = {
  id: string;
  name: string;
  cellNumber: string;
  cellName: string;
  role: string;
  active: boolean;
};

export type MemberListFilters = {
  q: string;
  role: "" | "member" | "cell leader" | "admin";
  cellName: string;
  active: "" | "active" | "inactive";
};

export const MEMBER_SORT_KEYS: { key: MemberSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "cellNumber", label: "Cell number" },
  { key: "cellName", label: "Cell" },
  { key: "role", label: "Permission" },
  { key: "active", label: "Status" }
];

export const EMPTY_MEMBER_FILTERS: MemberListFilters = {
  q: "",
  role: "",
  cellName: "",
  active: ""
};

function cmpText(a: string, b: string): number {
  return a.localeCompare(b, "en-GB", { numeric: true, sensitivity: "base" });
}

function haystack(row: MemberListRow): string {
  const status = row.active ? "active" : "inactive";
  return `${row.name} ${row.cellNumber} ${row.cellName} ${row.role} ${status}`.toLowerCase();
}

/** Keep rows that match the search box and every column filter. Empty filter = show all. */
export function filterMembers(rows: MemberListRow[], filters: MemberListFilters): MemberListRow[] {
  const q = filters.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.role && row.role !== filters.role) return false;
    if (filters.cellName && row.cellName !== filters.cellName) return false;
    if (filters.active === "active" && !row.active) return false;
    if (filters.active === "inactive" && row.active) return false;
    if (q && !haystack(row).includes(q)) return false;
    return true;
  });
}

export function sortMembers(
  rows: MemberListRow[],
  key: MemberSortKey,
  dir: SortDir
): MemberListRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let primary = 0;
    if (key === "active") {
      primary = Number(a.active) - Number(b.active);
    } else {
      primary = cmpText(String(a[key]), String(b[key]));
    }
    if (primary !== 0) return primary * mul;
    return cmpText(a.name, b.name) * mul;
  });
}

export function uniqueCellNames(rows: MemberListRow[]): string[] {
  return [...new Set(rows.map((row) => row.cellName))].sort(cmpText);
}

export function filtersAreActive(filters: MemberListFilters): boolean {
  return Boolean(filters.q.trim() || filters.role || filters.cellName || filters.active);
}
