import React from "react";
import { CheckInForm } from "../checkin-form";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function CheckinPage({
  searchParams
}: {
  searchParams?: { eventId?: string | string[] };
}) {
  const locale = getUiLocale();
  const events = await getAdminEvents();
  const selectedEventId = resolveSelectedEventId(searchParams, events);

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("checkin", locale)}</h1>
        <p>{ui("checkin_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/checkin" />
        <CheckInForm initialEventId={selectedEventId ?? ""} />
      </section>
    </div>
  );
}
