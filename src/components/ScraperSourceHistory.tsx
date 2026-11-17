"use client";

import { useState } from "react";
import { requestJson } from "@/lib/fetch-json";
import { StatusBanner } from "./StatusBanner";

export function ScraperSourceHistory({ rows, allowedHosts }: { rows: { id: string; summary: string }[]; allowedHosts: string[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const urls = [...new Set(rows.map((row) => row.summary.match(/https:\/\/\S+/)?.[0]?.replace(/[),.]+$/, "")).filter((url): url is string => Boolean(url)))];
  async function act(url: string, action: "add" | "request") {
    setBusy(url); setMessage(null);
    const result = await requestJson("/api/scraper/source-review", { method: "POST", body: { url, action } });
    setBusy(null);
    setMessage(result.ok ? (action === "add" ? "Added to recurring feeds." : "Allowlist review request recorded.") : result.error);
  }
  return <section className="card stack" data-testid="scraper-source-history">
    <h2>Pages used to add events</h2>
    <p className="muted">These pages were submitted through Add from a page. Public pages stay one-off unless an admin adds them here.</p>
    {message ? <StatusBanner message={message} kind={message.includes("recorded") || message.includes("Added") ? "info" : "error"} /> : null}
    {urls.length ? <ul>{urls.map((url) => {
      let host = ""; try { host = new URL(url).hostname; } catch { /* malformed historical audit */ }
      const canAdd = allowedHosts.includes(host);
      return <li key={url} className="row" style={{ justifyContent: "space-between" }}><a href={url} target="_blank" rel="noreferrer">{url}</a>
        {canAdd ? <button type="button" disabled={busy === url} onClick={() => void act(url, "add")}>Add to recurring feeds</button> : <button type="button" disabled={busy === url} onClick={() => void act(url, "request")}>Request allowlist review</button>}
      </li>;
    })}</ul> : <p className="muted">No page imports recorded yet.</p>}
  </section>;
}
