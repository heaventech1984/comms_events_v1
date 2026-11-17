import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { decorateScrapedEvents, fetchLiveEvents, parseScrapedBody } from "@/lib/scraper/live-adapter";
import { fetchPublicPage } from "@/lib/scraper/public-fetch";
import { validatePublicImportUrl } from "@/lib/scraper/allowlist";
import { getSettings } from "@/lib/settings";
import { encodeTags } from "@/lib/tags";
import { prisma } from "@/lib/db";
import { eventFromPastedText } from "@/lib/scraper/pasted-text";
import { FETCH_BODY_MAX } from "@/lib/scraper/harvest";
import type { ScrapedEvent } from "@/lib/scraper/types";

function sourcePathOnly(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

async function previews(events: ScrapedEvent[], sourceUrl: string | null) {
  const safeSource = sourceUrl ? sourcePathOnly(new URL(sourceUrl)) : "";
  return Promise.all(events.map(async (event) => {
    const duplicate = await prisma.event.findFirst({
      where: { title: event.title, startsAt: event.startsAt, status: { not: "DISCARDED" } },
      select: { id: true }
    });
    return {
      title: event.title,
      organisationName: event.organisationName,
      category: event.category,
      tags: encodeTags(event.tags ?? []),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      online: event.online,
      placeName: event.placeName ?? "",
      lat: event.lat ?? null,
      lng: event.lng ?? null,
      externalUrl: event.externalUrl ?? "",
      notes: sourceUrl ? (event.notes ?? "").replaceAll(sourceUrl, safeSource) : event.notes ?? "",
      sourcePageUrl: safeSource,
      duplicate: Boolean(duplicate)
    };
  }));
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || !canReview(user)) return NextResponse.json({ error: "You cannot import events." }, { status: 403 });
  const rawBody = await request.text();
  if (rawBody.length > FETCH_BODY_MAX * 2 + 8192) {
    return NextResponse.json({ error: "Pasted content is too large. Copy just the event details and try again." }, { status: 413 });
  }
  const body = await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => ({})) as { url?: unknown; mode?: unknown; text?: unknown; html?: unknown };
  const rawUrl = String(body.url ?? "");
  if (rawUrl.length > 2048) return NextResponse.json({ error: "URL is too long." }, { status: 400 });
  if (body.mode === "paste") {
    const checkedSource = rawUrl ? validatePublicImportUrl(rawUrl) : null;
    if (checkedSource && !checkedSource.ok) return NextResponse.json({ error: checkedSource.reason }, { status: 400 });
    const pastedText = String(body.text ?? "");
    const pastedHtml = String(body.html ?? "");
    if (pastedText.length + pastedHtml.length > FETCH_BODY_MAX) {
      return NextResponse.json({ error: "Pasted content is too large. Copy just the event details and try again." }, { status: 413 });
    }
    const sourceUrl = checkedSource?.ok ? checkedSource.url.toString() : "https://pasted-content.invalid/";
    const events = pastedHtml
      ? parseScrapedBody(sourceUrl, "text/html", pastedHtml)
      : [];
    const parsed = events.length ? events : (() => {
      const event = eventFromPastedText(pastedText, checkedSource?.ok ? sourcePathOnly(checkedSource.url) : "");
      return event ? [event] : [];
    })();
    if (!parsed.length) {
      return NextResponse.json({ error: "I couldn't identify an event. Paste its title, date, start/end time and location, or add it manually." }, { status: 422 });
    }
    const decorated = decorateScrapedEvents(parsed, sourceUrl).map((event) => checkedSource?.ok ? event : {
      ...event,
      externalUrl: event.externalUrl === sourceUrl ? null : event.externalUrl,
      fetchedFrom: null,
      notes: (event.notes ?? "").replace(`\n\nSource feed: ${sourceUrl}`, "").replace(`Source feed: ${sourceUrl}`, "")
    });
    return NextResponse.json({ events: await previews(decorated, checkedSource?.ok ? checkedSource.url.toString() : null) });
  }
  const checked = validatePublicImportUrl(rawUrl);
  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });
  const settings = await getSettings();
  const result = await fetchLiveEvents([checked.url.toString()], {
    fetchFn: fetchPublicPage,
    pauseMs: 0,
    radiusMiles: settings.scrapeRadiusMiles,
    publicSingleUrl: true
  });
  if (!result.events.length) {
    return NextResponse.json({ error: result.sources[0]?.error ?? "No events could be read from this page." }, { status: 422 });
  }
  const events = await previews(result.events, checked.url.toString());
  return NextResponse.json({ events });
}
