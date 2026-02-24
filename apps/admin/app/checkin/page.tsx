import React from "react";
import { CheckInForm } from "../checkin-form";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

export default async function CheckinPage({
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
        <h1>{ui("checkin", locale)}</h1>
        <p>{ui("checkin_subtitle", locale)}</p>
      </section>

      <section className="card">
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/checkin"
          eventId={selectedEventId}
        />
        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          basePath="/checkin"
          organizationId={selectedOrganizationId}
        />
        <CheckInForm initialEventId={selectedEventId ?? ""} organizationId={selectedOrganizationId ?? ""} />
      </section>
    </div>
  );
}
