import type { EventItem } from "./admin-api";

export function resolveSelectedEventId(
  searchParams: { eventId?: string | string[] } | undefined,
  events: EventItem[]
): string | null {
  if (events.length === 0) return null;

  const raw = searchParams?.eventId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && events.some((event) => event.id === value)) {
    return value;
  }

  return events[0]?.id ?? null;
}
