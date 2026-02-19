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
  const header: string[] = [
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

  const attendeeRows: string[][] = attendees.map((item) => [
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

  const waitlistRows: string[][] = waitlist.map((item) => [
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

  const answerRows: string[][] = attendees.flatMap((item) =>
    (item.answers ?? []).map((answer) => [
      "answer",
      eventId,
      item.userId,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      answer.createdAt,
      answer.questionId,
      String(answer.questionVersion),
      answer.prompt,
      answer.answerText ?? "",
      answer.isSkipped ? "true" : "false"
    ])
  );

  const extendedHeader: string[] = [
    ...header,
    "question_id",
    "question_version",
    "question_prompt",
    "answer_text",
    "is_skipped"
  ];

  const attendeeRowsExtended: string[][] = attendeeRows.map((row) => [...row, "", "", "", "", ""]);
  const waitlistRowsExtended: string[][] = waitlistRows.map((row) => [...row, "", "", "", "", ""]);

  const rows: string[][] = [extendedHeader, ...attendeeRowsExtended, ...waitlistRowsExtended, ...answerRows];
  return rows
    .map((row) => row.map((v: string) => escapeCsv(v)).join(","))
    .join("\n");
}
