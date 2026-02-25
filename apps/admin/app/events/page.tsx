import Link from "next/link";
import React from "react";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { MarkdownPreview } from "../_components/markdown-preview";
import { resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { Badge } from "../_components/ui/badge";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";
import { EmojiText } from "../_components/emoji-text";

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
        </div>

        {events.length === 0 ? (
          <EmptyState message={ui("no_events", locale)} />
        ) : (
          <ul className="grid gap-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-border bg-surface-elevated p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/events/${event.id}?${new URLSearchParams(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}).toString()}`}
                    className="text-base font-semibold no-underline"
                  >
                    <EmojiText text={event.title} />
                  </Link>
                  <Badge tone={event.status === "published" ? "success" : "muted"}>{event.status}</Badge>
                </div>
                <p className="mt-2">
                  {event.startsAt ? `${new Date(event.startsAt).toLocaleString()}` : ""}
                  {event.endsAt ? ` -> ${new Date(event.endsAt).toLocaleString()}` : ""}
                  {typeof event.capacity === "number" && event.capacity > 0 ? ` | cap: ${event.capacity}` : ""}
                </p>
                {event.description ? <MarkdownPreview markdown={event.description} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
