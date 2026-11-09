import { prisma } from "./db";
import { writeAudit } from "./audit";
import { CATEGORIES, DEFAULT_COLOURS, parseMemberAttendeeView, type Category } from "./constants";
import { parsePriorityUrls } from "./scraper/allowlist";
import {
  extrasOnlyPriorityUrls,
  frozenDiscoveryUrls,
  mergeDiscoveryWithExtras
} from "./scraper/discovery-pack";

function readPriorityUrlList(raw: string | null | undefined): unknown[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * If Priority extras are empty (or FORCE_DISCOVERY_PACK=1), enable all five types.
 * The frozen pack is merged at Run time — we no longer paste it into the Priority box.
 */
export async function ensureFrozenDiscoveryPack(actorId?: string | null) {
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!row) return { urls: mergeDiscoveryWithExtras([]), applied: false };
  const current = parsePriorityUrls(readPriorityUrlList(row.priorityUrls)).urls;
  const extras = extrasOnlyPriorityUrls(current);
  const force = process.env.FORCE_DISCOVERY_PACK === "1";
  const needsRewrite = force || extras.length !== current.length;
  if (current.length > 0 && !force && !needsRewrite) {
    return { urls: mergeDiscoveryWithExtras(extras), applied: false };
  }
  if (current.length === 0 && !force) {
    // Empty extras is the happy path — pack still runs via mergeDiscoveryWithExtras.
    const enabledAll =
      row.christianEnabled &&
      row.networkingEnabled &&
      row.professionalEnabled &&
      row.studentEnabled &&
      row.meetupEnabled;
    if (enabledAll) return { urls: mergeDiscoveryWithExtras([]), applied: false };
    await prisma.settings.update({
      where: { id: "default" },
      data: {
        christianEnabled: true,
        networkingEnabled: true,
        professionalEnabled: true,
        studentEnabled: true,
        meetupEnabled: true
      }
    });
    await writeAudit({
      actorId: actorId ?? null,
      action: "settings.discoveryPack.applied",
      entityType: "Settings",
      entityId: "default",
      summary: `Enabled all five types for the frozen Birmingham discovery pack (${frozenDiscoveryUrls().length} feeds at Run).`
    });
    return { urls: mergeDiscoveryWithExtras([]), applied: true };
  }
  // Strip pack URLs from the box (or force-clear extras) so admins only see gap-fillers.
  await prisma.settings.update({
    where: { id: "default" },
    data: {
      priorityUrls: JSON.stringify(force ? [] : extras),
      christianEnabled: true,
      networkingEnabled: true,
      professionalEnabled: true,
      studentEnabled: true,
      meetupEnabled: true
    }
  });
  await writeAudit({
    actorId: actorId ?? null,
    action: "settings.discoveryPack.applied",
    entityType: "Settings",
    entityId: "default",
    summary: force
      ? `Reset Priority extras; Run uses frozen Birmingham pack (${frozenDiscoveryUrls().length} feeds).`
      : `Moved frozen-pack URLs out of Priority extras; Run still merges the pack (${frozenDiscoveryUrls().length} feeds).`
  });
  return { urls: mergeDiscoveryWithExtras(force ? [] : extras), applied: true };
}

export async function getSettings() {
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  const colours = row ? (JSON.parse(row.categoryColours) as Record<string, string>) : DEFAULT_COLOURS;
  const enabled: Record<Category, boolean> = {
    Christian: row?.christianEnabled ?? true,
    Networking: row?.networkingEnabled ?? true,
    Professional: row?.professionalEnabled ?? true,
    Student: row?.studentEnabled ?? true,
    Meetup: row?.meetupEnabled ?? true
  };
  const partitioned = parsePriorityUrls(readPriorityUrlList(row?.priorityUrls));
  return {
    locationLabel: row?.locationLabel ?? "Birmingham",
    memberAttendeeView: parseMemberAttendeeView(row?.memberAttendeeView),
    colours: { ...DEFAULT_COLOURS, ...colours },
    enabled,
    // Form shows gap-fillers only — the pack is always added at Run.
    priorityUrls: extrasOnlyPriorityUrls(partitioned.urls)
  };
}

/**
 * Drops stored Priority URLs that no longer pass the allowlist (e.g. a leftover Meetup search page)
 * so Save and Run now are not blocked by stale config. Writes an audit row when anything is removed.
 * Also strips frozen-pack URLs from the box (they are merged automatically on every Run).
 */
export async function persistCleanPriorityUrls(actorId?: string | null) {
  const ensured = await ensureFrozenDiscoveryPack(actorId);
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!row) {
    return {
      urls: mergeDiscoveryWithExtras([]),
      stored: [] as string[],
      dropped: [] as { url: string; reason: string }[]
    };
  }
  const partitioned = parsePriorityUrls(readPriorityUrlList(row.priorityUrls));
  const extras = extrasOnlyPriorityUrls(partitioned.urls);
  const shouldRewrite =
    partitioned.rejected.length > 0 || extras.length !== partitioned.urls.length;
  if (shouldRewrite) {
    await prisma.settings.update({
      where: { id: "default" },
      data: { priorityUrls: JSON.stringify(extras) }
    });
    if (partitioned.rejected.length) {
      await writeAudit({
        actorId: actorId ?? null,
        action: "settings.priorityUrls.dropped",
        entityType: "Settings",
        entityId: "default",
        summary: `Removed ${partitioned.rejected.length} Priority URL(s) no longer on the allowlist: ${partitioned.rejected
          .map((item) => item.url)
          .join(", ")}`
      });
    }
  }
  return {
    urls: mergeDiscoveryWithExtras(extras),
    stored: extras,
    dropped: partitioned.rejected
  };
}

export function enabledCategories(enabled: Record<Category, boolean>): Category[] {
  return CATEGORIES.filter((c) => enabled[c]);
}
