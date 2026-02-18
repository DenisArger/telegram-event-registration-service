import type { UserRole } from "@event/shared";

export interface CreateEventInput {
  title: string;
  startsAt: string;
  capacity: number;
  description: string | null;
}

export function canManageEvents(role: UserRole): boolean {
  return role === "organizer" || role === "admin";
}

export function parseCreateEventCommand(raw: string): CreateEventInput {
  const payload = raw.replace(/^\/create_event\s*/i, "").trim();
  const parts = payload.split("|").map((p) => p.trim());

  if (parts.length < 3) {
    throw new Error("invalid_format");
  }

  const [title, startsAt, capacityRaw, descriptionRaw] = parts;

  if (!title) throw new Error("title_required");
  if (!startsAt) throw new Error("starts_at_required");
  if (!capacityRaw) throw new Error("capacity_required");

  const capacity = Number(capacityRaw);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("capacity_invalid");
  }

  const parsedDate = new Date(startsAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("starts_at_invalid");
  }

  return {
    title,
    startsAt: parsedDate.toISOString(),
    capacity,
    description: descriptionRaw ? descriptionRaw : null
  };
}

export function validateLifecycleTransition(
  currentStatus: "draft" | "published" | "closed",
  targetStatus: "published" | "closed"
): boolean {
  if (targetStatus === "published") return currentStatus === "draft";
  return currentStatus === "published";
}
