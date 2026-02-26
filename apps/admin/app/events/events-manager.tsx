"use client";

import Link from "next/link";
import React from "react";
import type { EventItem } from "../_lib/admin-api";
import { Badge } from "../_components/ui/badge";
import { CreateEventForm } from "../create-event-form";
import { CloseButton } from "../close-button";
import { DeleteEventButton } from "../delete-event-button";
import { PublishButton } from "../publish-button";
import { EmojiText } from "../_components/emoji-text";

export function EventsManager({ events, organizationId }: { events: EventItem[]; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <CreateEventForm showTitle={false} organizationId={organizationId} />
      </section>

      <ul className="grid gap-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/events/${event.id}?${new URLSearchParams(organizationId ? { organizationId } : {}).toString()}`}
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

            <div className="mt-3 flex flex-wrap gap-2">
              {event.status === "draft" ? <PublishButton eventId={event.id} organizationId={organizationId} /> : null}
              {event.status === "published" ? <CloseButton eventId={event.id} organizationId={organizationId} /> : null}
              <DeleteEventButton eventId={event.id} organizationId={organizationId} />
            </div>
          </li>
        ))}
      </ul>

      {events.length === 0 ? (
        <p className="text-sm text-muted">
          {ru ? "Список пока пуст. Создайте первое мероприятие выше." : "No events yet. Create the first event above."}
        </p>
      ) : null}
    </div>
  );
}
