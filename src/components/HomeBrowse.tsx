import Link from "next/link";
import { HomeDashboard } from "@/components/HomeDashboard";
import { parseTypesParam } from "@/lib/calendar";
import { CATEGORIES, TAGS, type Category, type Tag } from "@/lib/constants";
import { parseTagsParam, tagsWhere, toggleTag } from "@/lib/tags";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dayKeyOf, formatDayKey, formatDayLabel } from "@/lib/calendar";
import { formatWhereLine } from "@/lib/place";
import { formatTime } from "@/lib/time";

const LIST_CAP = 50;

function browseHref(types: Category[], tags: Tag[]): string {
  const sp = new URLSearchParams();
  if (types.length) sp.set("types", types.join(","));
  if (tags.length) sp.set("tags", tags.join(","));
  const q = sp.toString();
  return q ? `/?${q}` : "/";
}

/** Signed-in Home: pick a kind, then browse upcoming events. */
export async function HomeBrowse({
  userId,
  typesParam,
  tagsParam,
  formatParam
}: {
  userId: string;
  typesParam?: string;
  tagsParam?: string;
  formatParam?: string;
}) {
  const categories = parseTypesParam(typesParam);
  let tags = parseTagsParam(tagsParam);
  if (!tags.length && formatParam === "online") tags = ["Online"];
  if (!tags.length && formatParam === "inperson") tags = ["In Person"];
  const selected = categories.length === 1 ? categories[0] : null;

  if (!categories.length) {
    return <HomeDashboard userId={userId} />;
  }

  const settings = await getSettings();
  const enabled = CATEGORIES.filter((c) => settings.enabled[c]);
  const allowed = categories.filter((c) => enabled.includes(c));
  const kindOff = categories.length > 0 && allowed.length === 0;

  const events =
    allowed.length === 0
      ? []
      : await prisma.event.findMany({
          where: {
            status: "PUBLISHED",
            startsAt: { gte: new Date() },
            category: { in: allowed },
            ...tagsWhere(tags)
          },
          orderBy: { startsAt: "asc" },
          take: LIST_CAP
        });

  const eventIds = events.map((e) => e.id);
  const stars =
    eventIds.length === 0
      ? []
      : await prisma.star.findMany({
          where: { userId, eventId: { in: eventIds } },
          select: { eventId: true }
        });
  const starred = new Set(stars.map((s) => s.eventId));

  const title = categories.length === 1 ? `${categories[0]} events` : "Events";
  const hitCap = events.length === LIST_CAP;

  return (
    <main className="search-page">
      <div className="page-head">
        <p>
          <Link href="/">Back to kinds</Link>
        </p>
        <h1>{title}</h1>
        <p className="lede">Tap a row to open the event. Attend is on the next screen.</p>
      </div>

      <div className="filters" role="group" aria-label="Tags">
        <Link className="chip" href={browseHref(categories, [])} aria-current={tags.length === 0 ? "true" : undefined}>
          All tags
        </Link>
        {TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <Link
              key={tag}
              className="chip"
              href={browseHref(categories, toggleTag(tags, tag))}
              aria-current={on ? "true" : undefined}
              aria-pressed={on}
            >
              {tag}
            </Link>
          );
        })}
      </div>

      {kindOff ? (
        <p className="muted">
          This kind is turned off for the calendar.{" "}
          <Link href="/">Choose another kind</Link>
          {" or "}
          <Link href="/calendar">open the calendar</Link>.
        </p>
      ) : events.length === 0 ? (
        <p className="muted">
          No upcoming events of this kind.{" "}
          <Link href="/">Try another kind</Link>
          {" or "}
          <Link href="/calendar">see the month</Link>.
        </p>
      ) : (
        <div className="event-day-groups">
          {(() => {
            const groups: { key: string; label: string; events: typeof events }[] = [];
            for (const event of events) {
              const day = dayKeyOf(event.startsAt);
              const key = formatDayKey(day);
              const last = groups[groups.length - 1];
              if (!last || last.key !== key) {
                groups.push({ key, label: formatDayLabel(day), events: [event] });
              } else {
                last.events.push(event);
              }
            }
            return groups.map((group) => (
              <section key={group.key} className="event-day-group">
                <h2 className="event-day-heading">{group.label}</h2>
                <ul className="event-row-list">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <Link className="event-row card" href={`/events/${event.id}`} title={event.title}>
                        <span className="event-row-body">
                          <span className="event-title">{event.title}</span>
                          <span className="muted">
                            {formatTime(event.startsAt)}
                            {" · "}
                            {formatWhereLine(event.online, event.placeName)}
                          </span>
                        </span>
                        {starred.has(event.id) ? (
                          <span className="event-row-star" title="Starred" aria-label="Starred">
                            ★
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ));
          })()}
        </div>
      )}

      {hitCap ? (
        <p className="muted search-kinds-foot">
          Showing the next {LIST_CAP}.{" "}
          <Link href="/calendar">See more on the calendar</Link>.
        </p>
      ) : null}

      {selected && !kindOff ? (
        <p className="muted search-kinds-foot">
          Looking for something else?{" "}
          <Link href="/">Choose another kind</Link>
        </p>
      ) : null}
    </main>
  );
}
