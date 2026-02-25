import React from "react";
import { CheckInForm } from "../checkin-form";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";

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
    <>
      <PageHeader title={ui("checkin", locale)} subtitle={ui("checkin_subtitle", locale)} />

      <Panel className="space-y-4">
        <div className="toolbar-grid">
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
        </div>
        <CheckInForm initialEventId={selectedEventId ?? ""} organizationId={selectedOrganizationId ?? ""} />
      </Panel>
    </>
  );
}
