import Link from "next/link";
import { CategoryThumb } from "@/components/CategoryThumb";
import { categoryAccentStyle } from "@/lib/category-art";
import {
  calendarHref,
  dayKeyOf,
  formatDayKey,
  formatDayLabel,
  sameDayKey,
  type CalendarState,
  type DayKey
} from "@/lib/calendar";
import { formatTime } from "@/lib/time";

type GridEvent = { id: string; title: string; startsAt: Date; category: string };

function uniqueCategories(events: GridEvent[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const event of events) {
    if (seen.has(event.category)) continue;
    seen.add(event.category);
    out.push(event.category);
  }
  return out;
}

export function MonthGrid({
  state,
  days,
  today,
  events,
  colours,
  canAdd,
  starredIds
}: {
  state: CalendarState;
  days: DayKey[];
  today: DayKey;
  events: GridEvent[];
  colours: Record<string, string>;
  canAdd?: boolean;
  starredIds?: Set<string>;
}) {
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  return (
    <table className="calendar" data-testid="month-grid">
      <thead>
        <tr>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <th key={d} scope="col">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={formatDayKey(week[0])}>
            {week.map((day) => {
              const dayEvents = events.filter((e) => sameDayKey(dayKeyOf(e.startsAt), day));
              const outside = day.month !== state.anchor.month;
              const selected = sameDayKey(day, state.anchor);
              const cats = uniqueCategories(dayEvents);
              const cellClass = [outside ? "outside" : "", selected ? "day-selected" : ""]
                .filter(Boolean)
                .join(" ") || undefined;
              return (
                <td key={formatDayKey(day)} className={cellClass}>
                  <div className="day-cell-head">
                    <Link
                      className="daynum"
                      href={calendarHref(state, { view: "month", anchor: day })}
                      aria-label={`${formatDayLabel(day)}, ${dayEvents.length} events. Show day list.`}
                      aria-current={sameDayKey(day, today) ? "date" : undefined}
                      data-selected={selected ? "true" : undefined}
                    >
                      {day.day}
                    </Link>
                    {dayEvents.length > 0 ? (
                      <span className="month-day-count" aria-hidden="true">
                        {dayEvents.length}
                      </span>
                    ) : null}
                    {canAdd ? (
                      <Link className="day-add" href={`/events/new?d=${formatDayKey(day)}`} aria-label={`Add event on ${formatDayLabel(day)}`}>
                        Add
                      </Link>
                    ) : null}
                  </div>
                  {cats.length > 0 ? (
                    <div className="month-day-dots" aria-hidden="true">
                      {cats.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className="month-day-dot"
                          style={{ background: colours[cat] ?? "var(--accent)" }}
                        />
                      ))}
                      {cats.length > 3 ? <span className="month-day-more">+{cats.length - 3}</span> : null}
                    </div>
                  ) : null}
                  <div className="month-event-list">
                    {dayEvents.map((event) => {
                      const starred = starredIds?.has(event.id);
                      const labelText = `${formatTime(event.startsAt)} ${event.title}`;
                      return (
                        <Link
                          key={event.id}
                          className="event-link"
                          href={`/events/${event.id}`}
                          title={`${event.category}: ${labelText}${starred ? " (starred)" : ""}`}
                          style={categoryAccentStyle(colours[event.category])}
                        >
                          <CategoryThumb category={event.category} size="sm" />
                          <span className="sr-only">{event.category}: </span>
                          <span className="event-link-text">{labelText}</span>
                          {starred ? (
                            <span className="event-link-star" aria-label="Starred">
                              ★
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
