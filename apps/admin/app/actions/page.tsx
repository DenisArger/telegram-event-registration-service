import React from "react";
import { ExportButton } from "../export-button";
import { PromoteButton } from "../promote-button";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function ActionsPage({
  searchParams
}: {
  searchParams?: Promise<{ eventId?: string | string[]; organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const events = await getAdminEvents(selectedOrganizationId ?? undefined);
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("actions", locale)}</h1>
        <p>{ui("actions_subtitle", locale)}</p>
      </section>

      <section className="card">
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/actions"
          eventId={selectedEventId}
        />
        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          basePath="/actions"
          organizationId={selectedOrganizationId}
        />
        {selectedEventId ? (
          <div style={{ display: "flex", gap: 8 }}>
            <PromoteButton eventId={selectedEventId} organizationId={selectedOrganizationId ?? ""} />
            <ExportButton eventId={selectedEventId} organizationId={selectedOrganizationId ?? ""} />
          </div>
        ) : (
          <p>{ui("no_event_selected", locale)}</p>
        )}
      </section>
    </div>
  );
}
