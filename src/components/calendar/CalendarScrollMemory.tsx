"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY = "gather-calendar-scroll";

type SavedScroll = { url: string; pageY: number; grid: number };

/**
 * Remembers how far the calendar was scrolled, and opens the time grid at the bottom.
 * sessionStorage is a sticky note in this browser tab. It lasts until the tab closes.
 */
export function CalendarScrollMemory() {
  const pathname = usePathname();
  const search = useSearchParams();
  const url = `${pathname}${search.toString() ? `?${search.toString()}` : ""}`;

  useEffect(() => {
    const grid = () => document.querySelector<HTMLElement>(".week-time-scroll");

    function snapshot() {
      const scroller = grid();
      const note: SavedScroll = {
        url,
        pageY: window.scrollY,
        grid: scroller ? scroller.scrollTop : 0
      };
      sessionStorage.setItem(KEY, JSON.stringify(note));
    }

    let restored = false;
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedScroll;
        if (saved.url === url) restored = true;
      } catch {
        restored = false;
      }
    }

    const frame = requestAnimationFrame(() => {
      const scroller = grid();
      if (restored && raw) {
        const saved = JSON.parse(raw) as SavedScroll;
        window.scrollTo(0, saved.pageY || 0);
        if (scroller && typeof saved.grid === "number") scroller.scrollTop = saved.grid;
        return;
      }
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });

    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("/events/")) snapshot();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
    };
  }, [url]);

  return null;
}
