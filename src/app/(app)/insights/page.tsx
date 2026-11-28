import Link from "next/link";
import { Fragment } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { insightsScope } from "@/lib/policy";
import { parseInsightsParams, parseRecentDays, parseAttendanceSpan, nextSevenDaysWindow, pastSevenDaysWindow, insightsHref } from "@/lib/insights/period";
import { loadRawInsights } from "@/lib/insights/load";
import { aggregateInsights, cellAttendanceTable, kpisForRecentDays, pctLabel } from "@/lib/insights/aggregate";
import { shareSummary } from "@/lib/insights/share";
import {
  FEEDBACK_RATING_LABELS,
  feedbackFiltersFromInsights,
  loadFeedbackRows,
  parseFeedbackQuery
} from "@/lib/insights/feedback";
import { FEEDBACK_RATINGS } from "@/lib/constants";
import {
  ChartCard,
  FunnelList,
  Heatmap,
  KpiStrip,
  LineBars,
  NamedBars,
  Stacked
} from "@/components/insights/Charts";
import { ExportShare } from "@/components/insights/ExportShare";
import { formatDate, formatDateTimeRange, londonDate } from "@/lib/time";
import { addDaysKey, dayKeyOf, formatDayKey, formatDayLabel } from "@/lib/calendar";

