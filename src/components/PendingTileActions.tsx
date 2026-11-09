"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category } from "@/lib/constants";
import { requestJson } from "@/lib/fetch-json";
import { DISCARD_EVENT_CONFIRM_BODY } from "@/lib/pending-copy";
import { useConfirm } from "./ConfirmDialog";

export function PendingTileActions({
  eventId,
  title,
  category,
  needsTypeReview
}: {
  eventId: string;
  title: string;
  category: Category;
  needsTypeReview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialog, confirm] = useConfirm();

  async function patch(status: "PUBLISHED" | "DISCARDED") {
    if (status === "DISCARDED") {
      const ok = await confirm({
        title: `Discard ${title}?`,
        body: DISCARD_EVENT_CONFIRM_BODY,
        confirmLabel: "Discard",
        destructive: true
      });
      if (!ok) return;
    }
    setBusy(true);
    const result = await requestJson(`/api/events/${eventId}`, {
      method: "PATCH",
      body: { status }
    });
    setBusy(false);
    if (!result.ok) return;
    router.refresh();
  }

  async function confirmType(nextCategory: Category = category) {
    setBusy(true);
    const result = await requestJson(`/api/events/${eventId}`, {
      method: "PATCH",
      body: { confirmType: true, category: nextCategory }
    });
    setBusy(false);
    if (!result.ok) return;
    router.refresh();
  }

  return (
    <div className="pending-tile-actions">
      {needsTypeReview ? (
        <div className="pending-type-row" data-testid="pending-type-review">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            data-testid="pending-confirm-type"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void confirmType(category);
            }}
          >
            Confirm {category}
          </button>
          <label className="pending-type-switch">
            <span className="sr-only">Change type</span>
            <select
              aria-label="Change event type"
              disabled={busy}
              value={category}
              data-testid="pending-type-select"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void confirmType(e.target.value as Category);
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        data-testid="pending-approve"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void patch("PUBLISHED");
        }}
      >
        Approve
      </button>
      <button
        type="button"
        className="ghost"
        disabled={busy}
        data-testid="pending-discard"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void patch("DISCARDED");
        }}
      >
        Discard
      </button>
      {dialog}
    </div>
  );
}
