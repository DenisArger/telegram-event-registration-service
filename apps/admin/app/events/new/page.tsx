import Link from "next/link";
import React from "react";
import { OrganizationSelector } from "../../_components/organization-selector";
import { getAuthMe } from "../../_lib/admin-api";
import { resolveSelectedOrganizationId } from "../../_lib/event-selection";
import { getUiLocale, ui } from "../../i18n";
import { PageHeader } from "../../_components/ui/page-header";
import { Panel } from "../../_components/ui/panel";
import { CreateEventForm } from "../../create-event-form";

export default async function NewEventPage({
  searchParams
}: {
  searchParams?: Promise<{ organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);

  return (
    <>
      <PageHeader title={ui("create_event_modal_title", locale)} subtitle={ui("events_subtitle", locale)} />
      <Panel className="space-y-4">
        <div className="toolbar-grid">
          <OrganizationSelector
            organizations={organizations}
            selectedOrganizationId={selectedOrganizationId}
            basePath="/events/new"
          />
          <div className="flex items-end">
            <Link
              href={`/events?${new URLSearchParams(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}).toString()}`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text no-underline transition hover:bg-surface-elevated"
            >
              {ui("events", locale)}
            </Link>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <CreateEventForm showTitle={false} organizationId={selectedOrganizationId ?? undefined} />
        </section>
      </Panel>
    </>
  );
}
