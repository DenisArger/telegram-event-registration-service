import Link from "next/link";
import React from "react";
import { getAdminEvents } from "../_lib/admin-api";
import { MarkdownPreview } from "../_components/markdown-preview";
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
        <h2>{ui("events", locale)}</h2>
        {events.length === 0 ? (
          <p>{ui("no_events", locale)}</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <strong>{event.title}</strong>
                </Link>{" "}
                ({event.status}) — {new Date(event.startsAt).toLocaleString()}
                {event.endsAt ? ` → ${new Date(event.endsAt).toLocaleString()}` : ""} — cap: {event.capacity}
                {event.description ? <MarkdownPreview markdown={event.description} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
