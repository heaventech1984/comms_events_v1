"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { calendarHref, DEFAULT_CALENDAR_END_MINUTE, DEFAULT_CALENDAR_START_MINUTE, type CalendarState } from "@/lib/calendar";
import { requestJson } from "@/lib/fetch-json";
import { StatusBanner } from "@/components/StatusBanner";

function clockLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function CalendarTimeBand({ state }: { state: CalendarState }) {
  const router = useRouter();
  const [startMinute, setStartMinute] = useState(state.startMinute);
  const [endMinute, setEndMinute] = useState(state.endMinute);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    setStartMinute(state.startMinute);
    setEndMinute(state.endMinute);
  }, [state.startMinute, state.endMinute]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(async () => {
      const result = await requestJson("/api/calendar-preferences", {
        method: "POST",
        body: { startMinute, endMinute }
      });
      setError(result.ok ? null : result.error);
      if (result.ok) {
        dirty.current = false;
        router.refresh();
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [startMinute, endMinute, router]);

  function update(start: number, end: number) {
    dirty.current = true;
    setStartMinute(start);
    setEndMinute(end);
    setError(null);
    const nextUrl = new URL(calendarHref(state, { startMinute: start, endMinute: end }), window.location.origin);
    nextUrl.searchParams.set("fromMin", String(start));
    nextUrl.searchParams.set("toMin", String(end));
    router.replace(`${nextUrl.pathname}?${nextUrl.searchParams.toString()}`, { scroll: false });
  }

  const startPercent = ((startMinute - DEFAULT_CALENDAR_START_MINUTE) / 30) * (100 / 30);
  const endPercent = ((endMinute - DEFAULT_CALENDAR_START_MINUTE) / 30) * (100 / 30);

  return (
    <section className="calendar-time-band" aria-label="Calendar hours">
      <div className="calendar-time-band-heading">
        <div>
          <span className="muted">Showing hours</span>
          <strong>{clockLabel(startMinute)}–{clockLabel(endMinute)}</strong>
        </div>
        <button
          type="button"
          className="button ghost"
          onClick={() => update(DEFAULT_CALENDAR_START_MINUTE, DEFAULT_CALENDAR_END_MINUTE)}
          disabled={startMinute === DEFAULT_CALENDAR_START_MINUTE && endMinute === DEFAULT_CALENDAR_END_MINUTE}
        >
          Reset hours
        </button>
      </div>
      <div
        className="calendar-time-band-track"
        style={{ "--band-start": `${startPercent}%`, "--band-end": `${endPercent}%` } as CSSProperties}
      >
        <input
          aria-label="Show events from"
          type="range"
          min={DEFAULT_CALENDAR_START_MINUTE}
          max={endMinute - 30}
          step={30}
          value={startMinute}
          aria-valuetext={`From ${clockLabel(startMinute)}`}
          onChange={(event) => update(Number(event.target.value), endMinute)}
        />
        <input
          aria-label="Show events until"
          type="range"
          min={startMinute + 30}
          max={DEFAULT_CALENDAR_END_MINUTE}
          step={30}
          value={endMinute}
          aria-valuetext={`Until ${clockLabel(endMinute)}`}
          onChange={(event) => update(startMinute, Number(event.target.value))}
        />
      </div>
      <div className="calendar-time-band-labels" aria-hidden="true">
        <span>08:00</span><span>23:00</span>
      </div>
      <StatusBanner message={error} kind="error" />
    </section>
  );
}
