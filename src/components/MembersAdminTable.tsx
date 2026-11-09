"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { requestJson } from "@/lib/fetch-json";
import {
  EMPTY_MEMBER_FILTERS,
  MEMBER_SORT_KEYS,
  filterMembers,
  filtersAreActive,
  sortMembers,
  uniqueCellNames,
  type MemberListFilters,
  type MemberListRow,
  type MemberSortKey,
  type SortDir
} from "@/lib/members-list";
import { StatusBanner } from "./StatusBanner";

export type MemberRow = MemberListRow;

export function MembersAdminTable({
  members,
  selfId,
  canManage
}: {
  members: MemberRow[];
  selfId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"info" | "error">("info");
  const [filters, setFilters] = useState<MemberListFilters>(EMPTY_MEMBER_FILTERS);
  const [sortKey, setSortKey] = useState<MemberSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const cells = useMemo(() => uniqueCellNames(members), [members]);
  const visible = useMemo(
    () => sortMembers(filterMembers(members, filters), sortKey, sortDir),
    [members, filters, sortKey, sortDir]
  );
  const visibleIds = useMemo(() => new Set(visible.map((m) => m.id)), [visible]);
  const selectableIds = useMemo(
    () => visible.filter((m) => m.id !== selfId).map((m) => m.id),
    [visible, selfId]
  );
  const selectedVisibleCount = useMemo(
    () => [...selected].filter((id) => visibleIds.has(id) && id !== selfId).length,
    [selected, visibleIds, selfId]
  );
  const allSelectableChecked =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const filtering = filtersAreActive(filters);

  function patchFilters(patch: Partial<MemberListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function toggleSort(key: MemberSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function toggleOne(id: string, on: boolean) {
    if (id === selfId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) {
        for (const id of selectableIds) next.add(id);
      } else {
        for (const id of selectableIds) next.delete(id);
      }
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selected].filter((id) => id !== selfId && visibleIds.has(id));
    if (ids.length === 0) {
      setKind("error");
      setMessage("Select at least one visible person to delete. You cannot delete your own account.");
      return;
    }
    const typed = window.prompt(
      `Type DELETE to permanently remove ${ids.length} people. Their Attend bookings and stars are removed.`
    );
    if (typed !== "DELETE") return;

    const names = members.filter((m) => ids.includes(m.id)).map((m) => m.name);
    const preview = names.slice(0, 8).join(", ") + (names.length > 8 ? ` and ${names.length - 8} more` : "");
    const ok = window.confirm(
      `Delete ${ids.length} people forever?\n\n${preview}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    setMessage(null);
    const result = await requestJson<{ deleted?: number; skippedSelf?: boolean }>(
      "/api/users/batch-delete",
      { method: "POST", body: { ids } }
    );
    setBusy(false);
    if (!result.ok) {
      setKind("error");
      setMessage(result.error);
      return;
    }
    setSelected(new Set());
    setKind("info");
    setMessage(
      `Deleted ${result.data.deleted ?? ids.length} people.` +
        (result.data.skippedSelf ? " Your own account was left alone." : "")
    );
    router.refresh();
  }

  return (
    <>
      {canManage ? (
        <div className="row members-actions">
          <Link className="button" href="/members/new">
            Add person
          </Link>
          <button
            type="button"
            className="danger"
            disabled={busy || selectedVisibleCount === 0}
            data-testid="members-delete-selected"
            onClick={() => void deleteSelected()}
          >
            {busy ? "Deleting…" : `Delete selected${selectedVisibleCount ? ` (${selectedVisibleCount})` : ""}`}
          </button>
        </div>
      ) : null}
      <StatusBanner message={message} kind={kind} />

      <div className="members-toolbar card" data-testid="members-toolbar">
        <label className="members-toolbar-search">
          Search
          <input
            type="search"
            value={filters.q}
            onChange={(e) => patchFilters({ q: e.target.value })}
            placeholder="Name, cell number, cell, permission…"
            data-testid="members-search"
            autoComplete="off"
          />
        </label>
        <div className="members-toolbar-row">
          <label>
            Permission
            <select
              value={filters.role}
              onChange={(e) => patchFilters({ role: e.target.value as MemberListFilters["role"] })}
              data-testid="members-filter-role"
            >
              <option value="">All</option>
              <option value="member">member</option>
              <option value="cell leader">cell leader</option>
              <option value="admin">admin</option>
            </select>
          </label>
          {cells.length > 1 ? (
            <label>
              Cell
              <select
                value={filters.cellName}
                onChange={(e) => patchFilters({ cellName: e.target.value })}
                data-testid="members-filter-cell"
              >
                <option value="">All cells</option>
                {cells.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Status
            <select
              value={filters.active}
              onChange={(e) => patchFilters({ active: e.target.value as MemberListFilters["active"] })}
              data-testid="members-filter-active"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            Sort by
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as MemberSortKey)}
              data-testid="members-sort"
            >
              {MEMBER_SORT_KEYS.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
          </label>
          <div className="members-dir" role="group" aria-label="Sort order">
            <span className="members-dir-label">Order</span>
            <div className="filters members-dir-chips">
              <button
                type="button"
                className="chip"
                aria-pressed={sortDir === "asc"}
                data-testid="members-dir-asc"
                onClick={() => setSortDir("asc")}
              >
                A→Z
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={sortDir === "desc"}
                data-testid="members-dir-desc"
                onClick={() => setSortDir("desc")}
              >
                Z→A
              </button>
            </div>
          </div>
        </div>
        <p className="members-count" data-testid="members-count">
          Showing {visible.length} of {members.length}
          {filtering ? (
            <>
              {" · "}
              <button type="button" className="linkish" onClick={() => setFilters(EMPTY_MEMBER_FILTERS)}>
                Clear filters
              </button>
            </>
          ) : null}
        </p>
      </div>

      <div className="table-wrap">
        <table className="data stack-sm" data-testid="members-table">
          <thead>
            <tr>
              {canManage ? (
                <th className="members-check-col">
                  <input
                    type="checkbox"
                    aria-label="Select all visible people"
                    checked={allSelectableChecked}
                    disabled={busy || selectableIds.length === 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
              ) : null}
              {MEMBER_SORT_KEYS.map((col) => (
                <th key={col.key} aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    className="members-sort-head"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key ? <span aria-hidden="true">{sortDir === "asc" ? " ↑" : " ↓"}</span> : null}
                  </button>
                </th>
              ))}
              {canManage ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 5}>No people match these filters.</td>
              </tr>
            ) : (
              visible.map((m) => {
                const isSelf = m.id === selfId;
                return (
                  <tr key={m.id}>
                    {canManage ? (
                      <td data-label="Select" className="members-check-col">
                        <input
                          type="checkbox"
                          aria-label={`Select ${m.name}`}
                          checked={selected.has(m.id)}
                          disabled={busy || isSelf}
                          title={isSelf ? "You cannot delete your own account" : undefined}
                          onChange={(e) => toggleOne(m.id, e.target.checked)}
                        />
                      </td>
                    ) : null}
                    <td data-label="Name">
                      {canManage ? <Link href={`/members/${m.id}/edit`}>{m.name}</Link> : m.name}
                      {isSelf ? <span className="muted"> (you)</span> : null}
                    </td>
                    <td data-label="Cell number">{m.cellNumber}</td>
                    <td data-label="Cell">{m.cellName}</td>
                    <td data-label="Permission">{m.role}</td>
                    <td data-label="Status">{m.active ? "Active" : "Inactive"}</td>
                    {canManage ? (
                      <td data-label="Actions">
                        <Link href={`/members/${m.id}/edit`}>Edit</Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
