import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { parsePriorityUrls, scrapeUrlAllowed, validatePublicImportUrl } from "@/lib/scraper/allowlist";
import { extrasOnlyPriorityUrls } from "@/lib/scraper/discovery-pack";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Only an admin can review scraper sources." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { url?: unknown; action?: unknown };
  const rawUrl = String(body.url ?? "").trim();
  if (rawUrl.length > 2048 || !rawUrl.startsWith("https://")) return NextResponse.json({ error: "Invalid source URL." }, { status: 400 });
  const publicUrl = validatePublicImportUrl(rawUrl);
  if (!publicUrl.ok) return NextResponse.json({ error: publicUrl.reason }, { status: 400 });
  const sourceUrl = `${publicUrl.url.origin}${publicUrl.url.pathname}`;
  if (body.action === "request") {
    await writeAudit({ actorId: user.id, action: "scraper.source-review-request", entityType: "ScraperSource", summary: `${user.name} requested allowlist review for ${sourceUrl}` });
    return NextResponse.json({ ok: true, requested: true });
  }
  if (body.action !== "add") return NextResponse.json({ error: "Choose a review action." }, { status: 400 });
  const checked = scrapeUrlAllowed(sourceUrl);
  if (!checked.ok) return NextResponse.json({ error: "This host needs allowlist review before it can be added to recurring feeds." }, { status: 400 });
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  let current: unknown[] = [];
  try { const parsed = JSON.parse(row?.priorityUrls ?? "[]"); if (Array.isArray(parsed)) current = parsed; } catch { /* use empty list */ }
  const parsed = parsePriorityUrls([...current, checked.url.toString()]);
  if (!parsed.urls.includes(checked.url.toString())) return NextResponse.json({ error: "Could not add this page to recurring feeds." }, { status: 400 });
  await prisma.settings.upsert({ where: { id: "default" }, update: { priorityUrls: JSON.stringify(extrasOnlyPriorityUrls(parsed.urls)) }, create: { id: "default", categoryColours: "{}", priorityUrls: JSON.stringify(parsed.urls) } });
  await writeAudit({ actorId: user.id, action: "scraper.source-promoted", entityType: "ScraperSource", summary: `${user.name} added ${checked.url} to recurring scraper feeds` });
  return NextResponse.json({ ok: true, added: checked.url.toString() });
}
