import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { insightsScope } from "@/lib/policy";
import { writeAudit } from "@/lib/audit";
import { parseInsightsParams } from "@/lib/insights/period";
import { loadAttendeeRows, loadRawInsights } from "@/lib/insights/load";
import { aggregateInsights } from "@/lib/insights/aggregate";
import { summaryLines, tablesFor } from "@/lib/insights/format";
import {
  feedbackExportTable,
  feedbackFiltersFromInsights,
  loadFeedbackRows,
  parseFeedbackQuery
} from "@/lib/insights/feedback";
import { DATASETS, EXPORT_FORMATS, type Dataset, type ExportFormat } from "@/lib/insights/types";
import { toCsv, toJson, toTxt, toXlsx } from "@/lib/export-format";
import { kpisForRecentDays, cellAttendanceTable } from "@/lib/insights/aggregate";
import { parseRecentDays, parseAttendanceSpan, nextSevenDaysWindow, pastSevenDaysWindow } from "@/lib/insights/period";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const scope = insightsScope(user, body.cell);
  if (!scope) return NextResponse.json({ error: "You cannot export insights." }, { status: 403 });
  const dataset = DATASETS.includes(body.dataset as Dataset) ? (body.dataset as Dataset) : "summary";
  const format = EXPORT_FORMATS.includes(body.format as ExportFormat) ? (body.format as ExportFormat) : "csv";
  const filters = parseInsightsParams(body);
  const feedbackExtra = parseFeedbackQuery(body);
  const raw = await loadRawInsights(scope, filters);
  const data = aggregateInsights(raw, filters, scope);
  const tab = body.tab ?? "reach";
  if (dataset === "currentTab" || tab === "reach") {
    data.kpis = kpisForRecentDays(raw, filters, parseRecentDays(body.kpi, 30));
  }
  const eventIds = raw.events
    .filter((e) => e.status === "PUBLISHED" && e.startsAt >= filters.from && e.startsAt < filters.to)
    .map((e) => e.id);
  let selectedAttendeeIds = eventIds;
  if (dataset === "currentTab" && tab === "people") {
    const span = parseAttendanceSpan(body.attended);
    const window = span === "past" ? pastSevenDaysWindow(new Date()) : nextSevenDaysWindow(new Date());
    const peopleEvents = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: span === "past" ? { gte: window.from, lte: window.to } : { gte: window.from, lt: window.to },
        bookings: { some: { ...(span === "past" ? { attendance: "ATTENDED" } : {}), ...(scope.kind === "cell" ? { user: { cellId: scope.cellId } } : {}) } }
      },
      select: { id: true }
    });
    selectedAttendeeIds = peopleEvents.map((event) => event.id);
  }
  const attendeeRows =
    dataset === "attendees" || dataset === "everything" || (dataset === "currentTab" && tab === "people")
      ? (await loadAttendeeRows(scope, dataset === "currentTab" && tab === "people" ? selectedAttendeeIds : eventIds)).map((r) => [
          r.event,
          r.when,
          r.name,
          r.cellNumber,
          r.cell,
          r.attendance,
          r.bookedBy
        ])
      : [];
  const feedbackRows =
      dataset === "feedback" || dataset === "everything" || (dataset === "currentTab" && tab === "feedback")
      ? (
          await loadFeedbackRows(
            scope,
            feedbackFiltersFromInsights(
              { from: filters.from, to: filters.to, category: filters.category, cellId: filters.cellId },
              feedbackExtra
            )
          )
        ).rows
      : [];
  let tables = tablesFor(data, dataset === "currentTab" ? "everything" : dataset, attendeeRows, feedbackExportTable(feedbackRows));
  if (dataset === "currentTab") {
    if (tab === "reach") tables = tables.filter((table) => table.name === "Summary");
    else if (tab === "people") tables = [{ name: "People attendance", columns: ["Event", "When", "Member", "Cell number", "Cell", "Attendance", "Booked by"], rows: attendeeRows }];
    else if (tab === "activity") {
      const cells = await prisma.cell.findMany({ where: scope.kind === "cell" ? { id: scope.cellId } : undefined, select: { id: true, name: true }, orderBy: { name: "asc" } });
      const attendance = cellAttendanceTable(raw, filters, parseRecentDays(body.cells, 30) as 7 | 30 | 90, cells);
      tables = [
        ...tables.filter((table) => table.name === "Weekly trend" || table.name === "Per-event attendance"),
        { name: "Events attended by cell", columns: ["Cell", ...attendance.columns.map((column) => column.label)], rows: attendance.rows.map((row) => [row.suppressed ? `${row.label} (fewer than 3)` : row.label, ...(row.suppressed ? attendance.columns.map(() => "<3") : row.counts)]) }
      ];
    } else if (tab === "where") tables = tables.filter((table) => table.name === "By event type" || table.name === "By format" || table.name === "By cell");
    else if (tab === "feedback") tables = tables.filter((table) => table.name === "Member feedback");
    else if (tab === "pipeline") tables = [
      { name: "Review pipeline", columns: ["Measure", "Count"], rows: [["Scraped", data.funnel.scraped], ["Pending", data.funnel.pending], ["Published", data.funnel.published], ["Discarded", data.funnel.discarded]] },
      { name: "Scraper runs", columns: ["Started", "Trigger", "Created", "Status", "Failed feeds"], rows: data.scraperRuns.map((run) => [run.startedAt, run.trigger, run.createdCount, run.status, run.failedFeeds]) }
    ];
  }
  const stamp = data.generatedAt.slice(0, 10);
  const filename = `gather-insights-${dataset}-${stamp}.${format}`;
  let buffer: Buffer;
  let type: string;
  if (format === "csv") {
    const csv = dataset === "currentTab" ? tables.map((table) => `# ${table.name}\n${toCsv(table)}`).join("\n\n") : toCsv(tables[0]);
    buffer = Buffer.from(csv, "utf8");
    type = "text/csv; charset=utf-8";
  } else if (format === "txt") {
    buffer = Buffer.from(toTxt("Gather insights", summaryLines(data), tables), "utf8");
    type = "text/plain; charset=utf-8";
  } else if (format === "json") {
    buffer = Buffer.from(
      toJson(
        {
          generatedAt: data.generatedAt,
          schemaVersion: data.schemaVersion,
          scope: data.scope,
          filters: data.filters
        },
        tables
      ),
      "utf8"
    );
    type = "application/json; charset=utf-8";
  } else {
    buffer = await toXlsx(tables);
    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  await writeAudit({
    actorId: user.id,
    action: "insights.export",
    entityType: "Insights",
    summary: `${user.name} exported ${dataset} as ${format} (${scope.kind})`
  });
  return NextResponse.json({
    ok: true,
    filename,
    type,
    body: buffer.toString("base64")
  });
}
