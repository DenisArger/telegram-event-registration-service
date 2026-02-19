"use client";

import React, { useState } from "react";
import { CloseButton } from "../close-button";
import { CreateEventForm } from "../create-event-form";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";
import type { EventItem } from "../_lib/admin-api";
import type { UiLocale } from "../i18n";
import { ui } from "../i18n";

export function EventsPageContent({ events, locale }: { events: EventItem[]; locale: UiLocale }) {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="section-grid">
      <section className="card">
        <button type="button" onClick={() => setCreateModalOpen(true)}>
          {ui("open_create_event", locale)}
        </button>
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

      {isCreateModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={ui("create_event_modal_title", locale)}>
          <div className="modal-card">
            <div className="modal-header">
              <h2>{ui("create_event_modal_title", locale)}</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)}>
                {ui("close_modal", locale)}
              </button>
            </div>
            <CreateEventForm showTitle={false} onCreated={() => setCreateModalOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