export default async function InsightsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requested = parseInsightsParams(params);
  const scope = insightsScope(user, requested.cellId);
  if (!scope) {
    return (
      <main className="stack">
        <h1>Insights</h1>
        <p>Insights is for admins and cell leaders.</p>
        <p>
          <Link className="button" href="/calendar">Back to calendar</Link>
        </p>
      </main>
    );
  }
  const filters = { ...requested, cellId: scope.kind === "cell" ? scope.cellId : requested.cellId };
  const feedbackExtra = parseFeedbackQuery(params);
  const now = new Date();
  const attendanceSpan = parseAttendanceSpan(params.attended);
  const kpiDays = parseRecentDays(params.kpi, 30);
  const cellDays = parseRecentDays(params.cells, 30);
  const tab = parseInsightsTab(params.tab);
  const attendanceWindow = attendanceSpan === "past" ? pastSevenDaysWindow(now) : nextSevenDaysWindow(now);
  const [raw, settings, attendedEvents, feedback, cellList] = await Promise.all([
    loadRawInsights(scope, filters),
    getSettings(),
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt:
          attendanceSpan === "past"
            ? { gte: attendanceWindow.from, lte: attendanceWindow.to }
            : { gte: attendanceWindow.from, lt: attendanceWindow.to },
        bookings: {
          some: {
            ...(attendanceSpan === "past" ? { attendance: "ATTENDED" as const } : {}),
            ...(scope.kind === "cell" ? { user: { cellId: scope.cellId } } : {})
          }
        }
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        bookings: {
          where: {
            ...(attendanceSpan === "past" ? { attendance: "ATTENDED" as const } : {}),
            ...(scope.kind === "cell" ? { user: { cellId: scope.cellId } } : {})
          },
          select: { id: true, user: { select: { name: true, cellNumber: true } } },
          orderBy: { user: { name: "asc" } }
        }
      },
      orderBy: { startsAt: attendanceSpan === "past" ? "desc" : "asc" }
    }),
    loadFeedbackRows(
      scope,
      feedbackFiltersFromInsights(
        { from: filters.from, to: filters.to, category: filters.category, cellId: filters.cellId },
        feedbackExtra
      )
    ),
    prisma.cell.findMany({
      where: scope.kind === "cell" ? { id: scope.cellId } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);
  const cellAttendance = cellAttendanceTable(raw, filters, cellDays, cellList, now);
  const cellStartKey = addDaysKey(dayKeyOf(now), -(cellDays - 1));
  const cellEndKey = addDaysKey(dayKeyOf(now), 1);
  const cellFrom = londonDate(cellStartKey.year, cellStartKey.month, cellStartKey.day, 0, 0);
  const cellTo = londonDate(cellEndKey.year, cellEndKey.month, cellEndKey.day, 0, 0);
  const eventById = new Map(raw.events.map((event) => [event.id, event]));
  const cellAttendanceDetails = new Map<string, { title: string; startsAt: Date; people: { name: string; cell: string }[] }[]>();
  for (const booking of raw.bookings) {
    if (booking.attendance !== "ATTENDED") continue;
    const event = eventById.get(booking.eventId);
    if (
      !event ||
      event.status !== "PUBLISHED" ||
      event.startsAt < cellFrom ||
      event.startsAt >= cellTo ||
      (filters.category && event.category !== filters.category) ||
      (filters.format === "online" && !event.online) ||
      (filters.format === "inperson" && event.online)
    ) continue;
    const rows = cellAttendanceDetails.get(booking.userCellId ?? "none") ?? [];
    let item = rows.find((row) => row.title === event.title && row.startsAt.getTime() === event.startsAt.getTime());
    if (!item) {
      item = { title: event.title, startsAt: event.startsAt, people: [] };
      rows.push(item);
    }
    item.people.push({ name: booking.userName ?? booking.userId, cell: booking.cellName });
    cellAttendanceDetails.set(booking.userCellId ?? "none", rows);
  }
  for (const rows of cellAttendanceDetails.values()) rows.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const data = aggregateInsights(raw, filters, scope);
  const kpiNumbers = kpisForRecentDays(raw, filters, kpiDays, now);
  type KpiBreakdown = { cells: { label: string; value: string }[]; members: { label: string; cell: string; value: string }[] };
  const kpiDetails: Record<string, KpiBreakdown> = {};
  const detailFromBookings = (rows: typeof raw.bookings, uniqueEvents = false): KpiBreakdown => {
    const cellCounts = new Map<string, number>();
    const memberCounts = new Map<string, { cell: string; count: number }>();
    const seen = new Set<string>();
    for (const booking of rows) {
      const uniqueKey = `${booking.userId}:${booking.eventId}`;
      if (uniqueEvents && seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      cellCounts.set(booking.cellName, (cellCounts.get(booking.cellName) ?? 0) + 1);
      const current = memberCounts.get(booking.userId) ?? { cell: booking.cellName, count: 0 };
      current.count += 1;
      memberCounts.set(booking.userId, current);
    }
    return {
      cells: [...cellCounts].map(([label, count]) => ({ label, value: String(count) })).sort((a, b) => a.label.localeCompare(b.label)),
      members: [...memberCounts].map(([id, value]) => ({ label: rows.find((b) => b.userId === id)?.userName ?? id, cell: value.cell, value: String(value.count) })).sort((a, b) => a.label.localeCompare(b.label))
    };
  };
  const kpiFrom = new Date(now.getTime() - kpiDays * 24 * 60 * 60 * 1000);
  const kpiEvents = raw.events.filter((event) => event.status === "PUBLISHED" && event.startsAt >= kpiFrom && event.startsAt <= now && (!filters.category || event.category === filters.category) && (!filters.format || (filters.format === "online" ? event.online : !event.online)));
  const kpiEventIds = new Set(kpiEvents.map((event) => event.id));
  const kpiBookings = raw.bookings.filter((booking) => kpiEventIds.has(booking.eventId));
  const byEvent = new Map(kpiEvents.map((event) => [event.id, event]));
  const pastBookings = kpiBookings.filter((booking) => (byEvent.get(booking.eventId)?.endsAt ?? now) < now);
  const attendeeRows = (rows: typeof raw.bookings) => detailFromBookings(rows);
  kpiDetails["Published events"] = detailFromBookings(kpiBookings, true);
  kpiDetails["Attend clicks"] = attendeeRows(kpiBookings);
  const loggedInMembers = raw.members.filter((member) => member.active && (member.role ?? "member") === "member" && member.lastLoginAt && member.lastLoginAt >= kpiFrom && member.lastLoginAt <= now);
  const loginBreakdown = (members: typeof loggedInMembers): KpiBreakdown => {
    const cells = new Map<string, number>();
    for (const member of members) {
      const cellName = member.cellName ?? "Unassigned";
      cells.set(cellName, (cells.get(cellName) ?? 0) + 1);
    }
    return {
      cells: [...cells].map(([label, count]) => ({ label, value: String(count) })).sort((a, b) => a.label.localeCompare(b.label)),
      members: members.map((member) => ({ label: member.name ?? member.id, cell: member.cellName ?? "Unassigned", value: `last login ${member.lastLoginAt?.toLocaleDateString("en-GB", { timeZone: "Europe/London" }) ?? ""}` })).sort((a, b) => a.label.localeCompare(b.label))
    };
  };
  kpiDetails["Members logged in"] = loginBreakdown(loggedInMembers);
  kpiDetails["Members logged in %"] = loginBreakdown(loggedInMembers);
  const starRows = raw.stars.filter((star) => kpiEventIds.has(star.eventId));
  kpiDetails.Stars = {
    cells: [...starRows.reduce((map, star) => { const name = star.cellName ?? "Unassigned"; return map.set(name, (map.get(name) ?? 0) + 1); }, new Map<string, number>())].map(([label, count]) => ({ label, value: String(count) })).sort((a, b) => a.label.localeCompare(b.label)),
    members: starRows.map((star) => ({ label: star.userName ?? star.userId ?? "Member", cell: star.cellName ?? "Unassigned", value: "1 star" })).sort((a, b) => a.label.localeCompare(b.label))
  };
  const confirmedBookings = pastBookings.filter((booking) => booking.attendance === "ATTENDED" || booking.attendance === "ABSENT");
  kpiDetails.Attendance = attendeeRows(pastBookings.filter((booking) => booking.attendance === "ATTENDED"));
  kpiDetails.Confirmed = attendeeRows(confirmedBookings);
  kpiDetails["No-shows"] = attendeeRows(pastBookings.filter((booking) => booking.attendance === "ABSENT"));
  kpiDetails["Average fill"] = attendeeRows(kpiBookings.filter((booking) => (byEvent.get(booking.eventId)?.capacity ?? 0) > 0));
  kpiDetails["Booked for others"] = attendeeRows(kpiBookings.filter((booking) => booking.bookedById !== booking.userId));
  const attendedGroups = new Map<string, { label: string; events: typeof attendedEvents }>();
  for (const event of attendedEvents) {
    const key = formatDayKey(dayKeyOf(event.startsAt));
    const group = attendedGroups.get(key) ?? { label: formatDayLabel(dayKeyOf(event.startsAt)), events: [] };
    group.events.push(event);
    attendedGroups.set(key, group);
  }
  const attendedByDay = [...attendedGroups.entries()].sort((a, b) =>
    attendanceSpan === "past" ? (a[0] < b[0] ? 1 : -1) : a[0] < b[0] ? -1 : 1
  );
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const peopleAttendees = attendedEvents.reduce((total, event) => total + event.bookings.length, 0);
  const text = shareSummary(data, origin, filters, tab, {
    loggedIn: kpiNumbers.activeMembers,
    memberTotal: kpiNumbers.totalMembers,
    memberPercent: kpiNumbers.activeMemberPercent,
    eventsPublished: kpiNumbers.eventsPublished,
    attendClicks: kpiNumbers.attendClicks,
    peopleEvents: attendedEvents.length,
    peopleAttendees,
    cells: cellAttendance.rows.filter((row) => !row.suppressed && row.total > 0).length,
    feedbackTotal: feedback.summary.total
  });
  const firstName = user.name.trim().split(/\s+/)[0] || "Hello";
  const query: Record<string, string> = {
    period: filters.preset,
    category: filters.category,
    format: filters.format,
    cell: filters.cellId ?? "",
    rating: feedbackExtra.rating,
    q: feedbackExtra.q,
    tab,
    kpi: String(kpiDays),
    cells: String(cellDays),
    attended: attendanceSpan
  };
  const kept = (omit: Array<"attended" | "kpi" | "cells" | "rating" | "q"> = []) => (
    <>
      <input type="hidden" name="period" value={filters.preset} />
      <input type="hidden" name="tab" value={tab} />
      {omit.includes("attended") ? null : <input type="hidden" name="attended" value={attendanceSpan} />}
      {omit.includes("kpi") ? null : <input type="hidden" name="kpi" value={String(kpiDays)} />}
      {omit.includes("cells") ? null : <input type="hidden" name="cells" value={String(cellDays)} />}
      {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
      {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
      {filters.cellId ? <input type="hidden" name="cell" value={filters.cellId} /> : null}
      {omit.includes("rating") || !feedbackExtra.rating ? null : <input type="hidden" name="rating" value={feedbackExtra.rating} />}
      {omit.includes("q") || !feedbackExtra.q ? null : <input type="hidden" name="q" value={feedbackExtra.q} />}
      {filters.preset === "custom" ? (
        <>
          <input type="hidden" name="from" value={formatDayKey(dayKeyOf(filters.from))} />
          <input type="hidden" name="to" value={formatDayKey(dayKeyOf(new Date(filters.to.getTime() - 1)))} />
        </>
      ) : null}
    </>
  );

  return (
    <main className="stack">
      <div className="page-head insights-head">
        <h1>Insights</h1>
        <p className="lede">
          {firstName} — {scope.kind === "region" ? `${settings.locationLabel} region` : feedback.scopeLabel} ·{" "}
          {formatDate(filters.from)} to {formatDate(new Date(filters.to.getTime() - 1))}. Charts are totals. Groups of
          fewer than three people are hidden. Member feedback shows ratings only — private notes stay with the
          person who wrote them.
        </p>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Insights sections">
        {INSIGHT_TABS.map((item) => (
          <Link
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className="view-tab"
            href={insightsHref(filters, {
              tab: item.id,
              attended: attendanceSpan,
              kpi: String(kpiDays),
              cells: String(cellDays),
              rating: feedbackExtra.rating,
              q: feedbackExtra.q
            })}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "people" ? (
      <section className="card stack insights-upcoming" id="people-attendance" aria-label="People attendance">
        <form className="row" method="get" action="#people-attendance">
          {kept(["attended"])}
          <h2>People attendance</h2>
          <label>
            Show
            <select name="attended" defaultValue={attendanceSpan}>
              <option value="next">Next 7 days</option>
              <option value="past">Past 7 days</option>
            </select>
          </label>
          <button type="submit">Show</button>
        </form>
        {attendedByDay.length ? (
          attendedByDay.map(([key, group]) => (
            <section key={key} className="attendance-day">
              <h3 className="attendance-day-heading">{group.label}</h3>
              <ul className="insights-upcoming-list">
                {group.events.map((event) => (
                  <li key={event.id}>
                    <p><Link href={`/events/${event.id}`}>{event.title}</Link></p>
                    <p className="muted">{formatDateTimeRange(event.startsAt, event.endsAt)}</p>
                    <ul className="attendee-list">
                      {event.bookings.map((booking) => (
                        <li key={booking.id}>
                          {booking.user.name} <span className="muted">· {booking.user.cellNumber}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="muted">
            {attendanceSpan === "past"
              ? "Nobody is marked as having gone in the past 7 days."
              : "Nobody has clicked Attend in the next 7 days."}
          </p>
        )}
      </section>
      ) : null}

      {tab === "reach" ? (
      <>
      <form className="row" id="insights-reach" method="get" action="#insights-reach">
        {kept(["kpi"])}
        <label>
          Reach, showing up, and room
          <select name="kpi" defaultValue={String(kpiDays)}>
            <option value="7">Past 7 days</option>
            <option value="30">Past 30 days</option>
            <option value="90">Past 90 days</option>
          </select>
        </label>
        <button type="submit">Show</button>
      </form>
      <KpiStrip {...kpiNumbers} details={kpiDetails} />
      </>
      ) : null}

      {tab === "activity" ? (
      <>
      <section className="card stack" id="cell-attendance" aria-label="Events attended by cell">
        <form className="row" method="get" action="#cell-attendance">
          {kept(["cells"])}
          <h2>Events attended by cell</h2>
          <label>
            Show
            <select name="cells" defaultValue={String(cellDays)}>
              <option value="7">Past 7 days</option>
              <option value="30">Past 30 days</option>
              <option value="90">Past 90 days</option>
            </select>
          </label>
          <button type="submit">Show</button>
        </form>
        <p className="muted">
          Each number is events that cell went to. Past 7 days is one column per day, past 30 per week, and past 90 per month.
        </p>
        <CellHeatTable table={cellAttendance} details={cellAttendanceDetails} />
      </section>
      <ChartCard
        title="Attend clicks each week"
        summary="Attend clicks (people tapping Attend). Solid berry = this period; dashed grey = the same length before it."
        table={<WeekTable weeks={data.weeks} />}
      >
        <LineBars weeks={data.weeks} previous={data.previousWeeks} />
      </ChartCard>

      <ChartCard
        title="Attendance outcomes"
        summary="People counted once per booking: Attended, Didn’t, or still Unconfirmed — by the week the event started."
        table={<WeekTable weeks={data.weeks} outcomes />}
      >
        <Stacked weeks={data.weeks} />
      </ChartCard>
      </>
      ) : null}

      {tab === "where" ? (
      <>
      <ChartCard
        title="By event type"
        summary="Attend clicks in this period, coloured as on the calendar."
        table={<CountTable rows={data.byCategory} />}
      >
        <NamedBars rows={data.byCategory} colours={settings.colours} />
      </ChartCard>

      <ChartCard
        title="Online and in person"
        summary="Attend clicks split by format."
        table={<CountTable rows={data.byFormat} />}
      >
        <NamedBars rows={data.byFormat} />
      </ChartCard>

      {scope.kind === "region" ? (
        <ChartCard
          title="By cell"
          summary="A cell with fewer than three people is shown as fewer than 3, so no one can be singled out."
          table={<CountTable rows={data.byCell} />}
        >
          <NamedBars rows={data.byCell} />
        </ChartCard>
      ) : null}

      <ChartCard
        title="When events happen"
        summary="Published events in this period, by weekday and time of day (Europe/London)."
        table={<HeatTable cells={data.heatmap} />}
      >
        <Heatmap cells={data.heatmap} />
      </ChartCard>
      </>
      ) : null}

      {tab === "pipeline" ? (
      <>
      <ChartCard
        title="Review pipeline"
        summary="Scraped events created in this period, and where they ended up. Failed feeds on a run are listed below."
        table={
          <CountTable
            rows={[
              { key: "s", label: "Scraped", count: data.funnel.scraped },
              { key: "p", label: "Pending", count: data.funnel.pending },
              { key: "u", label: "Published", count: data.funnel.published },
              { key: "d", label: "Discarded", count: data.funnel.discarded }
            ]}
          />
        }
      >
        <FunnelList {...data.funnel} />
        {data.scraperRuns.length ? (
          <ul className="muted">
            {data.scraperRuns.slice(0, 5).map((run) => (
              <li key={run.startedAt}>
                {run.trigger.toLowerCase()} · created {run.createdCount} · {run.status}
                {run.failedFeeds ? ` · ${run.failedFeeds} feed${run.failedFeeds === 1 ? "" : "s"} failed` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </ChartCard>

      <section className="card">
        <h2>Busiest events</h2>
        <p className="muted">Fill is bookings ÷ capacity for that event (— if no cap).</p>
        {data.topEvents.length === 0 ? (
          <p className="muted">No published events in this period.</p>
        ) : (
          <div className="table-wrap">
            <table className="data stack-sm">
              <thead>
                <tr>
                  <th>Event</th>
                  <th className="num">Bookings</th>
                  <th className="num">Fill</th>
                  <th className="num">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data.topEvents.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Event">
                      <Link href={`/events/${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="num" data-label="Bookings">
                      {e.bookings}
                      {e.capacity != null ? ` / ${e.capacity}` : ""}
                    </td>
                    <td className="num" data-label="Fill">
                      {pctLabel(e.fillPct)}
                    </td>
                    <td className="num" data-label="Attendance">
                      {pctLabel(e.attendancePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </>
      ) : null}

      {tab === "feedback" ? (
      <section className="card feedback-hub" id="insights-feedback" data-testid="insights-feedback">
        <h2>Member feedback</h2>
        <p className="muted">
          {feedback.scopeLabel}. After-event moods from people in your scope. Free-text notes are never shown here.
          Export “Member feedback” below for a spreadsheet.
        </p>
        <form className="insights-feedback-filters" method="get" action="#insights-feedback">
          {kept(["rating", "q"])}
          <label>
            Feedback rating
            <select name="rating" defaultValue={feedbackExtra.rating}>
              <option value="">Any rating</option>
              {FEEDBACK_RATINGS.map((rating) => (
                <option key={rating} value={rating}>{FEEDBACK_RATING_LABELS[rating]}</option>
              ))}
            </select>
          </label>
          <label>
            Find in feedback
            <input type="search" name="q" defaultValue={feedbackExtra.q} placeholder="Member or event" autoComplete="off" />
          </label>
          <button type="submit">Apply</button>
        </form>
        <ul className="feedback-summary" aria-label="Feedback totals">
          <li>
            <strong>{feedback.summary.total}</strong> ratings
          </li>
          {FEEDBACK_RATINGS.map((r) => (
            <li key={r}>
              <strong>{feedback.summary.byRating[r]}</strong> {FEEDBACK_RATING_LABELS[r]}
            </li>
          ))}
        </ul>
        {feedback.rows.length === 0 ? (
          <p className="muted">
            {feedbackExtra.rating || feedbackExtra.q || filters.category
              ? "Nothing matches these feedback filters. Try Any rating or clear the search."
              : scope.kind === "cell"
                ? "Nobody in your cell has rated an event in this period yet."
                : "No ratings in this period yet."}
          </p>
        ) : (
          <div className="table-wrap feedback-table-wrap">
            <table className="data stack-sm">
              <thead>
                <tr>
                  <th>When rated</th>
                  <th>Rating</th>
                  <th>Member</th>
                  <th>Cell</th>
                  <th>Event</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {feedback.rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="When rated">{row.createdAt}</td>
                    <td data-label="Rating">{row.ratingLabel}</td>
                    <td data-label="Member">{row.memberName}</td>
                    <td data-label="Cell">{row.cellName}</td>
                    <td data-label="Event">
                      <Link href={`/events/${row.eventId}`}>{row.eventTitle}</Link>
                    </td>
                    <td data-label="Type">{row.eventCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

      <ExportShare data={data} text={text} query={query} tab={tab} />
      <p className="muted">
        Bookmark this view:{" "}
        <Link href={insightsHref(filters, {
          tab,
          attended: attendanceSpan,
          kpi: String(kpiDays),
          cells: String(cellDays),
          rating: feedbackExtra.rating,
          q: feedbackExtra.q
        })}>current filters</Link>.
      </p>
    </main>
  );
}

function WeekTable({ weeks, outcomes }: { weeks: { weekStart: string; attendClicks: number; attended: number; absent: number; unconfirmed: number }[]; outcomes?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="data stack-sm">
        <thead>
          <tr>
            <th>Week starting</th>
            {outcomes ? (
              <>
                <th className="num">Attended</th>
                <th className="num">Didn't attend</th>
                <th className="num">Unconfirmed</th>
              </>
            ) : (
              <th className="num">Attend clicks</th>
            )}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.weekStart}>
              <td data-label="Week">{w.weekStart}</td>
              {outcomes ? (
                <>
                  <td className="num">{w.attended}</td>
                  <td className="num">{w.absent}</td>
                  <td className="num">{w.unconfirmed}</td>
                </>
              ) : (
                <td className="num">{w.attendClicks}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountTable({ rows }: { rows: { key: string; label: string; count: number; suppressed?: boolean }[] }) {
  return (
    <div className="table-wrap">
      <table className="data stack-sm">
        <thead>
          <tr>
            <th>Group</th>
            <th className="num">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.suppressed ? `${r.label} (fewer than 3 people)` : r.label}</td>
              <td className="num">{r.suppressed ? "<3" : r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeatTable({ cells }: { cells: { weekday: number; hourBucket: number; count: number }[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["00–03", "04–07", "08–11", "12–15", "16–19", "20–23"];
  return (
    <div className="table-wrap">
      <table className="data stack-sm">
        <thead>
          <tr>
            <th>Day</th>
            <th>Hours</th>
            <th className="num">Events</th>
          </tr>
        </thead>
        <tbody>
          {cells
            .filter((c) => c.count)
            .map((c) => (
              <tr key={`${c.weekday}-${c.hourBucket}`}>
                <td>{days[c.weekday]}</td>
                <td>{hours[c.hourBucket]}</td>
                <td className="num">{c.count}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const INSIGHT_TABS = [
  { id: "people", label: "People" },
  { id: "reach", label: "Reach" },
  { id: "activity", label: "Activity" },
  { id: "where", label: "Who and where" },
  { id: "pipeline", label: "Pipeline" },
  { id: "feedback", label: "Feedback" }
] as const;

function parseInsightsTab(value: string | undefined): (typeof INSIGHT_TABS)[number]["id"] {
  if (INSIGHT_TABS.some((item) => item.id === value)) return value as (typeof INSIGHT_TABS)[number]["id"];
  return "people";
}

function CellHeatTable({
  table,
  details
}: {
  table: ReturnType<typeof cellAttendanceTable>;
  details: Map<string, { title: string; startsAt: Date; people: { name: string; cell: string }[] }[]>;
}) {
  if (!table.rows.length) return <p className="muted">No cells to show.</p>;
  return (
    <>
      <div className="table-wrap">
        <table className="cell-attendance">
          <thead>
            <tr>
              <th>Cell</th>
              {table.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => {
              const events = details.get(row.key) ?? [];
              return <Fragment key={row.key}>
                <tr>
                  <th scope="row">{row.suppressed ? `${row.label} (fewer than 3 people)` : row.label}</th>
                  {row.suppressed ? (
                    <td className="muted" colSpan={table.columns.length}>fewer than 3</td>
                  ) : (
                    row.counts.map((count, index) => {
                      const strength = table.max > 0 ? count / table.max : 0;
                      return <td key={table.columns[index].key} className="cell-heat" style={{ background: `rgba(168, 67, 77, ${0.08 + strength * 0.8})`, color: strength >= 0.55 ? "#fff" : undefined }}>{count}</td>;
                    })
                  )}
                </tr>
                {!row.suppressed && events.length ? <tr><td colSpan={table.columns.length + 1}>
                  <details><summary>Show attended events and members ({events.length})</summary>
                    <ul>{events.map((event) => <li key={`${event.title}-${event.startsAt.toISOString()}`}>
                      <strong>{event.title}</strong> <span className="muted">· {formatDate(event.startsAt)}</span>
                      <ul>{[...new Map(event.people.map((person) => [person.name, person])).values()].sort((a, b) => a.name.localeCompare(b.name)).map((person) => <li key={person.name}>{person.name}</li>)}</ul>
                    </li>)}</ul>
                  </details>
                </td></tr> : null}
              </Fragment>;
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">Pale means fewer. Berry means more. The fullest square is {table.max}.</p>
    </>
  );
}
