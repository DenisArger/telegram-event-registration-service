import React from "react";
import { CloseButton } from "../close-button";
import { CreateEventForm } from "../create-event-form";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";
import { getAdminEvents } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";

export default async function EventsPage() {
  const locale = getUiLocale();
  const events = await getAdminEvents();

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("events", locale)}</h1>
        <p>{ui("events_subtitle", locale)}</p>
      </section>

      <section className="card">
        <CreateEventForm />
      </section>

      <section className="card">
        <h2>{ui("events", locale)}</h2>
        {events.length === 0 ? (
          <p>{ui("no_events", locale)}</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong> ({event.status}) — {new Date(event.startsAt).toLocaleString()} — cap: {event.capacity}
                {event.status === "draft" ? <PublishButton eventId={event.id} /> : null}
                {event.status === "published" ? <CloseButton eventId={event.id} /> : null}
                <EventQuestionsEditor eventId={event.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
