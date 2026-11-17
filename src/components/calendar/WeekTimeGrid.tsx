"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { categoryAccentStyle } from "@/lib/category-art";
import {
  dayKeyOf,
  eventFromCalendarHref,
  formatDayKey,
  formatDayLabel,
  newEventFromCalendarHref,
  sameDayKey,
  type DayKey
} from "@/lib/calendar";
import { formatWhereLine } from "@/lib/place";
import { formatTime } from "@/lib/time";
import { layoutCalendarDay } from "@/lib/calendar-layout";
import { CategoryThumb } from "@/components/CategoryThumb";

/** Dense Apple-like rows — readable blocks without towering empty hours. */
const PX_PER_HOUR = 48;

type GridEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  category: string;
  placeName: string | null;
  online: boolean;
};

function clockLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function slotHref(day: DayKey, minute: number, returnTo: string): string {
  const t = clockLabel(minute);
  return newEventFromCalendarHref(returnTo, day, t);
}

export function WeekTimeGrid({
  days,
  today,
  events,
  colours,
  canAdd,
  starredIds,
  returnTo,
  startMinute,
  endMinute
}: {
  days: DayKey[];
  today: DayKey;
  events: GridEvent[];
  colours: Record<string, string>;
  canAdd?: boolean;
  starredIds?: Set<string>;
  returnTo: string;
  startMinute: number;
  endMinute: number;
}) {
  const router = useRouter();
  const weekdayShort = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "Europe/London"
  });

  return (
    <div className="week-time-grid card" role="grid" aria-label="Week timetable" data-testid="week-time-grid">
      <div className="week-time-head" style={{ ["--week-cols" as string]: days.length }}>
        <div className="week-time-gutter" aria-hidden="true" />
        {days.map((day) => {
          const isToday = sameDayKey(day, today);
          const noon = new Date(Date.UTC(day.year, day.month - 1, day.day, 12));
          return (
            <div
              key={formatDayKey(day)}
              className="week-time-dayhead"
              aria-current={isToday ? "date" : undefined}
              data-today={isToday ? "true" : undefined}
            >
              <span className="week-time-weekday">{weekdayShort.format(noon)}</span>
              <span className="week-time-daynum">{day.day}</span>
              {canAdd ? (
                <Link className="day-add week-time-add" href={newEventFromCalendarHref(returnTo, day)} aria-label={`Add event on ${formatDayLabel(day)}`}>
                  Add
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="week-time-scroll">
        <div
          className="week-time-body"
          style={{ ["--week-cols" as string]: days.length, height: ((endMinute - startMinute) / 60) * PX_PER_HOUR }}
        >
          <div className="week-time-gutter" aria-hidden="true">
            {Array.from(
              { length: Math.ceil(endMinute / 60) - Math.floor(startMinute / 60) },
              (_, i) => Math.floor(startMinute / 60) + i
            ).map((hour) => {
              const slotStart = Math.max(startMinute, hour * 60);
              const slotEnd = Math.min(endMinute, (hour + 1) * 60);
              const height = ((slotEnd - slotStart) / 60) * PX_PER_HOUR;
              return (
                <div key={hour} className="week-time-hour" style={{ height }}>
                  <span>{clockLabel(slotStart)}</span>
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const dayEvents = events
              .filter((e) => sameDayKey(dayKeyOf(e.startsAt), day))
              .map((e) => ({ ...e, starred: Boolean(starredIds?.has(e.id)) }));
            const placements = new Map(
              layoutCalendarDay(dayEvents, day, startMinute, endMinute).map((placement) => [placement.id, placement])
            );
            const isToday = sameDayKey(day, today);
            return (
              <div
                key={formatDayKey(day)}
                className="week-time-col"
                data-today={isToday ? "true" : undefined}
              >
                {Array.from(
                  { length: Math.ceil(endMinute / 60) - Math.floor(startMinute / 60) },
                  (_, i) => Math.floor(startMinute / 60) + i
                ).map((hour) => {
                  const slotStart = Math.max(startMinute, hour * 60);
                  const slotEnd = Math.min(endMinute, (hour + 1) * 60);
                  const height = ((slotEnd - slotStart) / 60) * PX_PER_HOUR;
                  return (
                    <div
                      key={hour}
                      className="week-time-slot"
                      style={{ height }}
                      data-testid={canAdd ? `week-slot-${formatDayKey(day)}-${hour}` : undefined}
                      onDoubleClick={canAdd ? () => router.push(slotHref(day, slotStart, returnTo)) : undefined}
                      title={canAdd ? "Double-click to add an event" : undefined}
                    />
                  );
                })}
                {dayEvents.flatMap((event) => {
                  const placement = placements.get(event.id);
                  if (!placement) return [];
                  const colour = colours[event.category];
                  const showRange = placement.height >= 36;
                  const startLabel = formatTime(event.startsAt);
                  const endLabel = formatTime(event.endsAt);
                  return [(
                    <Link
                      key={event.id}
                      href={eventFromCalendarHref(event.id, returnTo)}
                      className="week-time-event"
                      title={`${startLabel}–${endLabel} ${event.title}`}
                      style={{
                        ...categoryAccentStyle(colour),
                        top: placement.top,
                        height: placement.height,
                        left: `calc(${placement.leftPct}% + 2px)`,
                        width: `calc(${placement.widthPct}% - 4px)`,
                        background: "var(--cat-mid)",
                        borderLeftColor: "var(--cat)"
                      }}
                    >
                      <span className="week-time-event-heading">
                        <CategoryThumb category={event.category} size="sm" />
                        <span className="week-time-event-title">
                        {event.starred ? "★ " : ""}
                        {event.title}
                        </span>
                      </span>
                      {showRange ? (
                        <span className="week-time-event-time">
                          {startLabel}–{endLabel} · {formatWhereLine(event.online, event.placeName)}
                        </span>
                      ) : null}
                    </Link>
                  )];
                })}
              </div>
            );
          })}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="muted week-time-empty">No events in this range. Try All types.</p>
      ) : null}
    </div>
  );
}
