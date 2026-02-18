import type { EventAttendeeEntity, WaitlistEntryEntity } from "@event/shared";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export function buildEventExportCsv(
  eventId: string,
  attendees: EventAttendeeEntity[],
  waitlist: WaitlistEntryEntity[]
): string {
  const header = [
    "row_type",
    "event_id",
    "user_id",
    "full_name",
    "username",
    "telegram_id",
    "registration_status",
    "payment_status",
    "checked_in",
    "waitlist_position",
    "created_at"
  ];

  const attendeeRows = attendees.map((item) => [
    "attendee",
    eventId,
    item.userId,
    item.fullName,
    item.username ?? "",
    item.telegramId ? String(item.telegramId) : "",
    item.status,
    item.paymentStatus,
    item.checkedIn ? "true" : "false",
    "",
    item.registeredAt
  ]);

  const waitlistRows = waitlist.map((item) => [
    "waitlist",
    eventId,
    item.userId,
    item.fullName,
    item.username ?? "",
    item.telegramId ? String(item.telegramId) : "",
    "waitlisted",
    "",
    "false",
    String(item.position),
    item.createdAt
  ]);

  const rows = [header, ...attendeeRows, ...waitlistRows];
  return rows
    .map((row) => row.map((v) => escapeCsv(String(v))).join(","))
    .join("\n");
}
