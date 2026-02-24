import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe, getStats } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function StatsPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[]; organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const events = await getAdminEvents(selectedOrganizationId ?? undefined);
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const stats = selectedEventId ? await getStats(selectedEventId, selectedOrganizationId ?? undefined) : null;

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("stats", locale)}</h1>
        <p>{ui("stats_subtitle", locale)}</p>
      </section>

      <section className="card">
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/stats"
          eventId={selectedEventId}
        />
        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          basePath="/stats"
          organizationId={selectedOrganizationId}
        />
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
