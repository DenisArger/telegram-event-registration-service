import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAttendees, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { AttendeesTable } from "./attendees-table";

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
    <div className="section-grid">
      <section className="card">
        <h1>{ui("attendees", locale)}</h1>
        <p>{ui("attendees_subtitle", locale)}</p>
      </section>

      <section className="card">
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
        <div className="attendees-view-switch" role="tablist" aria-label="view-switch">
          <a href={listHref} className={viewMode === "list" ? "active" : ""}>{ui("attendees_view_list", locale)}</a>
          <a href={tableHref} className={viewMode === "table" ? "active" : ""}>{ui("attendees_view_table", locale)}</a>
        </div>
        <h2>{ui("attendees", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!selectedEvent ? (
          <p>{ui("attendees_need_event", locale)}</p>
        ) : attendees.length === 0 ? (
          <p>{ui("no_attendees", locale)}</p>
        ) : viewMode === "list" ? (
          <ul>
            {attendees.map((attendee) => (
              <li key={attendee.userId}>
                {attendee.fullName}
                {attendee.username ? ` (@${attendee.username})` : ""} — {attendee.status}
                {attendee.checkedIn ? ` — ${ui("checked_in_mark", locale)}` : ""}
                {(attendee.answers ?? []).length > 0 ? (
                  <ul>
                    {(attendee.answers ?? []).map((answer) => (
                      <li key={`${attendee.userId}-${answer.questionId}-${answer.questionVersion}`}>
                        {answer.prompt}: {answer.isSkipped ? ui("skipped", locale) : answer.answerText}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <AttendeesTable eventId={selectedEventId ?? ""} attendees={attendees} organizationId={selectedOrganizationId ?? ""} />
        )}
      </section>
    </div>
  );
}
