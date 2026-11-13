"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const KEY = "gather-calendar-filters";

/**
 * localStorage is a note in this browser that survives closing the tab.
 * A bare /calendar visit restores the last categories and tags.
 * A link that already names a date or a filter keeps that address, then updates the note.
 */
export function CalendarFilterMemory() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const query = search.toString();

  useEffect(() => {
    if (pathname !== "/calendar") return;
    if (!query) {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { types?: string; tags?: string };
        const next = new URLSearchParams();
        if (saved.types) next.set("types", saved.types);
        if (saved.tags) next.set("tags", saved.tags);
        const q = next.toString();
        if (q) router.replace(`/calendar?${q}`);
      } catch {
        localStorage.removeItem(KEY);
      }
      return;
    }
    localStorage.setItem(
      KEY,
      JSON.stringify({
        types: search.get("types") || search.get("category") || "",
        tags: search.get("tags") || ""
      })
    );
  }, [pathname, query, router, search]);

  return null;
}
