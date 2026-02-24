import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe, getWaitlist } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function WaitlistPage({
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
  const waitlist = selectedEventId ? await getWaitlist(selectedEventId, selectedOrganizationId ?? undefined) : [];

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("waitlist", locale)}</h1>
        <p>{ui("waitlist_subtitle", locale)}</p>
      </section>

      <section className="card">
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/waitlist"
          eventId={selectedEventId}
        />
        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          basePath="/waitlist"
          organizationId={selectedOrganizationId}
        />
        <h2>{ui("waitlist", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!selectedEvent ? (
          <p>{ui("no_event_selected", locale)}</p>
        ) : waitlist.length === 0 ? (
          <p>{ui("waitlist_empty", locale)}</p>
        ) : (
          <ul>
            {waitlist.map((entry) => (
              <li key={entry.userId}>
                #{entry.position} {entry.fullName}
                {entry.username ? ` (@${entry.username})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
