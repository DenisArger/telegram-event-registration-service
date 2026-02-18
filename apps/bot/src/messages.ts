import type { EventEntity, RegisterForEventResult } from "@event/shared";

export function buildEventMessage(event: EventEntity): string {
  return [
    `📅 ${event.title}`,
    `🕒 ${new Date(event.startsAt).toLocaleString()}`,
    `👥 Capacity: ${event.capacity}`,
    event.description ? `📝 ${event.description}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function registrationStatusToText(result: RegisterForEventResult): string {
  if (result.status === "registered") {
    return "You are registered ✅";
  }
  if (result.status === "waitlisted") {
    return `Event is full. Added to waitlist (#${result.position ?? "?"})`;
  }
  if (result.status === "already_registered") {
    return "You are already registered.";
  }
  return "You are already in waitlist.";
}
