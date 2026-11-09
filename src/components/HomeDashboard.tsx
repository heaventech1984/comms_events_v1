import Link from "next/link";
import { EventFeedbackBox } from "@/components/EventFeedbackBox";
import { GatherMark } from "@/components/GatherMark";
import { KindChooser } from "@/components/KindChooser";
import { addDaysKey, dayKeyOf, formatDayKey, formatDayLabel } from "@/lib/calendar";
import { eventsNeedingFeedback } from "@/lib/feedback";
import { prisma } from "@/lib/db";
import { formatWhereLine } from "@/lib/place";
import { loadRecommendations } from "@/lib/recommend";
import { formatDateTime, formatTime, londonDate } from "@/lib/time";

/** Signed-in Home — Apple-like calm: brand first, then one job per band. */
export async function HomeDashboard({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const now = new Date();
  const today = dayKeyOf(now);
  const dayAfterTomorrow = addDaysKey(today, 2);
  const rangeFrom = londonDate(today.year, today.month, today.day, 0, 0);
  const rangeTo = londonDate(dayAfterTomorrow.year, dayAfterTomorrow.month, dayAfterTomorrow.day, 0, 0);
  const firstName = user.name.split(" ")[0];

  const myBookings = await prisma.booking.findMany({
    where: {
      userId,
      event: { status: "PUBLISHED", startsAt: { gte: rangeFrom, lt: rangeTo } }
    },
    include: { event: true },
    orderBy: { event: { startsAt: "asc" } }
  });

  const stars = await prisma.star.findMany({
    where: {
      userId,
      event: { status: "PUBLISHED", startsAt: { gte: rangeFrom, lt: rangeTo } }
    },
    include: { event: true }
  });

  type Row = {
    id: string;
    title: string;
    startsAt: Date;
    online: boolean;
    placeName: string | null;
    kind: "booked" | "starred";
  };
  const upcomingMap = new Map<string, Row>();
  for (const b of myBookings) {
    upcomingMap.set(b.event.id, {
      id: b.event.id,
      title: b.event.title,
      startsAt: b.event.startsAt,
      online: b.event.online,
      placeName: b.event.placeName,
      kind: "booked"
    });
  }
  for (const s of stars) {
    if (!upcomingMap.has(s.event.id)) {
      upcomingMap.set(s.event.id, {
        id: s.event.id,
        title: s.event.title,
        startsAt: s.event.startsAt,
        online: s.event.online,
        placeName: s.event.placeName,
        kind: "starred"
      });
    }
  }
  const upcoming = [...upcomingMap.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const next = upcoming[0] ?? null;
  const rest = upcoming.slice(1);

  const toConfirm = await prisma.booking.findMany({
    where: {
      userId,
      attendance: "UNCONFIRMED",
      event: { status: "PUBLISHED", endsAt: { lt: now } }
    },
    include: { event: true },
    orderBy: { event: { startsAt: "desc" } },
    take: 10
  });
  const [picks, needingFeedback] = await Promise.all([
    loadRecommendations(userId, now),
    eventsNeedingFeedback(userId, now)
  ]);

  const since = user.previousLoginAt;
  const newEvents = since
    ? await prisma.event.findMany({
        where: {
          status: "PUBLISHED",
          startsAt: { gte: now },
          OR: [{ createdAt: { gt: since } }, { startsAt: { gt: since } }]
        },
        orderBy: { startsAt: "asc" },
        take: 12
      })
    : [];

  const showUpcoming = rest.length > 0;
  const showForYou = picks.length > 0;
  const showConfirm = toConfirm.length > 0 || needingFeedback.length > 0;
  const showNew = Boolean(since) && newEvents.length > 0;

  return (
    <main className="home-apple" data-testid="home-dashboard">
      <header className="home-hero home-rise">
        <div className="home-hero-brand">
          <GatherMark size="lg" />
          <p className="home-hero-wordmark">Gather</p>
        </div>
        <h1 className="home-hero-title">
          {since ? `Welcome back, ${firstName}.` : `Welcome, ${firstName}.`}
        </h1>
        <p className="home-hero-lede">Your Birmingham calendar — clear, calm, and ready when you are.</p>
        {next ? (
          <Link className="home-event-row home-next-card" href={`/events/${next.id}`} data-testid="home-next">
            <span className="home-event-body">
              <span className="home-eyebrow">Next up</span>
              <span className="home-event-title">{next.title}</span>
              <span className="home-event-meta">
                {formatDateTime(next.startsAt)} · {formatWhereLine(next.online, next.placeName)}
                {next.kind === "starred" ? " · ★" : ""}
              </span>
            </span>
          </Link>
        ) : null}
        <div className="home-hero-cta">
          <Link className="button home-cta-primary" href="/calendar">
            Open calendar
          </Link>
          {showConfirm ? (
            <a className="button ghost home-cta-secondary" href="#home-confirm">
              Confirm {toConfirm.length + needingFeedback.length === 1 ? "1 event" : `${toConfirm.length + needingFeedback.length} events`}
            </a>
          ) : null}
        </div>
      </header>

      {showUpcoming ? (
        <section className="home-band home-rise home-rise-2" aria-labelledby="home-upcoming" data-testid="home-upcoming">
          <p className="home-eyebrow">Today &amp; tomorrow</p>
          <h2 id="home-upcoming" className="home-band-title">
            Also coming up
          </h2>
          <div className="event-day-groups">
            {(() => {
              const groups: { key: string; label: string; events: typeof rest }[] = [];
              for (const event of rest) {
                const day = dayKeyOf(event.startsAt);
                const key = formatDayKey(day);
                const last = groups[groups.length - 1];
                if (!last || last.key !== key) {
                  groups.push({ key, label: formatDayLabel(day), events: [event] });
                } else {
                  last.events.push(event);
                }
              }
              return groups.map((group) => (
                <section key={group.key} className="event-day-group">
                  <h3 className="event-day-heading">{group.label}</h3>
                  <ul className="home-event-list">
                    {group.events.map((event) => (
                      <li key={event.id}>
                        <Link className="home-event-row" href={`/events/${event.id}`}>
                          <span className="home-event-body">
                            <span className="home-event-title">{event.title}</span>
                            <span className="home-event-meta">
                              {formatTime(event.startsAt)} · {formatWhereLine(event.online, event.placeName)}
                              {event.kind === "starred" ? " · ★" : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ));
            })()}
          </div>
        </section>
      ) : null}

      {showForYou ? (
        <section className="home-band home-rise home-rise-3" aria-labelledby="home-for-you" data-testid="home-for-you">
          <p className="home-eyebrow">From what you book and go to</p>
          <h2 id="home-for-you" className="home-band-title">
            For you
          </h2>
          <ul className="home-event-list">
            {picks.map((event) => (
              <li key={event.id}>
                <Link className="home-event-row" href={`/events/${event.id}`}>
                  <span className="home-event-body">
                    <span className="home-event-title">{event.title}</span>
                    <span className="home-event-meta">{event.reason}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showConfirm ? (
        <section
          className="home-band home-rise home-rise-4"
          aria-labelledby="home-confirm-heading"
          data-testid="home-confirm"
          id="home-confirm"
        >
          <p className="home-eyebrow">After the event</p>
          <h2 id="home-confirm-heading" className="home-band-title">
            Confirm attendance
          </h2>
          {toConfirm.length ? (
            <ul className="home-simple-list">
              {toConfirm.map((b) => (
                <li key={b.id}>
                  <Link href={`/events/${b.event.id}`}>
                    <span className="home-simple-title">{b.event.title}</span>
                    <span className="home-simple-meta">{formatDateTime(b.event.startsAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {needingFeedback.length ? (
            <div className="home-feedback-list" data-testid="home-feedback">
              {needingFeedback.map((b) => (
                <EventFeedbackBox key={b.id} eventId={b.event.id} eventTitle={b.event.title} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showNew ? (
        <section className="home-band home-rise home-rise-5" aria-labelledby="home-new" data-testid="home-new">
          <p className="home-eyebrow">Since you were last here</p>
          <h2 id="home-new" className="home-band-title">
            New on the calendar
          </h2>
          <ul className="home-simple-list">
            {newEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`}>
                  <span className="home-simple-title">{e.title}</span>
                  <span className="home-simple-meta">{formatDateTime(e.startsAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="home-kinds home-rise home-rise-6" aria-labelledby="home-kinds" data-testid="home-kinds">
        <p className="home-eyebrow">Explore</p>
        <h2 id="home-kinds" className="home-band-title">
          Browse by type
        </h2>
        <p className="home-kinds-lede" id="kind-question">
          What kind of event are you looking for?
        </p>
        <KindChooser signedIn selected={null} variant="showcase" />
      </section>
    </main>
  );
}
