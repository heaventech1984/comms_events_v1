"use client";

import { useEffect, useState } from "react";
import { EventsMap } from "@/components/EventsMap";

type Pin = { id: string; title: string; lat: number; lng: number };

/**
 * Phone: map starts collapsed so the month agenda fits above the fold.
 * Tablet and wider: map stays open.
 */
export function CalendarMapSection({ pins }: { pins: Pin[] }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const sync = () => setOpen(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details
      className="card map-card map-fold"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="map-heading">Map</summary>
      <EventsMap pins={pins} />
    </details>
  );
}
