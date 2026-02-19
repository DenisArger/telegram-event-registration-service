import React from "react";
import { ExportButton } from "../export-button";
import { PromoteButton } from "../promote-button";
import { EventSelector } from "../_components/event-selector";
import { getAdminEvents } from "../_lib/admin-api";
import { resolveSelectedEventId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function ActionsPage({
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
        <h1>{ui("actions", locale)}</h1>
        <p>{ui("actions_subtitle", locale)}</p>
      </section>

      <section className="card">
        <EventSelector events={events} selectedEventId={selectedEventId} basePath="/actions" />
        {selectedEventId ? (
          <div style={{ display: "flex", gap: 8 }}>
            <PromoteButton eventId={selectedEventId} />
            <ExportButton eventId={selectedEventId} />
          </div>
        ) : (
          <p>{ui("no_event_selected", locale)}</p>
        )}
      </section>
    </div>
  );
}
