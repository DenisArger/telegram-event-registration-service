import React from "react";
import { EventSelector } from "../_components/event-selector";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAttendees, getAuthMe } from "../_lib/admin-api";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { AttendeesTable } from "./attendees-table";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";
import { EmojiText } from "../_components/emoji-text";

export default async function AttendeesPage({
  searchParams
}: {
  searchParams?: Promise<{
    eventId?: string | string[];
    view?: string | string[];
    density?: string | string[];
    organizationId?: string | string[];
    status?: string | string[];
  }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const events = await getAdminEvents(selectedOrganizationId ?? undefined);
  const selectedEventId = resolveSelectedEventId(resolvedSearchParams, events);
  const rawView = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] : resolvedSearchParams?.view;
  const rawDensity = Array.isArray(resolvedSearchParams?.density) ? resolvedSearchParams?.density[0] : resolvedSearchParams?.density;
  const rawStatus = Array.isArray(resolvedSearchParams?.status) ? resolvedSearchParams?.status[0] : resolvedSearchParams?.status;
  const viewMode = rawView === "list" ? "list" : "table";
  const densityMode = rawDensity === "compact" ? "compact" : "comfortable";
  const statusMode = rawStatus === "cancelled" ? "cancelled" : "active";
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const attendees = selectedEventId ? await getAttendees(selectedEventId, selectedOrganizationId ?? undefined) : [];
  const activeAttendees = attendees.filter((attendee) => attendee.status === "registered");
  const cancelledAttendees = attendees.filter((attendee) => attendee.status === "cancelled");
  const currentAttendees = statusMode === "cancelled" ? cancelledAttendees : activeAttendees;
  const listHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    ...(densityMode ? { density: densityMode } : {}),
    status: statusMode,
    view: "list"
  }).toString()}`;
  const tableHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    ...(densityMode ? { density: densityMode } : {}),
    status: statusMode,
    view: "table"
  }).toString()}`;
  const compactHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    status: statusMode,
    view: viewMode,
    density: "compact"
  }).toString()}`;
  const comfortableHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    status: statusMode,
    view: viewMode,
    density: "comfortable"
  }).toString()}`;
  const activeTabHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    ...(densityMode ? { density: densityMode } : {}),
    ...(viewMode ? { view: viewMode } : {}),
    status: "active"
  }).toString()}`;
  const cancelledTabHref = `/attendees?${new URLSearchParams({
    ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
    ...(selectedEventId ? { eventId: selectedEventId } : {}),
    ...(densityMode ? { density: densityMode } : {}),
    ...(viewMode ? { view: viewMode } : {}),
    status: "cancelled"
  }).toString()}`;

  return (
    <>
      <PageHeader title={ui("attendees", locale)} subtitle={ui("attendees_subtitle", locale)} />

      <Panel className="attendees-panel space-y-4">
        <div className="toolbar-grid attendees-toolbar">
          <OrganizationSelector
            organizations={organizations}
            selectedOrganizationId={selectedOrganizationId}
            basePath="/attendees"
            eventId={selectedEventId}
            view={viewMode}
            density={densityMode}
          />
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            basePath="/attendees"
            organizationId={selectedOrganizationId}
            view={viewMode}
            density={densityMode}
          />
          <div className="attendees-toolbar-switch">
            <div className="attendees-toolbar-controls">
              <div className="attendees-status-switch" role="tablist" aria-label="status-switch">
                <a href={activeTabHref} className={statusMode === "active" ? "active" : ""}>
                  {ui("attendees_tab_active", locale)}
                </a>
                <a href={cancelledTabHref} className={statusMode === "cancelled" ? "active" : ""}>
                  {ui("attendees_tab_cancelled", locale)}
                </a>
              </div>
              <div className="attendees-view-switch" role="tablist" aria-label="view-switch">
                <a href={listHref} className={viewMode === "list" ? "active" : ""}>{ui("attendees_view_list", locale)}</a>
                <a href={tableHref} className={viewMode === "table" ? "active" : ""}>{ui("attendees_view_table", locale)}</a>
              </div>
              <div className="attendees-density-switch" role="tablist" aria-label="density-switch">
                <a href={comfortableHref} className={densityMode === "comfortable" ? "active" : ""}>Comfortable</a>
                <a href={compactHref} className={densityMode === "compact" ? "active" : ""}>Compact</a>
              </div>
            </div>
          </div>
        </div>

        <h2 className="attendees-heading">
          <span>
            {ui("attendees", locale)}{" "}
            {statusMode === "cancelled" ? ui("attendees_tab_cancelled", locale).toLowerCase() : ""}
            {selectedEvent ? (
              <>
                {ui("event_for", locale)} <span>&quot;<EmojiText text={selectedEvent.title} />&quot;</span>
              </>
            ) : ""}
          </span>
          {selectedEvent ? (
            <span className="attendees-count-inline" aria-live="polite">
              {statusMode === "cancelled" ? ui("attendees_cancelled_count", locale) : ui("attendees_count", locale)}: {currentAttendees.length}
            </span>
          ) : null}
        </h2>
        {viewMode === "table" && statusMode === "active" ? (
          <p className="text-xs text-muted">
            {locale === "ru"
              ? "Прокрутите таблицу по горизонтали, чтобы увидеть все поля."
              : "Scroll the table horizontally to see all fields."}
          </p>
        ) : null}
        {!selectedEvent ? (
          <EmptyState message={ui("attendees_need_event", locale)} />
        ) : currentAttendees.length === 0 ? (
          <EmptyState message={statusMode === "cancelled" ? ui("attendees_cancelled_empty", locale) : ui("no_attendees", locale)} />
        ) : statusMode === "cancelled" ? (
          <ul className="grid gap-2">
            {currentAttendees.map((attendee) => (
              <li key={attendee.userId} className="rounded-xl border border-border bg-surface-elevated p-3 text-sm text-text">
                <strong>{attendee.fullName}</strong>
                {attendee.username ? ` (@${attendee.username})` : ""}
                {" - "}
                {ui("attendees_tab_cancelled", locale).toLowerCase()}
              </li>
            ))}
          </ul>
        ) : viewMode === "list" ? (
          <ul className="grid gap-2">
            {currentAttendees.map((attendee) => (
              <li key={attendee.userId} className="rounded-xl border border-border bg-surface-elevated p-3 text-sm text-text">
                <strong>{attendee.fullName}</strong>
                {attendee.username ? ` (@${attendee.username})` : ""} - {attendee.status}
                {attendee.checkedIn ? ` - ${ui("checked_in_mark", locale)}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <AttendeesTable
            eventId={selectedEventId ?? ""}
            attendees={currentAttendees}
            organizationId={selectedOrganizationId ?? ""}
            density={densityMode}
          />
        )}
      </Panel>
    </>
  );
}
