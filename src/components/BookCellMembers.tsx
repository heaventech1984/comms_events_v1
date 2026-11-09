"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bookableCellMembers, bookCellEmptyReason } from "@/lib/book-cell";
import { requestJson } from "@/lib/fetch-json";
import { StatusBanner } from "./StatusBanner";

export function BookCellMembers({
  eventId,
  actorId,
  members,
  bookedMemberIds,
  hasCell,
  full
}: {
  eventId: string;
  actorId: string;
  members: { id: string; name: string }[];
  bookedMemberIds: string[];
  hasCell: boolean;
  full: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"info" | "error">("info");

  const others = useMemo(() => members.filter((m) => m.id !== actorId), [members, actorId]);
  const bookable = useMemo(
    () => bookableCellMembers({ members, bookedIds: bookedMemberIds, actorId, query }),
    [members, bookedMemberIds, actorId, query]
  );
  const emptyReason = bookCellEmptyReason({
    hasCell,
    memberCount: members.length,
    bookableCount: bookableCellMembers({ members, bookedIds: bookedMemberIds, actorId }).length,
    full
  });
  const showSearch = others.length > 6 && !emptyReason;

  async function book(userId: string) {
    setBusyId(userId);
    const result = await requestJson("/api/bookings", { method: "POST", body: { eventId, userId } });
    setBusyId(null);
    if (!result.ok) {
      setKind("error");
      setMessage(result.error);
      return;
    }
    setFlashId(userId);
    window.setTimeout(() => setFlashId(null), 600);
    setKind("info");
    setMessage("Booked.");
    router.refresh();
  }

  return (
    <section className="card stack book-cell-panel" data-testid="book-cell-members">
      <div>
        <h2>Book people in your cell</h2>
        <p className="lede">Pick someone. They will show as Going.</p>
      </div>
      <StatusBanner message={message} kind={kind} />
      {emptyReason ? (
        <p className="muted" data-testid="book-cell-empty">
          {emptyReason}
        </p>
      ) : (
        <>
          {showSearch ? (
            <label>
              Find someone
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name"
                data-testid="book-cell-search"
              />
            </label>
          ) : null}
          {bookable.length === 0 ? (
            <p className="muted" data-testid="book-cell-empty">
              No names match that search.
            </p>
          ) : (
            <ul className="book-cell-list">
              {bookable.map((member) => (
                <li key={member.id} className="book-cell-row" data-testid="book-cell-row">
                  <span>{member.name}</span>
                  <button
                    className={`secondary${flashId === member.id ? " book-flash" : ""}`}
                    type="button"
                    disabled={busyId !== null}
                    data-testid="book-member"
                    onClick={() => book(member.id)}
                  >
                    Book
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
