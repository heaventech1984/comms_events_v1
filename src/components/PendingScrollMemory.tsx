"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY = "gather-pending-scroll";

type SavedScroll = { url: string; pageY: number };

/**
 * Remembers how far down the pending list was scrolled.
 * sessionStorage is a sticky note in this browser tab. It lasts until the tab closes.
 */
export function PendingScrollMemory() {
  const pathname = usePathname();
  const search = useSearchParams();
  const url = `${pathname}${search.toString() ? `?${search.toString()}` : ""}`;

  useEffect(() => {
    function snapshot() {
      const note: SavedScroll = { url, pageY: window.scrollY };
      sessionStorage.setItem(KEY, JSON.stringify(note));
    }

    let restored = false;
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedScroll;
        restored = saved.url === url && typeof saved.pageY === "number";
      } catch {
        restored = false;
      }
    }

    const frame = requestAnimationFrame(() => {
      if (!restored || !raw) return;
      const saved = JSON.parse(raw) as SavedScroll;
      window.scrollTo(0, saved.pageY);
    });

    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a");
      const href = link?.getAttribute("href") ?? "";
      if (href.includes("/edit")) snapshot();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
    };
  }, [url]);

  return null;
}
