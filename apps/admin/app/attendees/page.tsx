import React from "react";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents, getAttendees } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function AttendeesPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const events = await getAdminEvents();
  const resolvedSearchParams = await searchParams;
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const attendees = selectedEventId ? await getAttendees(selectedEventId) : [];

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("attendees", locale)}</h1>
        <p>{ui("attendees_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/attendees" />
        <h2>{ui("attendees", locale)} {selectedEvent ? `${ui("event_for", locale)} "${selectedEvent.title}"` : ""}</h2>
        {!selectedEvent ? (
          <p>{ui("attendees_need_event", locale)}</p>
        ) : attendees.length === 0 ? (
          <p>{ui("no_attendees", locale)}</p>
        ) : (
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
        )}
      </section>
    </div>
  );
}
