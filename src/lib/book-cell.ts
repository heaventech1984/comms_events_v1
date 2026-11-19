export type CellMemberOption = { id: string; name: string; cellNumber?: string; cellName?: string };

/**
 * People an admin or cell leader can still book onto this event, not themselves
 * (Attend covers that), not already going. Optional filter supports long lists.
 */
export function bookableCellMembers(opts: {
  members: CellMemberOption[];
  bookedIds: Iterable<string>;
  actorId: string;
  query?: string;
}): CellMemberOption[] {
  const taken = new Set(opts.bookedIds);
  const q = (opts.query ?? "").trim().toLowerCase();
  return opts.members.filter((member) => {
    if (member.id === opts.actorId) return false;
    if (taken.has(member.id)) return false;
    const searchable = [member.name, member.cellNumber, member.cellName].filter(Boolean).join(" ").toLowerCase();
    if (q && !searchable.includes(q)) return false;
    return true;
  });
}

/** Honest copy when the Book panel cannot offer a person. Null means show the list. */
export function bookCellEmptyReason(opts: {
  hasCell: boolean;
  memberCount: number;
  bookableCount: number;
  full: boolean;
  scope?: "cell" | "all";
}): string | null {
  const scope = opts.scope ?? "cell";
  if (scope === "cell" && !opts.hasCell) {
    return "Your account is not linked to a cell, so you cannot book members. Ask an admin to set your cell.";
  }
  if (opts.full) return "This event is full.";
  if (opts.memberCount <= 1) {
    return scope === "all" ? "No other active members are available to book." : "No other people in your cell to book. Ask an admin to add them on Members.";
  }
  if (opts.bookableCount === 0) return scope === "all" ? "Everyone is already going." : "Everyone in your cell is already going.";
  return null;
}
