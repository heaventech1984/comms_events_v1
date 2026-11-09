"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryThumb } from "@/components/CategoryThumb";
import { PendingTileActions } from "@/components/PendingTileActions";
import { StatusBanner } from "@/components/StatusBanner";
import { useConfirm } from "@/components/ConfirmDialog";
import { CATEGORIES, type Category } from "@/lib/constants";
import { requestJson } from "@/lib/fetch-json";
import {
  DISCARD_EVENT_CONFIRM_BODY,
  eventLinkLabel,
  pendingClockLabel,
  pendingWhen
} from "@/lib/pending-copy";
import { categoryAccentStyle } from "@/lib/category-art";

export type PendingTileData = {
  id: string;
  title: string;
  organisationName: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
  online: boolean;
  placeName: string | null;
  externalUrl: string | null;
  needsType: boolean;
  updated: boolean;
  colour: string;
};

export type PendingDayGroup = {
  key: string;
  label: string;
  events: PendingTileData[];
};

export function PendingReviewBoard({ groups }: { groups: PendingDayGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"info" | "error">("info");
  const [dialog, confirm] = useConfirm();

  const allIds = useMemo(() => groups.flatMap((g) => g.events.map((e) => e.id)), [groups]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(allIds) : new Set());
  }

  async function batch(status: "PUBLISHED" | "DISCARDED") {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (status === "DISCARDED") {
      const ok = await confirm({
        title: `Discard ${ids.length} event${ids.length === 1 ? "" : "s"}?`,
        body: DISCARD_EVENT_CONFIRM_BODY,
        confirmLabel: "Discard",
        destructive: true
      });
      if (!ok) return;
    }
    setBusy(true);
    setMessage(null);
    const result = await requestJson<{ updated?: number; skipped?: number }>("/api/events/batch", {
      method: "POST",
      body: { ids, status }
    });
    setBusy(false);
    if (!result.ok) {
      setKind("error");
      setMessage(result.error);
      return;
    }
    setSelected(new Set());
    setKind("info");
    setMessage(
      status === "PUBLISHED"
        ? `Approved ${result.data.updated ?? ids.length} event${(result.data.updated ?? ids.length) === 1 ? "" : "s"}.`
        : `Discarded ${result.data.updated ?? ids.length} event${(result.data.updated ?? ids.length) === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  if (groups.length === 0) return null;

  return (
    <div className="pending-review-board">
      <StatusBanner message={message} kind={kind} />
      <div className="pending-select-bar row">
        <label className="pending-select-all">
          <input
            type="checkbox"
            checked={allChecked}
            disabled={busy || allIds.length === 0}
            onChange={(e) => toggleAll(e.target.checked)}
            data-testid="pending-select-all"
          />
          Select all visible ({allIds.length})
        </label>
        {selected.size > 0 ? (
          <span className="muted" data-testid="pending-selected-count">
            {selected.size} selected
          </span>
        ) : null}
      </div>

      {groups.map((group) => (
        <section key={group.key} className="pending-day">
          <h2 className="pending-day-heading">{group.label}</h2>
          <div className="pending-tiles">
            {group.events.map((event) => (
              <PendingTileCard
                key={event.id}
                event={event}
                selected={selected.has(event.id)}
                onSelect={(on) => toggleOne(event.id, on)}
                busy={busy}
              />
            ))}
          </div>
        </section>
      ))}

      {selected.size > 0 ? (
        <div className="pending-batch-bar" role="toolbar" aria-label="Bulk review">
          <p className="pending-batch-count">
            <strong>{selected.size}</strong> selected
          </p>
          <button
            type="button"
            className="button"
            disabled={busy}
            data-testid="pending-batch-approve"
            onClick={() => void batch("PUBLISHED")}
          >
            Approve selected
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            data-testid="pending-batch-discard"
            onClick={() => void batch("DISCARDED")}
          >
            Discard selected
          </button>
          <button type="button" className="button ghost" disabled={busy} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}
      {dialog}
    </div>
  );
}

function PendingTileCard({
  event,
  selected,
  onSelect,
  busy
}: {
  event: PendingTileData;
  selected: boolean;
  onSelect: (on: boolean) => void;
  busy: boolean;
}) {
  const category = (CATEGORIES.includes(event.category as Category) ? event.category : "Meetup") as Category;
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const clock = pendingClockLabel(startsAt, endsAt);
  const whenFull = pendingWhen(startsAt, endsAt);
  const place = event.online ? "Online" : event.placeName || "In person · place not listed";

  return (
    <article
      className="card pending-tile"
      style={categoryAccentStyle(event.colour)}
      data-testid="pending-tile"
      data-needs-type={event.needsType ? "true" : "false"}
      data-selected={selected ? "true" : undefined}
    >
      <label className="pending-tile-check">
        <input
          type="checkbox"
          checked={selected}
          disabled={busy}
          aria-label={`Select ${event.title}`}
          data-testid="pending-tile-check"
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </label>

      <Link className="pending-tile-link" href={`/events/${event.id}/edit`}>
        <div className="pending-tile-top">
          <p className="pending-kicker muted">
            {event.needsType ? "Needs type" : event.updated ? "Updated" : "New"}
          </p>
          <span className="pending-cat">
            <CategoryThumb category={category} size="sm" />
            {CATEGORIES.includes(category) ? category : event.category}
          </span>
        </div>
        <h3>{event.title}</h3>
        <p className="pending-meta muted">
          <span>{event.organisationName}</span>
          <time dateTime={event.startsAt}>{clock}</time>
        </p>
        <p className="pending-place muted">{place}</p>
      </Link>

      {event.externalUrl ? (
        <p className="pending-ext">
          <span className="pending-ext-label">Event Link</span>
          <a
            className="pending-ext-url"
            href={event.externalUrl}
            target="_blank"
            rel="noreferrer"
            title={event.externalUrl}
            data-testid="pending-event-link"
            onClick={(e) => e.stopPropagation()}
          >
            {eventLinkLabel(event.externalUrl)}
          </a>
        </p>
      ) : (
        <p className="pending-ext pending-ext-empty muted">No event link yet</p>
      )}

      <div className="pending-tile-preview" role="tooltip" data-testid="pending-tile-preview">
        <p className="pending-preview-title">{event.title}</p>
        <p className="muted">{event.organisationName}</p>
        <p>{whenFull}</p>
        <p className="muted">{place}</p>
        <p className="muted">{category}</p>
        {event.externalUrl ? <p className="muted">{eventLinkLabel(event.externalUrl)}</p> : null}
      </div>

      <PendingTileActions
        eventId={event.id}
        title={event.title}
        category={category}
        needsTypeReview={event.needsType}
      />
    </article>
  );
}
