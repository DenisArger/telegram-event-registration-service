import React from "react";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents, getStats } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function StatsPage({
  searchParams
}: {
  searchParams?: { eventId?: string | string[] };
}) {
  const locale = getUiLocale();
  const events = await getAdminEvents();
  const selectedEventId = resolveSelectedEventId(searchParams, events);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const stats = selectedEventId ? await getStats(selectedEventId) : null;

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("stats", locale)}</h1>
        <p>{ui("stats_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/stats" />
        <h2>{ui("stats", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!stats ? (
          <p>{ui("stats_unavailable", locale)}</p>
        ) : (
          <ul>
            <li>{ui("registered", locale)}: {stats.registeredCount}</li>
            <li>{ui("checked_in", locale)}: {stats.checkedInCount}</li>
            <li>{ui("waitlist", locale)}: {stats.waitlistCount}</li>
            <li>{ui("no_show_rate", locale)}: {stats.noShowRate}%</li>
          </ul>
        )}
      </section>
    </div>
  );
}
