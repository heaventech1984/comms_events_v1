import { dayKeyOf, sameDayKey, type DayKey } from "./calendar";
import { londonParts } from "./time";

export type CalendarTimedEvent = {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

export type CalendarPlacement = {
  id: string;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

const PX_PER_HOUR = 48;
const MIN_EVENT_HEIGHT = 28;

function minuteOfDay(date: Date): number {
  const parts = londonParts(date);
  return parts.hour * 60 + parts.minute;
}

function endMinuteOnStartDay(event: CalendarTimedEvent): number {
  const start = dayKeyOf(event.startsAt);
  const end = dayKeyOf(event.endsAt);
  const dayOffset = sameDayKey(start, end) ? 0 : 24 * 60;
  const startMinute = minuteOfDay(event.startsAt);
  let endMinute = minuteOfDay(event.endsAt) + dayOffset;
  if (endMinute <= startMinute) endMinute = startMinute + 60;
  return endMinute;
}

/** True when any part of an event falls inside the selected London clock-time band. */
export function eventOverlapsTimeBand(
  event: CalendarTimedEvent,
  startMinute: number,
  endMinute: number
): boolean {
  const eventStart = minuteOfDay(event.startsAt);
  return eventStart < endMinute && endMinuteOnStartDay(event) > startMinute;
}

type Prepared = CalendarPlacement & { startMinute: number; endMinute: number; lane: number };

function layoutOverlapGroup(group: Prepared[]): Prepared[] {
  const laneEnds: number[] = [];
  for (const event of group) {
    let lane = laneEnds.findIndex((end) => end <= event.startMinute);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(event.endMinute);
    } else {
      laneEnds[lane] = event.endMinute;
    }
    event.lane = lane;
  }

  const laneCount = Math.max(1, laneEnds.length);
  return group.map((event) => {
    let span = 1;
    while (event.lane + span < laneCount) {
      const nextLane = event.lane + span;
      const blocked = group.some(
        (other) =>
          other.lane === nextLane &&
          other.startMinute < event.endMinute &&
          other.endMinute > event.startMinute
      );
      if (blocked) break;
      span += 1;
    }
    return {
      ...event,
      leftPct: (event.lane / laneCount) * 100,
      widthPct: (span / laneCount) * 100
    };
  });
}

/** Lay out one day independently in connected groups of events that overlap in time. */
export function layoutCalendarDay(
  events: CalendarTimedEvent[],
  day: DayKey,
  bandStartMinute: number,
  bandEndMinute: number
): CalendarPlacement[] {
  const prepared = events
    .filter((event) => sameDayKey(dayKeyOf(event.startsAt), day))
    .map((event) => {
      const startMinute = Math.max(bandStartMinute, minuteOfDay(event.startsAt));
      const endMinute = Math.min(bandEndMinute, endMinuteOnStartDay(event));
      return {
        id: event.id,
        startMinute,
        endMinute,
        lane: 0,
        top: ((startMinute - bandStartMinute) / 60) * PX_PER_HOUR,
        height: Math.max(MIN_EVENT_HEIGHT, ((endMinute - startMinute) / 60) * PX_PER_HOUR),
        leftPct: 0,
        widthPct: 100
      };
    })
    .filter((event) => event.endMinute > event.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  const result: Prepared[] = [];
  let group: Prepared[] = [];
  let groupEnd = -Infinity;
  const flush = () => {
    if (group.length) result.push(...layoutOverlapGroup(group));
    group = [];
    groupEnd = -Infinity;
  };

  for (const event of prepared) {
    if (group.length && event.startMinute >= groupEnd) flush();
    group.push(event);
    groupEnd = Math.max(groupEnd, event.endMinute);
  }
  flush();

  return result.map(({ id, top, height, leftPct, widthPct }) => ({ id, top, height, leftPct, widthPct }));
}
