import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { insightsScope } from "@/lib/policy";
import { parseInsightsParams, parseRecentDays, parseAttendanceSpan, nextSevenDaysWindow, pastSevenDaysWindow, insightsHref } from "@/lib/insights/period";
import { loadRawInsights } from "@/lib/insights/load";
import { aggregateInsights, kpisForRecentDays, pctLabel } from "@/lib/insights/aggregate";
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
import { formatDate, formatDateTimeRange } from "@/lib/time";
import { dayKeyOf, formatDayKey, formatDayLabel } from "@/lib/calendar";

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
          <Link href="/calendar">Back to calendar</Link>
        </p>
      </main>
    );
  }
  const filters = { ...requested, cellId: scope.kind === "cell" ? scope.cellId : requested.cellId };
  const feedbackExtra = parseFeedbackQuery(params);
  const now = new Date();
  const attendanceSpan = parseAttendanceSpan(params.attended);
  const kpiDays = parseRecentDays(params.kpi, 30);
  const attendanceWindow = attendanceSpan === "past" ? pastSevenDaysWindow(now) : nextSevenDaysWindow(now);
  const [raw, settings, attendedEvents, feedback] = await Promise.all([
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
    )
  ]);
  const data = aggregateInsights(raw, filters, scope);
  const kpiNumbers = kpisForRecentDays(raw, filters, kpiDays, now);
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
  const text = shareSummary(data, origin, filters);
  const firstName = user.name.trim().split(/\s+/)[0] || "Hello";
  const query: Record<string, string> = {
    period: filters.preset,
    category: filters.category,
    format: filters.format,
    cell: filters.cellId ?? "",
    rating: feedbackExtra.rating,
    q: feedbackExtra.q
  };

  return (
    <main className="stack">
      <div className="page-head insights-head">
        <h1>Insights</h1>
        <p className="lede">
          {firstName} — {scope.kind === "region" ? `${settings.locationLabel} region` : feedback.scopeLabel} ·{" "}
          {formatDate(filters.from)} to {formatDate(new Date(filters.to.getTime() - 1))}. Charts are totals. Groups of
          fewer than three people are hidden. Member feedback below shows ratings only — private notes stay with the
          person who wrote them.
        </p>
      </div>

      <section className="card stack insights-upcoming" id="people-attendance" aria-label="People attendance">
        <form className="row" method="get" action="#people-attendance">
          <input type="hidden" name="period" value={filters.preset} />
          <input type="hidden" name="kpi" value={String(kpiDays)} />
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
          {filters.cellId ? <input type="hidden" name="cell" value={filters.cellId} /> : null}
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

      <form className="row" id="insights-reach" method="get" action="#insights-reach">
        <input type="hidden" name="period" value={filters.preset} />
        <input type="hidden" name="attended" value={attendanceSpan} />
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
        {filters.cellId ? <input type="hidden" name="cell" value={filters.cellId} /> : null}
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
      <KpiStrip {...kpiNumbers} />

      <h2 className="insights-section-title">Activity</h2>
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

      <h2 className="insights-section-title">Who and where</h2>
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

      <h2 className="insights-section-title">Pipeline and capacity</h2>
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

      <section className="card feedback-hub" data-testid="insights-feedback">
        <h2>Member feedback</h2>
        <p className="muted">
          {feedback.scopeLabel}. After-event moods from people in your scope. Free-text notes are never shown here.
          Export “Member feedback” below for a spreadsheet.
        </p>
        <form className="insights-feedback-filters" method="get">
          <input type="hidden" name="period" value={filters.preset} />
          <input type="hidden" name="attended" value={attendanceSpan} />
          <input type="hidden" name="kpi" value={String(kpiDays)} />
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
          {filters.cellId ? <input type="hidden" name="cell" value={filters.cellId} /> : null}
          {filters.preset === "custom" ? (
            <>
              <input type="hidden" name="from" value={formatDayKey(dayKeyOf(filters.from))} />
              <input type="hidden" name="to" value={formatDayKey(dayKeyOf(new Date(filters.to.getTime() - 1)))} />
            </>
          ) : null}
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

      <ExportShare data={data} text={text} query={query} />
      <p className="muted">
        Bookmark this view: <Link href={insightsHref(filters)}>current filters</Link>.
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
