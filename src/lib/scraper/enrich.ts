import { isHttpUrl } from "../security";

/** Listing / find pages — weaker than a single-event URL when refreshing details. */
function looksLikeListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const q = u.search.toLowerCase();
    if (path.includes("/find") || path.includes("/d/united-kingdom") || path.endsWith("/all")) return true;
    if (q.includes("keywords=") && path.includes("/find")) return true;
    if (path.includes("/this-weekend") || path.includes("/search")) return true;
    return false;
  } catch {
    return false;
  }
}

function nonempty(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/** Prefer a longer place string when both exist (more venue detail). */
export function preferPlace(
  incoming: string | null | undefined,
  existing: string | null | undefined
): string | null {
  const a = nonempty(incoming);
  const b = nonempty(existing);
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

/**
 * Prefer a fresh event-page link over a city listing / find page.
 * Keeps the prior link when this fetch returned nothing usable.
 */
export function preferExternalUrl(
  incoming: string | null | undefined,
  existing: string | null | undefined
): string | null {
  const a = incoming && isHttpUrl(incoming) ? incoming : null;
  const b = existing && isHttpUrl(existing) ? existing : null;
  if (!a) return b;
  if (!b) return a;
  if (looksLikeListingUrl(b) && !looksLikeListingUrl(a)) return a;
  if (looksLikeListingUrl(a) && !looksLikeListingUrl(b)) return b;
  return a;
}

/** Fresh scrape notes win when present; otherwise keep what we had. */
export function preferNotes(
  incoming: string | null | undefined,
  existing: string | null | undefined
): string | null {
  return nonempty(incoming) ?? nonempty(existing);
}
