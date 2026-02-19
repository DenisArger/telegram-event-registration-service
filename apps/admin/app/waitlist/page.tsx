import React from "react";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents, getWaitlist } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function WaitlistPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const events = await getAdminEvents();
  const resolvedSearchParams = await searchParams;
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const waitlist = selectedEventId ? await getWaitlist(selectedEventId) : [];

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("waitlist", locale)}</h1>
        <p>{ui("waitlist_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/waitlist" />
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
