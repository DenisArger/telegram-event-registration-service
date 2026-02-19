"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { EventItem } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";

interface EventSelectorProps {
  events: EventItem[];
  selectedEventId: string | null;
  basePath: string;
}

export function EventSelector({ events, selectedEventId, basePath }: EventSelectorProps) {
  const router = useRouter();
  const locale = getUiLocale();

  if (events.length === 0) {
    return <p>{ui("no_events_for_select", locale)}</p>;
  }

  return (
    <label className="event-selector">
      <span>{ui("select_event", locale)}:</span>
      <select
        value={selectedEventId ?? events[0]?.id ?? ""}
        onChange={(e) => router.push(`${basePath}?eventId=${encodeURIComponent(e.target.value)}`)}
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </select>
    </label>
  );
}
