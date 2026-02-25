import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe, getStats } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";
import { EmojiText } from "../_components/emoji-text";

export default async function StatsPage({
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
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const stats = selectedEventId ? await getStats(selectedEventId, selectedOrganizationId ?? undefined) : null;

  return (
    <>
      <PageHeader title={ui("stats", locale)} subtitle={ui("stats_subtitle", locale)} />
      <Panel className="space-y-4">
        <div className="toolbar-grid">
          <OrganizationSelector
            organizations={organizations}
            selectedOrganizationId={selectedOrganizationId}
            basePath="/stats"
            eventId={selectedEventId}
          />
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            basePath="/stats"
            organizationId={selectedOrganizationId}
          />
        </div>

        <h2>
          {ui("stats", locale)}{" "}
          {selectedEvent ? (
            <>
              {ui("event_for", locale)} <span>&quot;<EmojiText text={selectedEvent.title} />&quot;</span>
            </>
          ) : ""}
        </h2>
        {!stats ? (
          <EmptyState message={ui("stats_unavailable", locale)} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="panel-compact"><h3>{ui("registered", locale)}</h3><p className="text-2xl font-semibold text-text">{stats.registeredCount}</p></article>
            <article className="panel-compact"><h3>{ui("checked_in", locale)}</h3><p className="text-2xl font-semibold text-text">{stats.checkedInCount}</p></article>
            <article className="panel-compact"><h3>{ui("waitlist", locale)}</h3><p className="text-2xl font-semibold text-text">{stats.waitlistCount}</p></article>
            <article className="panel-compact"><h3>{ui("no_show_rate", locale)}</h3><p className="text-2xl font-semibold text-text">{stats.noShowRate}%</p></article>
          </div>
        )}
      </Panel>
    </>
  );
}
