import Link from "next/link";
import React from "react";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAdminEvents, getAuthMe } from "../_lib/admin-api";
import { MarkdownPreview } from "../_components/markdown-preview";
import { resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";

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
    <div className="section-grid">
      <section className="card">
        <h1>{ui("events", locale)}</h1>
        <p>{ui("events_subtitle", locale)}</p>
      </section>

      <section className="card">
        <h2>{ui("events", locale)}</h2>
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/events"
        />
        {events.length === 0 ? (
          <p>{ui("no_events", locale)}</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}?${new URLSearchParams(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}).toString()}`}
                >
                  <strong>{event.title}</strong>
                </Link>{" "}
                ({event.status})
                {event.startsAt ? ` — ${new Date(event.startsAt).toLocaleString()}` : ""}
                {event.endsAt
                  ? event.startsAt
                    ? ` → ${new Date(event.endsAt).toLocaleString()}`
                    : ` — ${new Date(event.endsAt).toLocaleString()}`
                  : ""}
                {typeof event.capacity === "number" && event.capacity > 0 ? ` — cap: ${event.capacity}` : ""}
                {event.description ? <MarkdownPreview markdown={event.description} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
