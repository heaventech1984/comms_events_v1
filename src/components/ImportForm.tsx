"use client";

import { FormEvent, useState } from "react";
import { StatusBanner } from "@/components/StatusBanner";

type PersonLine = { name: string; cell: string; cellNumber: string; permission: string };
type PlaceLine = { cell: string; cellNumber: string; permission: string };
type EditLine = { name: string; from: PlaceLine; to: PlaceLine };

export function ImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"info" | "error">("info");
  const [errors, setErrors] = useState<{ row: number; reason: string }[]>([]);
  const [added, setAdded] = useState<PersonLine[]>([]);
  const [edited, setEdited] = useState<EditLine[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (file instanceof File && file.size > 2 * 1024 * 1024) {
      setKind("error");
      setMessage("That file is too large. The limit is 2 MB.");
      setErrors([]);
      return;
    }
    setBusy(true);
    setMessage(null);
    setErrors([]);
    setAdded([]);
    setEdited([]);
    let json: {
      ok?: boolean;
      created?: number;
      updated?: number;
      added?: PersonLine[];
      edited?: EditLine[];
      error?: string;
      errors?: { row: number; reason: string }[];
    };
    try {
      const response = await fetch("/api/import", { method: "POST", body: data });
      json = await response.json().catch(() => ({ ok: false, error: "Import failed." }));
      if (!response.ok && !json.errors && !json.error) {
        json = { ok: false, error: `Import failed (HTTP ${response.status}).` };
      }
    } catch {
      setBusy(false);
      setKind("error");
      setMessage("Could not reach Gather. Check your connection and try again.");
      return;
    }
    setBusy(false);
    if (!json.ok) {
      setKind("error");
      setMessage("Nothing was changed. Fix the rows below and try again.");
      setErrors(json.errors ?? [{ row: 0, reason: json.error ?? "Import failed." }]);
      return;
    }
    setKind("info");
    const created = json.created ?? 0;
    const updated = json.updated ?? 0;
    setAdded(json.added ?? []);
    setEdited(json.edited ?? []);
    setMessage(
      created === 0 && updated === 0
        ? "No changes. Those people already match the file."
        : `Added ${created} people. Updated ${updated} people.`
    );
    setErrors([]);
    form.reset();
  }

  return (
    <main>
      <div className="page-head">
        <h1>Import people</h1>
        <p className="lede">
          CSV, Excel, or JSON. If the name and password match someone already here, their cell, cell number, and
          permission are updated and their bookings stay. If any row fails, nobody is created or changed. Cell numbers
          may be shared; passwords must be unique for people who share a cell number. Use this column order:
        </p>
      </div>
      <div className="table-wrap" style={{ marginBottom: "var(--space-5)" }}>
        <table className="data stack-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Cell number</th>
              <th>Cell</th>
              <th>Password</th>
              <th>Permission</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Name">Example Person</td>
              <td data-label="Cell number">07000000999</td>
              <td data-label="Cell">Sparkbrook</td>
              <td data-label="Password">ChangeMe1!</td>
              <td data-label="Permission">member</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        <a href="/api/import/template">Download CSV template</a>
        . Permission is admin, cell leader, or member. Spaces in cell numbers are removed automatically (T3 C1 → T3C1).
      </p>
      <form className="card stack" onSubmit={onSubmit}>
        <StatusBanner message={message} kind={kind} />
        <label>
          File
          <input type="file" name="file" accept=".csv,.xlsx,.xls,.json" required disabled={busy} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </button>
      </form>
      {errors.length ? (
        <div className="table-wrap" style={{ marginTop: "var(--space-5)" }}>
          <table className="data stack-sm">
            <thead>
              <tr>
                <th>Row</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err, i) => (
                <tr key={i}>
                  <td className="num" data-label="Row">
                    {err.row}
                  </td>
                  <td data-label="Reason">{err.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {added.length ? (
        <details className="card" style={{ marginTop: "var(--space-4)" }}>
          <summary>Added {added.length}</summary>
          <div className="table-wrap">
            <table className="data stack-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cell number</th>
                  <th>Cell</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                {added.map((person) => (
                  <tr key={`${person.name}-${person.cellNumber}-${person.permission}`}>
                    <td data-label="Name">{person.name}</td>
                    <td data-label="Cell number">{person.cellNumber}</td>
                    <td data-label="Cell">{person.cell}</td>
                    <td data-label="Permission">{person.permission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
      {edited.length ? (
        <details className="card" style={{ marginTop: "var(--space-4)" }}>
          <summary>Edited {edited.length}</summary>
          <div className="table-wrap">
            <table className="data stack-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cell number</th>
                  <th>Cell</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                {edited.map((person) => (
                  <tr key={`${person.name}-${person.from.cellNumber}`}>
                    <td data-label="Name">{person.name}</td>
                    <td data-label="Cell number">
                      {person.from.cellNumber} → {person.to.cellNumber}
                    </td>
                    <td data-label="Cell">
                      {person.from.cell || "—"} → {person.to.cell}
                    </td>
                    <td data-label="Permission">
                      {person.from.permission} → {person.to.permission}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </main>
  );
}
