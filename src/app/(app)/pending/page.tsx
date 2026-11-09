import { CategoryThumb } from "@/components/CategoryThumb";
import { Chip } from "@/components/calendar/FilterBar";
import { PendingReviewBoard, type PendingDayGroup } from "@/components/PendingReviewBoard";
import { requireUser } from "@/lib/auth";
import { dayKeyOf, formatDayKey } from "@/lib/calendar";
import { CATEGORIES, type Category } from "@/lib/constants";
import { pendingReviewLede } from "@/lib/pending-copy";
import {
  eventMatchesPendingFilters,
  parsePendingFilters,
  pendingHref,
  togglePendingType
} from "@/lib/pending-filters";
import { loadOpenPendingEvents } from "@/lib/pending-time";
import { tidyPlaceName } from "@/lib/place";
import { isUpdatedScrapedRow } from "@/lib/scraper/apply";
import { notesNeedTypeReview } from "@/lib/scraper/type-review";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/time";

export default async function PendingPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string; types?: string; format?: string }>;
}) {
  const user = await requireUser(["admin", "cell leader"]);
  const settings = await getSettings();
  const sp = await searchParams;
  const filters = parsePendingFilters(sp);
  const allEvents = await loadOpenPendingEvents();
  const needsTypeCount = allEvents.filter((e) => notesNeedTypeReview(e.notes)).length;
  const events = allEvents.filter((event) =>
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
      colour: settings.colours[CATEGORIES.includes(category) ? category : "Meetup"]
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
          <div className="filters" role="group" aria-label="Online or in person">
            <Chip href={pendingHref(filters, { format: "" })} current={!filters.format}>
              Any format
            </Chip>
            <Chip
              href={pendingHref(filters, { format: "inperson" })}
              current={filters.format === "inperson"}
              pressed={filters.format === "inperson"}
            >
              In person
            </Chip>
            <Chip
              href={pendingHref(filters, { format: "online" })}
              current={filters.format === "online"}
              pressed={filters.format === "online"}
            >
              Online
            </Chip>
          </div>
          <div className="filters" role="group" aria-label="Type review">
            <Chip href={pendingHref(filters, { needsTypeOnly: false })} current={!filters.needsTypeOnly}>
              All ({allEvents.length})
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
          {filters.needsTypeOnly || filters.types.length || filters.format
            ? "Nothing matches these filters. Try All types or Any format."
            : "Nothing waiting. Run now on scraper settings if you are admin."}
        </p>
      ) : (
        <PendingReviewBoard groups={groups} />
      )}
    </main>
  );
}
