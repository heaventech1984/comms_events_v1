"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category } from "@/lib/constants";
import { MEETUP_BIRMINGHAM_FIND_URL, STARTER_PRIORITY_URL } from "@/lib/scraper/allowlist";
import {
  droppedPriorityUrlMessage,
  runFinishedSummary,
  type RunFinishedSummary
} from "@/lib/scraper/priority-copy";
import { requestJson, type JsonResult } from "@/lib/fetch-json";
import {
  buildEventbriteSearchQuery,
  EVENTBRITE_SEARCH_DAYS,
  parseEventbriteSearchConfig,
  type EventbriteSearchConfig
} from "@/lib/scraper/eventbrite-settings";
import { StatusBanner } from "./StatusBanner";

type Settings = {
  locationLabel: string;
  scrapeRadiusMiles: number;
  enabled: Record<Category, boolean>;
  colours: Record<string, string>;
  priorityUrls: string[];
  eventbriteSearchConfig: EventbriteSearchConfig;
};

export function ScraperForm({
  settings,
  organisations,
  allowedHosts,
  notice
}: {
  settings: Settings;
  organisations: { id: string; name: string; status: string }[];
  allowedHosts: string[];
  notice?: string | null;
}) {
  const router = useRouter();
  const savedUrls = settings.priorityUrls.join("\n");
  const [priorityText, setPriorityText] = useState(savedUrls);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [kind, setKind] = useState<"info" | "error">("info");
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<RunFinishedSummary | null>(null);
  const [orgFilter, setOrgFilter] = useState<"ALL" | "WHITELIST" | "STANDARD" | "BLACKLIST">("ALL");
  const [eventbriteConfig, setEventbriteConfig] = useState(settings.eventbriteSearchConfig);
  const [searchTerms, setSearchTerms] = useState(settings.eventbriteSearchConfig.terms.join(", "));
  const formedQuery = buildEventbriteSearchQuery(
    parseEventbriteSearchConfig({
      ...eventbriteConfig,
      terms: searchTerms.split(",").map((term) => term.trim()).filter(Boolean)
    }),
    new Date()
  );
  const visibleOrgs =
    orgFilter === "ALL" ? organisations : organisations.filter((o) => o.status === orgFilter);

  useEffect(() => {
    setPriorityText(savedUrls);
  }, [savedUrls]);

  function show(result: JsonResult, success: string) {
    setKind(result.ok ? "info" : "error");
    setMessage(result.ok ? success : result.error);
    if (result.ok) router.refresh();
  }

  function settingsBody(form: FormData) {
    return {
      locationLabel: form.get("locationLabel"),
      scrapeRadiusMiles: form.get("scrapeRadiusMiles"),
      enabled: Object.fromEntries(CATEGORIES.map((c) => [c, form.get(`enabled-${c}`) === "on"])),
      colours: Object.fromEntries(CATEGORIES.map((c) => [c, form.get(`colour-${c}`)])),
      priorityUrls: priorityText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      eventbriteSearchConfig: {
        ...eventbriteConfig,
        terms: searchTerms.split(",").map((term) => term.trim()).filter(Boolean)
      }
    };
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRunSummary(null);
    const result = await requestJson<{ dropped?: { url: string; reason: string }[] }>("/api/settings", {
      method: "POST",
      body: settingsBody(new FormData(e.currentTarget))
    });
    const skipped = result.ok ? droppedPriorityUrlMessage(result.data.dropped ?? []) : null;
    show(
      result,
      skipped
        ? `Settings saved. ${skipped}`
        : "Settings saved. Extras above are gap-fillers — every Run also fetches the Birmingham discovery pack."
    );
  }

  async function runNow(form: HTMLFormElement) {
    if (running) return;
    setRunning(true);
    setKind("info");
    setRunSummary(null);
    setMessage("Saving extras, then running the Birmingham pack plus any lines above…");
    const saved = await requestJson<{ dropped?: { url: string; reason: string }[] }>("/api/settings", {
      method: "POST",
      body: settingsBody(new FormData(form))
    });
    if (!saved.ok) {
      setRunning(false);
      show(saved, "");
      return;
    }
    const result = await requestJson<{
      createdCount?: number;
      updatedCount?: number;
      publishedCount?: number;
      discardedByRule?: number;
      leftPending?: number;
      skippedHumanEdited?: number;
      droppedDisabledCategory?: number;
      droppedNearDupe?: number;
      droppedGeo?: number;
      sources?: { url: string; ok: boolean; eventCount: number; error?: string }[];
    }>("/api/scraper/run", {
      method: "POST"
    });
    setRunning(false);
    if (!result.ok) {
      show(result, "");
      return;
    }
    const summary = runFinishedSummary({
      ...result.data,
      dropped: saved.data.dropped ?? []
    });
    setRunSummary(summary);
    setKind("info");
    setMessage(summary.headline);
    router.refresh();
  }

  async function searchEventbriteNow(form: HTMLFormElement) {
    if (running) return;
    setRunning(true);
    setKind("info");
    setRunSummary(null);
    setMessage("Saving settings, then searching Eventbrite pages…");
    const saved = await requestJson<{ dropped?: { url: string; reason: string }[] }>("/api/settings", {
      method: "POST",
      body: settingsBody(new FormData(form))
    });
    if (!saved.ok) {
      setRunning(false);
      show(saved, "");
      return;
    }
    const result = await requestJson<{
      createdCount?: number;
      updatedCount?: number;
      leftPending?: number;
      sources?: { url: string; label?: string; ok: boolean; eventCount: number; error?: string }[];
    }>("/api/scraper/eventbrite-search", { method: "POST" });
    setRunning(false);
    if (!result.ok) {
      show(result, "");
      return;
    }
    const pages = result.data.sources?.filter((source) => source.label?.includes("page ")).length ?? 0;
    const searchErrors = result.data.sources?.filter((source) => !source.ok).map((source) => source.error).filter(Boolean) ?? [];
    setKind(searchErrors.length ? "error" : "info");
    setMessage(
      searchErrors.length
        ? `Eventbrite search finished with an issue: ${searchErrors[0]}`
        : `Eventbrite search finished: ${result.data.createdCount ?? 0} new, ${result.data.updatedCount ?? 0} refreshed; ${result.data.leftPending ?? 0} pending. Searched ${pages} page${pages === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  async function filterOut(form: HTMLFormElement) {
    if (running) return;
    const confirmed = window.confirm(
      "Discard pending events that are an unticked type or outside the miles on this form? Meetup events stay. They leave Pending and will not come back on the next scrape."
    );
    if (!confirmed) return;
    setRunning(true);
    setKind("info");
    setRunSummary(null);
    setMessage("Saving settings, then checking pending events…");
    const saved = await requestJson<{ dropped?: { url: string; reason: string }[] }>("/api/settings", {
      method: "POST",
      body: settingsBody(new FormData(form))
    });
    if (!saved.ok) {
      setRunning(false);
      show(saved, "");
      return;
    }
    const result = await requestJson<{ discarded?: number; stillPending?: number; pagesOpened?: number }>(
      "/api/scraper/filter-pending",
      { method: "POST" }
    );
    setRunning(false);
    if (!result.ok) {
      show(result, "");
      return;
    }
    const discarded = result.data.discarded ?? 0;
    const still = result.data.stillPending ?? 0;
    const opened = result.data.pagesOpened ?? 0;
    setKind("info");
    setMessage(
      `Discarded ${discarded} pending event${discarded === 1 ? "" : "s"}. ${still} still pending.${opened ? ` Opened ${opened} event page${opened === 1 ? "" : "s"} to read a city.` : ""}`
    );
    router.refresh();
  }

  async function setOrg(id: string, status: string) {
    const result = await requestJson("/api/organisations", { method: "POST", body: { id, status } });
    show(result, "Organisation rule saved.");
  }

  return (
    <div className="stack">
      <StatusBanner message={message} kind={kind} />
      {runSummary ? (
        <section className="card scrape-result-card" data-testid="scrape-result-card" aria-live="polite">
          <h2>Last scrape</h2>
          <ul className="scrape-result-stats">
            <li>
              <strong>{runSummary.created}</strong> new
            </li>
            <li>
              <strong>{runSummary.updated}</strong> refreshed
            </li>
            <li>
              <strong>{runSummary.pending}</strong> in Pending
            </li>
            <li>
              <strong>{runSummary.feedsOk}</strong> feeds with events
            </li>
            {runSummary.feedsFailed ? (
              <li>
                <strong>{runSummary.feedsFailed}</strong> feeds failed
              </li>
            ) : null}
          </ul>
          {runSummary.topSites.length ? (
            <p className="scrape-result-sites">
              <span className="muted">Top sites</span>
              {runSummary.topSites.map((site) => (
                <span key={site.host} className="scrape-result-chip">
                  {site.host} · {site.count}
                </span>
              ))}
            </p>
          ) : null}
          {runSummary.details.length ? (
            <ul className="scrape-result-details muted">
              {runSummary.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <p className="row scrape-result-actions">
            <a className="button" href="/pending">
              Open Pending
            </a>
            <a className="button secondary" href="/pending?tags=In%20Person">
              In person only
            </a>
            <a className="button secondary" href="/pending?types=Faith">
              Faith only
            </a>
          </p>
        </section>
      ) : null}
      <form className="card stack" onSubmit={save}>
        <label>
          Location label
          <input name="locationLabel" defaultValue={settings.locationLabel} />
        </label>
        <label>
          Miles from Birmingham city centre
          <input
            name="scrapeRadiusMiles"
            type="number"
            min={1}
            max={40}
            step={1}
            defaultValue={settings.scrapeRadiusMiles}
          />
          <span className="muted">
            The city named on the event page is measured from the city centre. 10 miles is the starting point.
            A town further out, such as Wolverhampton, is left out until this number is raised.
          </span>
        </label>
        <fieldset className="stack">
          <legend>Event types</legend>
          {CATEGORIES.map((c) => (
            <label key={c} className="row">
              <input type="checkbox" name={`enabled-${c}`} defaultChecked={settings.enabled[c]} />
              {c}
              <input type="color" name={`colour-${c}`} defaultValue={settings.colours[c]} aria-label={`${c} colour`} />
            </label>
          ))}
        </fieldset>
        <label>
          Extra Priority URLs (optional — gap-fillers only)
          <textarea
            className="scraper-priority-urls"
            name="priorityUrls"
            rows={6}
            value={priorityText}
            onChange={(e) => setPriorityText(e.target.value)}
            placeholder={`Leave empty for the Birmingham pack only.\nAdd a missing allowlisted feed here, for example:\n${STARTER_PRIORITY_URL}`}
          />
          <span className="muted">
            Run now always fetches the frozen Birmingham discovery pack first (cathedral, Eventbrite, Meetup,
            Allevents, Guild, and more — allowlisted hosts only, not the whole open web). This box is only for
            extras when a useful site is missing. Pack URLs pasted here are ignored on save. Hosts allowed:{" "}
            {allowedHosts.join(", ")}. Meetup example: {MEETUP_BIRMINGHAM_FIND_URL}. After a run, Pending shows
            refreshed place and Event Link when the feed provided them.
          </span>
        </label>
        <fieldset className="stack" data-testid="eventbrite-search-settings">
          <legend>Brave Eventbrite search</legend>
          <label className="row">
            <input
              type="checkbox"
              checked={eventbriteConfig.enabled}
              onChange={(event) => setEventbriteConfig({ ...eventbriteConfig, enabled: event.target.checked })}
            />
            Enable Eventbrite search
          </label>
          <div className="row" role="group" aria-label="Eventbrite search run days">
            {EVENTBRITE_SEARCH_DAYS.map((day) => (
              <label key={day.value} className="row">
                <input
                  type="checkbox"
                  checked={eventbriteConfig.runDays.includes(day.value)}
                  onChange={(event) => setEventbriteConfig({
                    ...eventbriteConfig,
                    runDays: event.target.checked
                      ? [...new Set([...eventbriteConfig.runDays, day.value])].sort()
                      : eventbriteConfig.runDays.filter((value) => value !== day.value)
                  })}
                />
                {day.label}
              </label>
            ))}
          </div>
          <label>
            Pages per run (1–10, up to 20 results per page)
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={eventbriteConfig.pages}
              onChange={(event) => setEventbriteConfig({ ...eventbriteConfig, pages: Number(event.target.value) })}
            />
          </label>
          <label>
            Search location
            <input
              value={eventbriteConfig.location}
              maxLength={80}
              onChange={(event) => setEventbriteConfig({ ...eventbriteConfig, location: event.target.value })}
            />
          </label>
          <label>
            Search terms (comma separated; searched as alternatives)
            <input value={searchTerms} onChange={(event) => setSearchTerms(event.target.value)} />
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={eventbriteConfig.includeManual}
              onChange={(event) => setEventbriteConfig({ ...eventbriteConfig, includeManual: event.target.checked })}
            />
            Include Brave search in manual Run now
          </label>
          <p className="muted">
            The month and year target the London calendar month seven days after the run. Scheduled runs use the
            selected weekdays. Search results are event-page candidates and still go through Gather’s existing page
            checks and Pending review.
          </p>
          <label>
            Formed Brave query preview
            <textarea rows={2} readOnly value={formedQuery} data-testid="eventbrite-query-preview" />
          </label>
          <button
            className="secondary"
            type="button"
            data-testid="eventbrite-search-now"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void searchEventbriteNow(form);
            }}
            disabled={running || !eventbriteConfig.enabled}
          >
            {running ? "Searching…" : "Search Eventbrite now"}
          </button>
          <p className="muted">
            Runs only this search immediately, regardless of the selected weekdays or the full scraper’s manual-run
            option. The search must be enabled above.
          </p>
          {!eventbriteConfig.enabled ? (
            <p className="muted">Enable Eventbrite search above to run a manual search.</p>
          ) : null}
        </fieldset>
        <div className="row">
          <button type="submit" disabled={running}>
            Save settings
          </button>
          <button
            className="secondary"
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (form) void runNow(form);
            }}
            disabled={running}
          >
            {running ? "Running…" : "Run now"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (form) void filterOut(form);
            }}
            disabled={running}
          >
            Filter Out from current settings
          </button>
        </div>
        <p className="muted">
          After a run, review <a href="/pending">pending events</a>. A failed feed does not stop the others.
        </p>
      </form>
      <section className="card">
        <h2>Organisations</h2>
        <p className="muted">Colour chips mark the rule. Filter to focus the list.</p>
        <div className="org-filter-row" role="group" aria-label="Filter organisations by rule">
          {(
            [
              ["ALL", "All"],
              ["WHITELIST", "Whitelist"],
              ["STANDARD", "Standard"],
              ["BLACKLIST", "Blacklist"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip org-chip org-${id.toLowerCase()}`}
              aria-pressed={orgFilter === id}
              data-on={orgFilter === id ? "true" : undefined}
              onClick={() => setOrgFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="table-wrap" style={{ border: 0, boxShadow: "none", borderRadius: 0 }}>
          <table className="data stack-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrgs.map((org) => (
                <tr key={org.id}>
                  <td data-label="Name">
                    <span className={`org-status-dot org-${org.status.toLowerCase()}`} aria-hidden="true" />
                    {org.name}
                  </td>
                  <td data-label="Rule">
                    <select
                      aria-label={`Organisation rule for ${org.name}`}
                      defaultValue={org.status}
                      onChange={(e) => setOrg(org.id, e.target.value)}
                    >
                      <option value="WHITELIST">Whitelist (auto-publish)</option>
                      <option value="STANDARD">Standard (pending)</option>
                      <option value="BLACKLIST">Blacklist (discard)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleOrgs.length === 0 ? <p className="muted">No organisations in this filter.</p> : null}
      </section>
    </div>
  );
}
