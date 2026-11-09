"use client";

import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/fetch-json";
import { EventFeedbackBox } from "./EventFeedbackBox";
import { StatusBanner } from "./StatusBanner";

type Item = { id: string; eventId: string; title: string; when: string };

const SNOOZE_KEY = "gather-attendance-snooze";

export function AttendancePrompt() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<Item | null>(null);
  const first = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      // Private mode can refuse sessionStorage; the overlay will still close for this page.
    }
    setOpen(false);
    lastFocus.current?.focus();
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SNOOZE_KEY)) return;
    } catch {
      // Continue and fetch; better to ask once than to hide attendance.
    }
    fetch("/api/attendance/pending")
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length) {
          lastFocus.current = document.activeElement as HTMLElement;
          setItems(data.items);
          setOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open, items]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, items]);

  if (!open || !items?.length) return null;

  function dropItem(id: string) {
    const next = (items ?? []).filter((item) => item.id !== id);
    setItems(next);
    setFeedbackFor(null);
    if (next.length === 0) close();
  }

  async function mark(item: Item, attendance: "ATTENDED" | "ABSENT") {
    const result = await requestJson("/api/attendance", { method: "POST", body: { bookingId: item.id, attendance } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if (attendance === "ATTENDED") {
      setFeedbackFor(item);
      return;
    }
    dropItem(item.id);
  }

  return (
    <div className="dialog" role="presentation">
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attend-title"
      >
        <h2 id="attend-title">{feedbackFor ? "How was it?" : "Did you go?"}</h2>
        <p className="muted">
          {feedbackFor
            ? "A tap here shapes what we suggest next. Skip if you’d rather not say."
            : "These events have finished. Confirming helps your cell leader keep records."}
        </p>
        <StatusBanner message={error} kind="error" />
        <div className="stack">
          {(feedbackFor ? [feedbackFor] : items).map((item, index) => (
            <div key={item.id}>
              {feedbackFor?.id === item.id ? (
                <EventFeedbackBox
                  eventId={item.eventId}
                  eventTitle={item.title}
                  compact
                  onSaved={() => dropItem(item.id)}
                  onSkip={() => dropItem(item.id)}
                />
              ) : (
                <>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.when}</p>
                  <div className="dialog-actions">
                    <button
                      ref={index === 0 ? first : undefined}
                      type="button"
                      onClick={() => mark(item, "ATTENDED")}
                    >
                      Attended
                    </button>
                    <button className="secondary" type="button" onClick={() => mark(item, "ABSENT")}>
                      Didn’t attend
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="dialog-dismiss">
          <button className="ghost" type="button" onClick={close}>
            Ask me next time
          </button>
        </p>
      </div>
    </div>
  );
}
