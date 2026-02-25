import React from "react";
import { ExportButton } from "../export-button";
import { PromoteButton } from "../promote-button";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";

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
    <>
      <PageHeader title={ui("actions", locale)} subtitle={ui("actions_subtitle", locale)} />
      <Panel className="space-y-4">
        <div className="toolbar-grid">
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
        </div>

        {selectedEventId ? (
          <div className="flex flex-wrap gap-2">
            <PromoteButton eventId={selectedEventId} organizationId={selectedOrganizationId ?? ""} />
            <ExportButton eventId={selectedEventId} organizationId={selectedOrganizationId ?? ""} />
          </div>
        ) : (
          <EmptyState message={ui("no_event_selected", locale)} />
        )}
      </Panel>
    </>
  );
}
