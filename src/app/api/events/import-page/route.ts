import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { fetchLiveEvents } from "@/lib/scraper/live-adapter";
import { fetchPublicPage } from "@/lib/scraper/public-fetch";
import { validatePublicImportUrl } from "@/lib/scraper/allowlist";
import { getSettings } from "@/lib/settings";
import { encodeTags } from "@/lib/tags";
import { prisma } from "@/lib/db";

function sourcePathOnly(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || !canReview(user)) return NextResponse.json({ error: "You cannot import events." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { url?: unknown };
  const rawUrl = String(body.url ?? "");
  if (rawUrl.length > 2048) return NextResponse.json({ error: "URL is too long." }, { status: 400 });
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
  const events = await Promise.all(result.events.map(async (event) => {
    const duplicate = await prisma.event.findFirst({ where: { title: event.title, startsAt: event.startsAt, status: { not: "DISCARDED" } }, select: { id: true } });
    return {
    title: event.title, organisationName: event.organisationName, category: event.category,
    tags: encodeTags(event.tags ?? []), startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString(),
    online: event.online, placeName: event.placeName ?? "", lat: event.lat ?? null, lng: event.lng ?? null,
    externalUrl: event.externalUrl ?? "", notes: (event.notes ?? "").replaceAll(checked.url.toString(), sourcePathOnly(checked.url)),
    sourcePageUrl: sourcePathOnly(checked.url), duplicate: Boolean(duplicate)
  }; }));
  return NextResponse.json({ events });
}
