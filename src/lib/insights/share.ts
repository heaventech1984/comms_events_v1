import { pctLabel } from "./aggregate";
import { insightsHref } from "./period";
import type { InsightsData, InsightsFilters } from "./types";

const NAME_PATTERN = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/;

export function shareSummary(
  data: InsightsData,
  origin: string,
  filters: InsightsFilters,
  tab = "reach",
  extras?: { loggedIn?: number; memberTotal?: number; memberPercent?: number | null; eventsPublished?: number; attendClicks?: number; peopleEvents?: number; peopleAttendees?: number; cells?: number; feedbackTotal?: number }
): string {
  const path = insightsHref(filters);
  const link = `${origin.replace(/\/$/, "")}${path}`;
  const scope = data.scope.kind === "region" ? "Region" : "Your cell";
  const type = data.filters.category || "all types";
  const tabLabel: Record<string, string> = { people: "People", reach: "Reach", activity: "Activity", where: "Who and where", pipeline: "Pipeline", feedback: "Feedback" };
  const content = tab === "people"
    ? `${extras?.peopleEvents ?? 0} events with attendees · ${extras?.peopleAttendees ?? 0} attendee places`
    : tab === "reach"
      ? `${extras?.loggedIn ?? 0} / ${extras?.memberTotal ?? 0} members logged in (${pctLabel(extras?.memberPercent ?? null)}) · ${extras?.eventsPublished ?? data.kpis.eventsPublished} published events · ${extras?.attendClicks ?? data.kpis.attendClicks} Attend clicks`
      : tab === "activity"
        ? `${data.weeks.reduce((sum, week) => sum + week.attendClicks, 0)} Attend clicks · ${data.weeks.reduce((sum, week) => sum + week.attended, 0)} attended · ${data.weeks.reduce((sum, week) => sum + week.absent, 0)} did not attend · ${extras?.cells ?? 0} cells`
        : tab === "where"
          ? data.byCategory.map((row) => `${row.label}: ${row.count}`).join(" · ") || "No event type activity"
          : tab === "pipeline"
            ? `${data.funnel.scraped} scraped · ${data.funnel.pending} pending · ${data.funnel.published} published · ${data.funnel.discarded} discarded`
            : tab === "feedback"
              ? `${extras?.feedbackTotal ?? 0} member ratings`
              : `${data.kpis.attendClicks} Attend clicks · ${pctLabel(data.kpis.attendanceRate)} attendance · ${data.kpis.eventsPublished} published events`;
  const lines = [`Gather insights · ${tabLabel[tab] ?? "Report"} (${scope} · ${type})`, content, `Open: ${link}`];
  const text = lines.join("\n");
  if (NAME_PATTERN.test(text) || /\b07\d{9}\b/.test(text)) {
    throw new Error("Share text must not include names or cell numbers.");
  }
  return text;
}

export function shareTargets(text: string): { id: string; label: string; href?: string }[] {
  const encoded = encodeURIComponent(text);
  const firstLine = encodeURIComponent(text.split("\n")[0] ?? "Gather insights");
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encoded}` },
    { id: "email", label: "Email", href: `mailto:?subject=${firstLine}&body=${encoded}` },
    { id: "teams", label: "Microsoft Teams", href: `https://teams.microsoft.com/share?msgText=${encoded}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?text=${encoded}` },
    { id: "copy", label: "Copy to clipboard" },
    { id: "device", label: "Share…" }
  ];
}
