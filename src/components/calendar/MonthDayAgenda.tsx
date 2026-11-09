import Link from "next/link";
import { CategoryThumb } from "@/components/CategoryThumb";
import { categoryAccentStyle } from "@/lib/category-art";
import {
  dayKeyOf,
  formatDayKey,
  formatDayLabel,
  sameDayKey,
  type DayKey
} from "@/lib/calendar";
import { tidyPlaceName } from "@/lib/place";
import { formatTime } from "@/lib/time";

type AgendaEvent = {
  id: string;
  title: string;
  startsAt: Date;
  category: string;
  placeName: string | null;
  online: boolean;
  sourceKey?: string | null;
};

/** Full-title list for the selected month day (phone/tablet pattern from §16.9). */
export function MonthDayAgenda({
  day,
  today,
  events,
  colours,
  canAdd,
  starredIds
}: {
  day: DayKey;
  today: DayKey;
  events: AgendaEvent[];
  colours: Record<string, string>;
  canAdd?: boolean;
  starredIds?: Set<string>;
}) {
  const dayEvents = events
    .filter((e) => sameDayKey(dayKeyOf(e.startsAt), day))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <section className="month-day-agenda" data-testid="month-day-agenda" aria-label={`Events on ${formatDayLabel(day)}`}>
      <h3 className="month-day-agenda-heading">
        {formatDayLabel(day)}
        {sameDayKey(day, today) ? <span className="today-tag">Today</span> : null}
        {canAdd ? (
          <Link className="day-add heading-add" href={`/events/new?d=${formatDayKey(day)}`}>
            Add
          </Link>
        ) : null}
      </h3>
      {dayEvents.length === 0 ? (
        <p className="muted month-day-agenda-empty">No events on this day. Try All types, or pick another day.</p>
      ) : (
        <div className="list">
          {dayEvents.map((event) => (
            <Link
              key={event.id}
              className="card event-card"
              href={`/events/${event.id}`}
              style={categoryAccentStyle(colours[event.category])}
            >
              <CategoryThumb category={event.category} size="md" />
              <span className="event-card-body">
                <span className="event-card-meta">
                  <span className="swatch" style={{ background: colours[event.category] }} />
                  {event.category}
                  {starredIds?.has(event.id) ? (
                    <span className="event-row-star" title="Starred" aria-label="Starred">
                      ★
                    </span>
                  ) : null}
                </span>
                <span className="event-title">{event.title}</span>
                <span className="muted">
                  {formatTime(event.startsAt)} ·{" "}
                  {event.online ? "Online" : tidyPlaceName(event.placeName)}
                  {event.sourceKey ? " · From scrape" : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
