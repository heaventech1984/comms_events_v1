import { Suspense } from "react";
import { CategoryThumb } from "@/components/CategoryThumb";
import { PendingScrollMemory } from "@/components/PendingScrollMemory";
import { Chip } from "@/components/calendar/FilterBar";
import { PendingReviewBoard, type PendingDayGroup } from "@/components/PendingReviewBoard";
import { requireUser } from "@/lib/auth";
import { dayKeyOf, formatDayKey } from "@/lib/calendar";
import { CATEGORIES, TAGS, tagChipLabel, type Category } from "@/lib/constants";
import { pendingReviewLede } from "@/lib/pending-copy";
import {
  eventInPendingDates,
  eventMatchesPendingFilters,
  parsePendingFilters,
  pendingHref,
  togglePendingTag,
  togglePendingType
} from "@/lib/pending-filters";
import { decodeTags } from "@/lib/tags";
import { loadOpenPendingEvents } from "@/lib/pending-time";
import { tidyPlaceName } from "@/lib/place";
import { isUpdatedScrapedRow } from "@/lib/scraper/apply";
import { repairUnsupportedTypeStamps } from "@/lib/scraper/repair-types";
import { notesNeedTypeReview } from "@/lib/scraper/type-review";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/time";

export default async function PendingPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string; types?: string; tags?: string; format?: string; from?: string; to?: string; dates?: string }>;
}) {
  const user = await requireUser(["admin", "cell leader"]);
  const settings = await getSettings();
  const sp = await searchParams;
  const today = dayKeyOf(new Date());
  const filters = parsePendingFilters(sp, today);
  await repairUnsupportedTypeStamps();
  const allEvents = await loadOpenPendingEvents();
  const inDates = allEvents.filter((event) => eventInPendingDates(event.startsAt, filters));
  const needsTypeCount = inDates.filter((e) => notesNeedTypeReview(e.notes)).length;
  const events = inDates.filter((event) =>
    eventMatchesPendingFilters(event, filters, notesNeedTypeReview(event.notes))
  );
  const groups: PendingDayGroup[] = [];
  for (const event of events) {
    const key = formatDayKey(dayKeyOf(event.startsAt));
    const last = groups[groups.length - 1];
    const category = event.category as Category;
    const tile = {
      id: event.id,
      title: event.title,
      organisationName: event.organisationName,
      category: event.category,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      online: event.online,
      placeName: tidyPlaceName(event.placeName),
      externalUrl: event.externalUrl,
      needsType: notesNeedTypeReview(event.notes),
      updated: isUpdatedScrapedRow(event.createdAt, event.updatedAt),
      tags: decodeTags(event.tags).join(" · "),
      colour: settings.colours[CATEGORIES.includes(category) ? category : "Social"]
    };
    if (!last || last.key !== key) {
      groups.push({ key, label: formatDate(event.startsAt), events: [tile] });
    } else {
      last.events.push(tile);
    }
  }
  const enabled = CATEGORIES.filter((c) => settings.enabled[c]);

  return (
    <main>
      <div className="page-head">
        <h1>Pending review</h1>
        <p className="lede">{pendingReviewLede({ name: user.name, role: user.role })}</p>
        <div className="calendar-filters pending-calendar-filters">
          <form className="filters" method="get" action="/pending" aria-label="Dates">
            {filters.types.length ? <input type="hidden" name="types" value={filters.types.join(",")} /> : null}
            {filters.tags.length ? <input type="hidden" name="tags" value={filters.tags.join(",")} /> : null}
            {filters.needsTypeOnly ? <input type="hidden" name="filter" value="needs-type" /> : null}
            <label>
              From
              <input type="date" name="from" defaultValue={filters.dateMode === "all" ? "" : formatDayKey(filters.from)} />
            </label>
            <label>
              To
              <input type="date" name="to" defaultValue={filters.dateMode === "all" ? "" : formatDayKey(filters.to)} />
            </label>
            <button type="submit">Show dates</button>
            <Chip href={pendingHref(filters, { dateMode: "default" })} current={filters.dateMode === "default"} pressed={filters.dateMode === "default"}>
              Next 7 days
            </Chip>
            <Chip href={pendingHref(filters, { dateMode: "all" })} current={filters.dateMode === "all"} pressed={filters.dateMode === "all"}>
              All open dates
            </Chip>
          </form>
          <div className="filters" role="group" aria-label="Event type">
            <Chip href={pendingHref(filters, { types: [] })} current={filters.types.length === 0}>
              All types
            </Chip>
            {enabled.map((c) => {
              const on = filters.types.includes(c);
              return (
                <Chip
                  key={c}
                  href={pendingHref(filters, { types: togglePendingType(filters.types, c) })}
                  current={on}
                  pressed={on}
                >
                  <CategoryThumb category={c} size="sm" />
                  <span className="swatch" style={{ background: settings.colours[c] }} />
                  {c}
                </Chip>
              );
            })}
          </div>
          <div className="filters" role="group" aria-label="Tags">
            <Chip href={pendingHref(filters, { tags: [] })} current={filters.tags.length === 0}>
              All tags
            </Chip>
            {TAGS.map((tag) => {
              const on = filters.tags.includes(tag);
              return (
                <Chip key={tag} href={pendingHref(filters, { tags: togglePendingTag(filters.tags, tag) })} current={on} pressed={on}>
                  {tagChipLabel(tag)}
                </Chip>
              );
            })}
          </div>
          <div className="filters" role="group" aria-label="Type review">
            <Chip href={pendingHref(filters, { needsTypeOnly: false })} current={!filters.needsTypeOnly}>
              All ({inDates.length})
            </Chip>
            <Chip
              href={pendingHref(filters, { needsTypeOnly: true })}
              current={filters.needsTypeOnly}
              pressed={filters.needsTypeOnly}
              data-testid="pending-filter-needs-type"
            >
              Needs type ({needsTypeCount})
            </Chip>
          </div>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="muted">
          {filters.rangeError
            ? "The end date is before the start date."
            : filters.needsTypeOnly || filters.types.length || filters.tags.length
              ? "Nothing matches these filters. Try All categories or All tags."
              : filters.dateMode === "all"
                ? "Nothing waiting. Run now on scraper settings if you are admin."
                : "Nothing in these dates. Try All open dates, or move the end date."}
        </p>
      ) : (
        <>
          <PendingReviewBoard groups={groups} returnTo={pendingHref(filters)} />
          <Suspense fallback={null}>
            <PendingScrollMemory />
          </Suspense>
        </>
      )}
    </main>
  );
}
