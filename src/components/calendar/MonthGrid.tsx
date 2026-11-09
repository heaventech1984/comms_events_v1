import Link from "next/link";
import {
  calendarHref,
  dayKeyOf,
  formatDayKey,
  formatDayLabel,
  sameDayKey,
  type CalendarState,
  type DayKey
} from "@/lib/calendar";

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
  canAdd
}: {
  state: CalendarState;
  days: DayKey[];
  today: DayKey;
  events: GridEvent[];
  colours: Record<string, string>;
  canAdd?: boolean;
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
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
