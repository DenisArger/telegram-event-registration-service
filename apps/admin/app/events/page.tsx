import React from "react";
import { getAdminEvents } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";
import { EventsPageContent } from "./events-page-content";

export default async function EventsPage() {
  const locale = getUiLocale();
  const events = await getAdminEvents();

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("events", locale)}</h1>
        <p>{ui("events_subtitle", locale)}</p>
      </section>

      <EventsPageContent events={events} locale={locale} />
    </div>
  );
}
