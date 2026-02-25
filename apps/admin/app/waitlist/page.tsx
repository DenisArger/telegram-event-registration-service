import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe, getWaitlist } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";

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
    <>
      <PageHeader title={ui("waitlist", locale)} subtitle={ui("waitlist_subtitle", locale)} />
      <Panel className="space-y-4">
        <div className="toolbar-grid">
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
        </div>
        <h2>{ui("waitlist", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!selectedEvent ? (
          <EmptyState message={ui("no_event_selected", locale)} />
        ) : waitlist.length === 0 ? (
          <EmptyState message={ui("waitlist_empty", locale)} />
        ) : (
          <div className="attendees-table-wrap">
            <table className="attendees-table min-w-[640px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{ui("attendees_column_name", locale)}</th>
                  <th>{ui("attendees_column_username", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry) => (
                  <tr key={entry.userId}>
                    <td>{entry.position}</td>
                    <td>{entry.fullName}</td>
                    <td>{entry.username ? `@${entry.username}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
