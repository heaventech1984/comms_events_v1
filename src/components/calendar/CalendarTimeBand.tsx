"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { calendarHref, DEFAULT_CALENDAR_END_MINUTE, DEFAULT_CALENDAR_START_MINUTE, type CalendarState } from "@/lib/calendar";
import { requestJson } from "@/lib/fetch-json";
import { StatusBanner } from "@/components/StatusBanner";

const STEP = 30;

function clockLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function percent(minute: number): number {
  return ((minute - DEFAULT_CALENDAR_START_MINUTE) / (DEFAULT_CALENDAR_END_MINUTE - DEFAULT_CALENDAR_START_MINUTE)) * 100;
}

function minuteFromClientX(clientX: number, rect: DOMRect): number {
  const ratio = rect.width <= 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const raw = DEFAULT_CALENDAR_START_MINUTE + ratio * (DEFAULT_CALENDAR_END_MINUTE - DEFAULT_CALENDAR_START_MINUTE);
  const stepped = Math.round(raw / STEP) * STEP;
  return Math.min(DEFAULT_CALENDAR_END_MINUTE, Math.max(DEFAULT_CALENDAR_START_MINUTE, stepped));
}

export function CalendarTimeBand({ state }: { state: CalendarState }) {
  const router = useRouter();
  const [startMinute, setStartMinute] = useState(state.startMinute);
  const [endMinute, setEndMinute] = useState(state.endMinute);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(startMinute);
  const endRef = useRef(endMinute);

  useEffect(() => {
    setStartMinute(state.startMinute);
    setEndMinute(state.endMinute);
    startRef.current = state.startMinute;
    endRef.current = state.endMinute;
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
    startRef.current = start;
    endRef.current = end;
    dirty.current = true;
    setStartMinute(start);
    setEndMinute(end);
    setError(null);
    const nextUrl = new URL(calendarHref(state, { startMinute: start, endMinute: end }), window.location.origin);
    nextUrl.searchParams.set("fromMin", String(start));
    nextUrl.searchParams.set("toMin", String(end));
    router.replace(`${nextUrl.pathname}?${nextUrl.searchParams.toString()}`, { scroll: false });
  }

  function drag(which: "start" | "end") {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const move = (pointer: PointerEvent) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return;
        const minute = minuteFromClientX(pointer.clientX, rect);
        if (which === "start") update(Math.min(minute, endRef.current - STEP), endRef.current);
        else update(startRef.current, Math.max(minute, startRef.current + STEP));
      };
      const stop = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", stop);
        handle.removeEventListener("pointercancel", stop);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
      handle.addEventListener("pointercancel", stop);
    };
  }

  function nudge(which: "start" | "end", delta: number) {
    if (which === "start") {
      const next = Math.min(endRef.current - STEP, Math.max(DEFAULT_CALENDAR_START_MINUTE, startRef.current + delta));
      update(next, endRef.current);
    } else {
      const next = Math.max(startRef.current + STEP, Math.min(DEFAULT_CALENDAR_END_MINUTE, endRef.current + delta));
      update(startRef.current, next);
    }
  }

  const startPercent = percent(startMinute);
  const endPercent = percent(endMinute);

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
        ref={trackRef}
        className="calendar-time-band-track"
        style={{ "--band-start": `${startPercent}%`, "--band-end": `${endPercent}%` } as CSSProperties}
      >
        <button
          type="button"
          className="calendar-time-band-thumb"
          style={{ left: `${startPercent}%` }}
          aria-label="Show events from"
          role="slider"
          aria-valuemin={DEFAULT_CALENDAR_START_MINUTE}
          aria-valuemax={endMinute - STEP}
          aria-valuenow={startMinute}
          aria-valuetext={`From ${clockLabel(startMinute)}`}
          onPointerDown={drag("start")}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") nudge("start", STEP);
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") nudge("start", -STEP);
            if (event.key === "Home") update(DEFAULT_CALENDAR_START_MINUTE, endRef.current);
            if (event.key === "End") update(endRef.current - STEP, endRef.current);
          }}
        />
        <button
          type="button"
          className="calendar-time-band-thumb"
          style={{ left: `${endPercent}%`, zIndex: 2 }}
          aria-label="Show events until"
          role="slider"
          aria-valuemin={startMinute + STEP}
          aria-valuemax={DEFAULT_CALENDAR_END_MINUTE}
          aria-valuenow={endMinute}
          aria-valuetext={`Until ${clockLabel(endMinute)}`}
          onPointerDown={drag("end")}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") nudge("end", STEP);
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") nudge("end", -STEP);
            if (event.key === "Home") update(startRef.current, startRef.current + STEP);
            if (event.key === "End") update(startRef.current, DEFAULT_CALENDAR_END_MINUTE);
          }}
        />
      </div>
      <div className="calendar-time-band-labels" aria-hidden="true">
        <span>08:00</span><span>23:00</span>
      </div>
      <StatusBanner message={error} kind="error" />
    </section>
  );
}
