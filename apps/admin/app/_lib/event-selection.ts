import type { EventItem, OrganizationItem } from "./admin-api";

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

export function resolveSelectedOrganizationId(
  searchParams: { organizationId?: string | string[] } | undefined,
  organizations: OrganizationItem[]
): string | null {
  if (organizations.length === 0) return null;

  const raw = searchParams?.organizationId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && organizations.some((item) => item.id === value)) {
    return value;
  }

  return organizations[0]?.id ?? null;
}
