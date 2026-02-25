import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAttendees, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { AttendeesTable } from "./attendees-table";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";

export default async function AttendeesPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[]; view?: string | string[]; organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const events = await getAdminEvents(selectedOrganizationId ?? undefined);
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const rawView = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] : resolvedSearchParams?.view;
  const viewMode = rawView === "list" ? "list" : "table";
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const attendees = selectedEventId ? await getAttendees(selectedEventId, selectedOrganizationId ?? undefined) : [];
  const listHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    view: "list"
  }).toString()}`;
  const tableHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    view: "table"
  }).toString()}`;

  return (
    <>
      <PageHeader title={ui("attendees", locale)} subtitle={ui("attendees_subtitle", locale)} />

      <Panel className="space-y-4">
        <div className="toolbar-grid">
          <OrganizationSelector
            organizations={organizations}
            selectedOrganizationId={selectedOrganizationId}
            basePath="/attendees"
            eventId={selectedEventId}
            view={viewMode}
          />
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            basePath="/attendees"
            organizationId={selectedOrganizationId}
            view={viewMode}
          />
        </div>

        <div className="attendees-view-switch" role="tablist" aria-label="view-switch">
          <a href={listHref} className={viewMode === "list" ? "active" : ""}>{ui("attendees_view_list", locale)}</a>
          <a href={tableHref} className={viewMode === "table" ? "active" : ""}>{ui("attendees_view_table", locale)}</a>
        </div>

        <h2>{ui("attendees", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!selectedEvent ? (
          <EmptyState message={ui("attendees_need_event", locale)} />
        ) : attendees.length === 0 ? (
          <EmptyState message={ui("no_attendees", locale)} />
        ) : viewMode === "list" ? (
          <ul className="grid gap-2">
            {attendees.map((attendee) => (
              <li key={attendee.userId} className="rounded-xl border border-border bg-surface-elevated p-3 text-sm text-text">
                <strong>{attendee.fullName}</strong>
                {attendee.username ? ` (@${attendee.username})` : ""} - {attendee.status}
                {attendee.checkedIn ? ` - ${ui("checked_in_mark", locale)}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <AttendeesTable eventId={selectedEventId ?? ""} attendees={attendees} organizationId={selectedOrganizationId ?? ""} />
        )}
      </Panel>
    </>
  );
}
