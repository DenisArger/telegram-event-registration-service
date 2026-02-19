import React from "react";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents, getAttendees } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { AttendeesTable } from "./attendees-table";

export default async function AttendeesPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[]; view?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const events = await getAdminEvents();
  const resolvedSearchParams = await searchParams;
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const rawView = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] : resolvedSearchParams?.view;
  const viewMode = rawView === "list" ? "list" : "table";
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const attendees = selectedEventId ? await getAttendees(selectedEventId) : [];
  const listHref = `/attendees?${new URLSearchParams({ ...(selectedEventId ? { eventId: selectedEventId } : {}), view: "list" }).toString()}`;
  const tableHref = `/attendees?${new URLSearchParams({ ...(selectedEventId ? { eventId: selectedEventId } : {}), view: "table" }).toString()}`;

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("attendees", locale)}</h1>
        <p>{ui("attendees_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/attendees" />
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
          <AttendeesTable eventId={selectedEventId ?? ""} attendees={attendees} />
        )}
      </section>
    </div>
  );
}
