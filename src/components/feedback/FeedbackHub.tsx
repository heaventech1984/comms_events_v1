"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FEEDBACK_AREAS, ISSUE_SEVERITIES } from "@/lib/feedback-hub/areas";
import { desirableMarkdownRow } from "@/lib/feedback-hub/markdown";

type Row = {
  id: string;
  publicId: string;
  kind: string;
  status: string;
  severity: string | null;
  area: string;
  summary: string;
  body: string;
  pageUrl: string | null;
  imagePath: string | null;
  assignedDId: string | null;
  rejectReason: string | null;
  createdAt: string;
  submitter: { name: string };
};

export function FeedbackHub({
  isAdmin,
  issues,
  desirables,
  fromPath
}: {
  isAdmin: boolean;
  issues: Row[];
  desirables: Row[];
  fromPath?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitForm(kind: "issue" | "desirable", form: HTMLFormElement) {
    setBusy(true);
    setMessage(null);
    const data = new FormData(form);
    data.set("kind", kind);
    if (fromPath) data.set("pageUrl", fromPath);
    const res = await fetch("/api/gather-feedback", { method: "POST", body: data });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save.");
      return;
    }
    setMessage(`Saved ${json.publicId}.`);
    form.reset();
    router.refresh();
  }

  async function triage(id: string, status: string) {
    const res = await fetch(`/api/gather-feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) router.refresh();
  }

  async function approve(id: string) {
    const res = await fetch(`/api/gather-feedback/${id}/approve`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.markdown) {
      try {
        await navigator.clipboard.writeText(json.markdown);
        setMessage(`Approved ${json.assignedDId}. Row copied to clipboard — paste into desirables.md.`);
      } catch {
        setMessage(`Approved ${json.assignedDId}. Markdown: ${json.markdown}`);
      }
      router.refresh();
    } else {
      setMessage(json.error ?? "Could not approve.");
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Short reason (optional):") ?? "";
    const res = await fetch(`/api/gather-feedback/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    if (res.ok) router.refresh();
  }

  function copyMarkdown(row: Row) {
    const md = desirableMarkdownRow({
      assignedDId: row.assignedDId ?? "D-???",
      area: row.area,
      wish: row.summary,
      why: row.body,
      heardFrom: `Feedback / ${row.submitter.name}`,
      visual: row.imagePath ? "—" : "—"
    });
    navigator.clipboard.writeText(md).then(
      () => setMessage("Markdown row copied."),
      () => setMessage(md)
    );
  }

  return (
    <div className="stack feedback-hub">
      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : null}

      <section className="card stack" aria-labelledby="issues-heading">
        <h2 id="issues-heading">Issues</h2>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm("issue", e.currentTarget);
          }}
        >
          <p className="muted">Something broken or blocking work today.</p>
          <label>
            Severity
            <select name="severity" required defaultValue="annoying">
              {ISSUE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Area
            <select name="area" required defaultValue="Calendar">
              {FEEDBACK_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Summary
            <input name="summary" required maxLength={120} placeholder="One line" />
          </label>
          <label>
            What happened
            <textarea name="body" required maxLength={2000} rows={4} />
          </label>
          <label>
            Screenshot (optional, JPEG/PNG, max 500KB)
            <input name="image" type="file" accept="image/jpeg,image/png" />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            Report issue
          </button>
        </form>

        <div className="feedback-table-wrap">
          <h3 className="h3">Open issues</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Id</th>
                <th>Sev</th>
                <th>Area</th>
                <th>Summary</th>
                <th>By</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {issues.map((row) => (
                <tr key={row.id}>
                  <td>{row.publicId}</td>
                  <td>{row.severity}</td>
                  <td>{row.area}</td>
                  <td>
                    {row.summary}
                    {row.imagePath ? (
                      <>
                        {" "}
                        <a href={`/api/gather-feedback/${row.id}/image`} target="_blank" rel="noreferrer">
                          Image
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td>{row.submitter.name}</td>
                  <td>{row.status}</td>
                  <td>
                    <select
                      aria-label={`Triage ${row.publicId}`}
                      value={row.status}
                      onChange={(e) => void triage(row.id, e.target.value)}
                    >
                      <option value="open">open</option>
                      <option value="triaged">triaged</option>
                      <option value="fixed">fixed</option>
                      <option value="wontfix">wontfix</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length === 0 ? <p className="muted">No issues yet.</p> : null}
        </div>
      </section>

      <section className="card stack" aria-labelledby="desirables-heading">
        <h2 id="desirables-heading">Desirables</h2>
        <p className="muted">
          Broken today? Use <strong>Issues</strong> above — not this form.
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm("desirable", e.currentTarget);
          }}
        >
          <label>
            Area
            <select name="area" required defaultValue="Mobile">
              {FEEDBACK_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Wish (one sentence)
            <input name="summary" required maxLength={280} />
          </label>
          <label>
            Why it matters
            <textarea name="body" required maxLength={1000} rows={3} />
          </label>
          <label>
            Sketch (optional)
            <input name="image" type="file" accept="image/jpeg,image/png" />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            Suggest improvement
          </button>
        </form>

        <div className="feedback-table-wrap">
          <h3 className="h3">Ideas queue</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Id</th>
                <th>Area</th>
                <th>Wish</th>
                <th>Status</th>
                <th>D-id</th>
                {isAdmin ? <th>Admin</th> : null}
              </tr>
            </thead>
            <tbody>
              {desirables.map((row) => (
                <tr key={row.id}>
                  <td>{row.publicId}</td>
                  <td>{row.area}</td>
                  <td>
                    {row.summary}
                    {row.imagePath ? (
                      <>
                        {" "}
                        <a href={`/api/gather-feedback/${row.id}/image`} target="_blank" rel="noreferrer">
                          Sketch
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td>{row.status}</td>
                  <td>{row.assignedDId ?? "—"}</td>
                  {isAdmin ? (
                    <td className="cluster">
                      {row.status === "pending" ? (
                        <>
                          <button type="button" className="btn small" onClick={() => void approve(row.id)}>
                            Approve
                          </button>
                          <button type="button" className="btn small subtle" onClick={() => void reject(row.id)}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      {row.status === "approved" || row.assignedDId ? (
                        <button type="button" className="btn small subtle" onClick={() => copyMarkdown(row)}>
                          Copy row
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {desirables.length === 0 ? <p className="muted">No ideas in the queue.</p> : null}
        </div>
      </section>
    </div>
  );
}
