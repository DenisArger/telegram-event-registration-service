import Link from "next/link";
import React from "react";
import { getAdminEventById } from "../../_lib/admin-api";
import { EventEditor } from "../event-editor";
import { getUiLocale, ui } from "../../i18n";

export default async function EventDetailsPage({
  params
}: {
  params: Promise<{ eventId: string }>;
}) {
  const locale = getUiLocale();
  const { eventId } = await params;
  const event = await getAdminEventById(eventId);

  if (!event) {
    return (
      <div className="section-grid">
        <section className="card">
          <p>{ui("no_event_selected", locale)}</p>
          <Link href="/events">{ui("events", locale)}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{event.title}</h1>
        <p>
          {event.status}
          {event.startsAt ? ` — ${new Date(event.startsAt).toLocaleString()}` : ""}
          {event.endsAt
            ? event.startsAt
              ? ` → ${new Date(event.endsAt).toLocaleString()}`
              : ` — ${new Date(event.endsAt).toLocaleString()}`
            : ""}
          {typeof event.capacity === "number" && event.capacity > 0 ? ` — cap: ${event.capacity}` : ""}
        </p>
      </section>
      <EventEditor event={event} />
    </div>
  );
}
