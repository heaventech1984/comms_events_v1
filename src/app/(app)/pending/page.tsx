import Link from "next/link";
import { CategoryThumb } from "@/components/CategoryThumb";
import { PendingTileActions } from "@/components/PendingTileActions";
import { requireUser } from "@/lib/auth";
import { categoryAccentStyle } from "@/lib/category-art";
import { dayKeyOf, formatDayKey } from "@/lib/calendar";
import { CATEGORIES, type Category } from "@/lib/constants";
import { eventLinkLabel } from "@/lib/pending-copy";
import { loadOpenPendingEvents } from "@/lib/pending-time";
import { isUpdatedScrapedRow } from "@/lib/scraper/apply";
import { notesNeedTypeReview } from "@/lib/scraper/type-review";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTimeRange } from "@/lib/time";

export default async function PendingPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireUser(["admin", "cell leader"]);
  const settings = await getSettings();
  const sp = await searchParams;
  const needsTypeOnly = sp.filter === "needs-type";
  const allEvents = await loadOpenPendingEvents();
  const needsTypeCount = allEvents.filter((e) => notesNeedTypeReview(e.notes)).length;
  const events = needsTypeOnly
    ? allEvents.filter((e) => notesNeedTypeReview(e.notes))
    : allEvents;
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
  return (
    <main>
      <div className="page-head">
        <h1>Pending review</h1>
        <p className="lede">
          Scraped events still ahead (or on now), waiting for a cell leader or admin, grouped by day. Past ones leave
          this list automatically.
        </p>
        <p className="pending-filter-row" role="group" aria-label="Pending filters">
          <Link
            className="chip"
            href="/pending"
            aria-current={!needsTypeOnly ? "true" : undefined}
            data-on={!needsTypeOnly ? "true" : undefined}
          >
            All ({allEvents.length})
          </Link>
          <Link
            className="chip"
            href="/pending?filter=needs-type"
            aria-current={needsTypeOnly ? "true" : undefined}
            data-on={needsTypeOnly ? "true" : undefined}
            data-testid="pending-filter-needs-type"
          >
            Needs type ({needsTypeCount})
          </Link>
        </p>
      </div>
      {events.length === 0 ? (
        <p className="muted">
          {needsTypeOnly
            ? "No events still need a type confirm."
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
                      {/* Day is already in the section heading — show clocks only. */}
                      <time dateTime={event.startsAt.toISOString()}>
                        {formatTimeRange(event.startsAt, event.endsAt)}
                      </time>
                    </p>
                    {event.externalUrl ? (
                      <p className="pending-ext" title={event.externalUrl}>
                        <span className="pending-ext-label">Event Link</span>
                        <span className="pending-ext-url">{eventLinkLabel(event.externalUrl)}</span>
                      </p>
                    ) : (
                      <p className="pending-ext pending-ext-empty" aria-hidden="true" />
                    )}
                  </Link>
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
