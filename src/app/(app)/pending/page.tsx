import Link from "next/link";
import { CategoryThumb } from "@/components/CategoryThumb";
import { Chip } from "@/components/calendar/FilterBar";
import { PendingTileActions } from "@/components/PendingTileActions";
import { requireUser } from "@/lib/auth";
import { categoryAccentStyle } from "@/lib/category-art";
import { dayKeyOf, formatDayKey } from "@/lib/calendar";
import { CATEGORIES, type Category } from "@/lib/constants";
import { eventLinkLabel } from "@/lib/pending-copy";
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
import { formatDate, formatTimeRange } from "@/lib/time";

export default async function PendingPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string; types?: string; format?: string }>;
}) {
  await requireUser(["admin", "cell leader"]);
  const settings = await getSettings();
  const sp = await searchParams;
  const filters = parsePendingFilters(sp);
  const allEvents = await loadOpenPendingEvents();
  const needsTypeCount = allEvents.filter((e) => notesNeedTypeReview(e.notes)).length;
  const events = allEvents.filter((event) =>
    eventMatchesPendingFilters(event, filters, notesNeedTypeReview(event.notes))
  );
  const groups: { key: string; label: string; events: typeof events }[] = [];
  for (const event of events) {
    const key = formatDayKey(dayKeyOf(event.startsAt));
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: formatDate(event.startsAt), events: [event] });
    } else {
      last.events.push(event);
    }
  }
  const enabled = CATEGORIES.filter((c) => settings.enabled[c]);

  return (
    <main>
      <div className="page-head">
        <h1>Pending review</h1>
        <p className="lede">
          Scraped events still ahead (or on now), waiting for a cell leader or admin, grouped by day. Use the chips to
          vet one type or Online / In person. Past ones leave this list automatically.
        </p>
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
      ) : null}
      {groups.map((group) => (
        <section key={group.key} className="pending-day">
          <h2 className="pending-day-heading">{group.label}</h2>
          <div className="pending-tiles">
            {group.events.map((event) => {
              const updated = isUpdatedScrapedRow(event.createdAt, event.updatedAt);
              const needsType = notesNeedTypeReview(event.notes);
              const category = event.category as Category;
              const place = tidyPlaceName(event.placeName);
              return (
                <article
                  key={event.id}
                  className="card pending-tile"
                  style={categoryAccentStyle(settings.colours[category])}
                  data-testid="pending-tile"
                  data-needs-type={needsType ? "true" : "false"}
                >
                  <Link className="pending-tile-link" href={`/events/${event.id}/edit`}>
                    <div className="pending-tile-top">
                      <p className="pending-kicker muted">
                        {needsType ? "Needs type" : updated ? "Updated" : "New"}
                      </p>
                      <span className="pending-cat">
                        <CategoryThumb category={category} size="sm" />
                        {CATEGORIES.includes(category) ? category : event.category}
                      </span>
                    </div>
                    <h3>{event.title}</h3>
                    <p className="pending-meta muted">
                      <span>{event.organisationName}</span>
                      <time dateTime={event.startsAt.toISOString()}>
                        {formatTimeRange(event.startsAt, event.endsAt)}
                      </time>
                    </p>
                    <p className="pending-place muted">
                      {event.online ? "Online" : place || "In person · place not listed"}
                    </p>
                    {event.externalUrl ? (
                      <p className="pending-ext" title={event.externalUrl}>
                        <span className="pending-ext-label">Event Link</span>
                        <span className="pending-ext-url">{eventLinkLabel(event.externalUrl)}</span>
                      </p>
                    ) : (
                      <p className="pending-ext pending-ext-empty muted">No event link yet</p>
                    )}
                  </Link>
                  {event.externalUrl ? (
                    <p className="pending-open-link">
                      <a href={event.externalUrl} target="_blank" rel="noreferrer">
                        Open listing
                      </a>
                    </p>
                  ) : null}
                  <PendingTileActions
                    eventId={event.id}
                    title={event.title}
                    category={CATEGORIES.includes(category) ? category : "Meetup"}
                    needsTypeReview={needsType}
                  />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
