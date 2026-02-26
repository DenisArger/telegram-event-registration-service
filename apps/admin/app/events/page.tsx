import Link from "next/link";
import React from "react";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";
import { EventsManager } from "./events-manager";

export default async function EventsPage({
  searchParams
}: {
  searchParams?: Promise<{ organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const events = await getAdminEvents(selectedOrganizationId ?? undefined);

  return (
    <>
      <PageHeader title={ui("events", locale)} subtitle={ui("events_subtitle", locale)} />

      <Panel className="space-y-4">
        <div className="toolbar-grid">
          <OrganizationSelector
            organizations={organizations}
            selectedOrganizationId={selectedOrganizationId}
            basePath="/events"
          />
          <div className="flex items-end">
            <Link
              href={`/events/new?${new URLSearchParams(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}).toString()}`}
              className="inline-flex items-center justify-center rounded-lg border border-accent/20 bg-accent px-3 py-2 text-sm font-medium text-white no-underline transition hover:bg-accent/90"
            >
              {ui("open_create_event", locale)}
            </Link>
          </div>
        </div>

        {!selectedOrganizationId ? (
          <EmptyState message={ui("no_events", locale)} />
        ) : (
          <EventsManager events={events} organizationId={selectedOrganizationId} />
        )}
      </Panel>
    </>
  );
}
