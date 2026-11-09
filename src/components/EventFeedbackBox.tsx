"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/fetch-json";
import { StatusBanner } from "./StatusBanner";
import type { FeedbackRating } from "@/lib/constants";

const OPTIONS: { rating: FeedbackRating; label: string; hint: string }[] = [
  { rating: "LOVED", label: "Loved it", hint: "More like this" },
  { rating: "OK", label: "It was fine", hint: "Keep similar" },
  { rating: "NOT_FOR_ME", label: "Not for me", hint: "Fewer like this" }
];

export function EventFeedbackBox({
  eventId,
  eventTitle,
  compact = false,
  onSaved,
  onSkip
}: {
  eventId: string;
  eventTitle: string;
  compact?: boolean;
  onSaved?: () => void;
  onSkip?: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!rating) return;
    setBusy(true);
    const result = await requestJson("/api/feedback", {
      method: "POST",
      body: { eventId, rating, comment }
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setDone(true);
    router.refresh();
    onSaved?.();
  }

  if (done) {
    return (
      <div className="feedback-box feedback-box-done" data-testid="event-feedback" data-state="saved">
        <p className="feedback-thanks">Thank you. We’ll look for more that fit.</p>
      </div>
    );
  }

  return (
    <div className={`feedback-box${compact ? " feedback-box-compact" : ""}`} data-testid="event-feedback">
      <p className="feedback-kicker">How was it?</p>
      <p className="feedback-title">{eventTitle}</p>
      <div className="feedback-moods" role="group" aria-label="How the event felt">
        {OPTIONS.map((option) => {
          const on = rating === option.rating;
          return (
            <button
              key={option.rating}
              type="button"
              className="feedback-mood"
              aria-pressed={on}
              data-rating={option.rating.toLowerCase()}
              onClick={() => setRating(option.rating)}
            >
              <span className="feedback-mood-label">{option.label}</span>
              <span className="feedback-mood-hint">{option.hint}</span>
            </button>
          );
        })}
      </div>
      <div className={`feedback-note-wrap${rating ? " is-open" : ""}`}>
        <div className="feedback-note-inner">
          <label className="feedback-note-label">
            A short note, if you like
            <textarea
              className="feedback-note"
              rows={3}
              maxLength={400}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should we remember?"
            />
          </label>
          <StatusBanner message={error} kind="error" />
          <div className="feedback-actions">
            <button type="button" onClick={send} disabled={busy || !rating}>
              {busy ? "Saving…" : "Send"}
            </button>
            {onSkip ? (
              <button className="ghost" type="button" onClick={onSkip} disabled={busy}>
                Skip
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
