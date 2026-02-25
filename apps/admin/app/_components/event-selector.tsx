"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { EventItem } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";
import { EmptyState } from "./ui/empty-state";
import { Field, Select } from "./ui/field";

interface EventSelectorProps {
  events: EventItem[];
  selectedEventId: string | null;
  basePath: string;
  organizationId?: string | null;
  view?: string | null;
}

export function EventSelector({ events, selectedEventId, basePath, organizationId, view }: EventSelectorProps) {
  const router = useRouter();
  const locale = getUiLocale();

  if (events.length === 0) {
    return <EmptyState message={ui("no_events_for_select", locale)} />;
  }

  return (
    <Field label={ui("select_event", locale)}>
      <Select
        value={selectedEventId ?? events[0]?.id ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams();
          params.set("eventId", e.target.value);
          if (organizationId) params.set("organizationId", organizationId);
          if (view) params.set("view", view);
          router.push(`${basePath}?${params.toString()}`);
        }}
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}
