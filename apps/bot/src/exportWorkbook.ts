import ExcelJS from "exceljs";
import type { EventAttendeeEntity, WaitlistEntryEntity } from "@event/shared";

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export async function buildEventExportWorkbook(
  eventId: string,
  attendees: EventAttendeeEntity[],
  waitlist: WaitlistEntryEntity[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "telegram-event-registration-service";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Attendees");

  const rows: Array<Record<string, string>> = [];

  for (const attendee of attendees) {
    rows.push({
      rowType: "attendee",
      eventId,
      userId: attendee.userId,
      fullName: attendee.fullName,
      username: attendee.username ?? "",
      telegramId: attendee.telegramId ? String(attendee.telegramId) : "",
      registrationStatus: attendee.status,
      paymentStatus: attendee.paymentStatus,
      checkedIn: attendee.checkedIn ? "true" : "false",
      displayOrder: attendee.displayOrder == null ? "" : String(attendee.displayOrder),
      rowColor: attendee.rowColor ?? "",
      registeredAt: attendee.registeredAt,
      waitlistPosition: "",
      waitlistCreatedAt: "",
      answerCreatedAt: "",
      questionId: "",
      questionVersion: "",
      questionPrompt: "",
      answerText: "",
      isSkipped: ""
    });

    for (const answer of attendee.answers ?? []) {
      rows.push({
        rowType: "answer",
        eventId,
        userId: attendee.userId,
        fullName: attendee.fullName,
        username: attendee.username ?? "",
        telegramId: attendee.telegramId ? String(attendee.telegramId) : "",
        registrationStatus: attendee.status,
        paymentStatus: attendee.paymentStatus,
        checkedIn: attendee.checkedIn ? "true" : "false",
        displayOrder: attendee.displayOrder == null ? "" : String(attendee.displayOrder),
        rowColor: attendee.rowColor ?? "",
        registeredAt: attendee.registeredAt,
        waitlistPosition: "",
        waitlistCreatedAt: "",
        answerCreatedAt: answer.createdAt,
        questionId: answer.questionId,
        questionVersion: String(answer.questionVersion),
        questionPrompt: answer.prompt,
        answerText: asText(answer.answerText),
        isSkipped: answer.isSkipped ? "true" : "false"
      });
    }
  }

  for (const item of waitlist) {
    rows.push({
      rowType: "waitlist",
      eventId,
      userId: item.userId,
      fullName: item.fullName,
      username: item.username ?? "",
      telegramId: item.telegramId ? String(item.telegramId) : "",
      registrationStatus: "waitlisted",
      paymentStatus: "",
      checkedIn: "false",
      displayOrder: "",
      rowColor: "",
      registeredAt: "",
      waitlistPosition: String(item.position),
      waitlistCreatedAt: item.createdAt,
      answerCreatedAt: "",
      questionId: "",
      questionVersion: "",
      questionPrompt: "",
      answerText: "",
      isSkipped: ""
    });
  }

  sheet.columns = [
    { header: "rowType", key: "rowType", width: 14 },
    { header: "eventId", key: "eventId", width: 18 },
    { header: "userId", key: "userId", width: 18 },
    { header: "fullName", key: "fullName", width: 28 },
    { header: "username", key: "username", width: 20 },
    { header: "telegramId", key: "telegramId", width: 16 },
    { header: "registrationStatus", key: "registrationStatus", width: 18 },
    { header: "paymentStatus", key: "paymentStatus", width: 16 },
    { header: "checkedIn", key: "checkedIn", width: 12 },
    { header: "displayOrder", key: "displayOrder", width: 12 },
    { header: "rowColor", key: "rowColor", width: 12 },
    { header: "registeredAt", key: "registeredAt", width: 24 },
    { header: "waitlistPosition", key: "waitlistPosition", width: 16 },
    { header: "waitlistCreatedAt", key: "waitlistCreatedAt", width: 24 },
    { header: "answerCreatedAt", key: "answerCreatedAt", width: 24 },
    { header: "questionId", key: "questionId", width: 18 },
    { header: "questionVersion", key: "questionVersion", width: 16 },
    { header: "questionPrompt", key: "questionPrompt", width: 32 },
    { header: "answerText", key: "answerText", width: 32 },
    { header: "isSkipped", key: "isSkipped", width: 12 }
  ];

  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
