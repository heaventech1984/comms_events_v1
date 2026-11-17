"use client";

import { useState } from "react";
import { requestJson } from "@/lib/fetch-json";
import { EventForm } from "./EventForm";
import { StatusBanner } from "./StatusBanner";

type Draft = {
  title: string; organisationName: string; category: string; tags: string; startsAt: string; endsAt: string; duplicate?: boolean;
  online: boolean; placeName: string; lat: number | null; lng: number | null; externalUrl: string; notes: string; sourcePageUrl: string;
};

export function AddEventChoice(props: {
  organisations: { id: string; name: string }[];
  colours: Record<string, string>;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  backHref: string;
}) {
  const [mode, setMode] = useState<"choose" | "manual" | "page">("choose");
  const [url, setUrl] = useState("");
  const [pageMethod, setPageMethod] = useState<"url" | "paste">("url");
  const [pastedText, setPastedText] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [candidates, setCandidates] = useState<Draft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (mode === "manual" || draft) return <>
    {draft ? <><p className="muted">Check the imported details below, correct anything that needs it, then save.</p>{draft.duplicate ? <p className="notice">Possible duplicate: an event with this title and start time is already in Gather. Check before saving.</p> : null}</> : null}
    <EventForm {...props} initialDraft={draft ?? undefined} />
  </>;

  return (
    <section className="card stack" aria-label="Choose how to add an event">
      <h2>How would you like to add it?</h2>
      <div className="row">
        <button type="button" className={mode === "page" ? "secondary" : undefined} onClick={() => setMode("manual")}>Add manually</button>
        <button type="button" className={mode === "page" ? undefined : "secondary"} aria-pressed={mode === "page"} onClick={() => setMode("page")}>Add from a page</button>
      </div>
      {mode === "page" ? (
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault(); setLoading(true); setMessage(null); setCandidates([]);
          const body = pageMethod === "paste"
            ? { url, mode: "paste", text: pastedText, html: pastedHtml }
            : { url };
          const result = await requestJson<{ events?: Draft[] }>("/api/events/import-page", { method: "POST", body });
          setLoading(false);
          if (!result.ok) { setMessage(result.error); return; }
          const found = result.data.events ?? [];
          if (!found.length) { setMessage("No events were found. Check the page or pasted content, or add the event manually."); return; }
          if (found.length === 1) setDraft(found[0]);
          else setCandidates(found);
        }}>
          <StatusBanner message={message} kind={message ? "error" : "info"} />
          <div className="row" role="group" aria-label="Choose page import method">
            <button type="button" className={pageMethod === "url" ? undefined : "secondary"} aria-pressed={pageMethod === "url"} onClick={() => setPageMethod("url")}>Read page URL</button>
            <button type="button" className={pageMethod === "paste" ? undefined : "secondary"} aria-pressed={pageMethod === "paste"} onClick={() => { setPageMethod("paste"); setUrl(""); }}>Paste page content</button>
          </div>
          {pageMethod === "url" ? (
            <>
              <label>
                Event page URL
                <input type="url" required placeholder="https://example.org/events" value={url} onChange={(e) => setUrl(e.target.value)} />
              </label>
              <p className="muted">Public HTTPS pages are checked for event details. If a site blocks its event page, paste its direct public iCal (.ics) feed URL if available, or switch to Paste page content. Gather does not bypass robots.txt or browser challenges.</p>
            </>
          ) : (
            <>
              <p className="muted">Open the event in your browser, select and copy its details, then paste them below. Include the title, date, start and end time, and location. Gather will use copied page markup when available, but will not reopen or fetch the page.</p>
              <label>
                Copied event-page content
                <textarea
                  rows={8}
                  value={pastedText}
                  onPaste={(event) => {
                    event.preventDefault();
                    setPastedText(event.clipboardData.getData("text/plain"));
                    setPastedHtml(event.clipboardData.getData("text/html"));
                  }}
                  onChange={(event) => { setPastedText(event.target.value); setPastedHtml(""); }}
                  placeholder="Paste the event details copied from your browser…"
                />
              </label>
            </>
          )}
          <div className="row">
            <button type="submit" disabled={loading || (pageMethod === "paste" && !pastedText.trim() && !pastedHtml.trim())}>{loading ? (pageMethod === "paste" ? "Reading pasted details…" : "Reading page…") : (pageMethod === "paste" ? "Extract details" : "Read page")}</button>
            <button type="button" className="ghost" onClick={() => { setMode("choose"); setPageMethod("url"); }}>Back</button>
          </div>
          {candidates.length ? (
            <div className="stack">
              <h3>Choose an event to review</h3>
              {candidates.map((candidate, index) => (
                <button key={`${candidate.title}-${index}`} type="button" className="secondary" onClick={() => setDraft(candidate)}>
                  {candidate.title} · {new Date(candidate.startsAt).toLocaleDateString("en-GB")}{candidate.duplicate ? " · Possible duplicate already in Gather" : ""}
                </button>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
