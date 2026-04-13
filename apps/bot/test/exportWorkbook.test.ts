import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildEventExportWorkbook } from "../src/exportWorkbook";

describe("buildEventExportWorkbook", () => {
  it("writes attendee, answer and waitlist rows with timestamps", async () => {
    const buffer = await buildEventExportWorkbook(
      "event-1",
      [
        {
          userId: "u1",
          fullName: "John Doe",
          username: "john",
          telegramId: 123,
          displayOrder: 2,
          rowColor: "#FFEEAA",
          status: "registered",
          paymentStatus: "mock_paid",
          registeredAt: "2026-02-18T10:00:00Z",
          checkedIn: true,
          answers: [
            {
              questionId: "q1",
              questionVersion: 1,
              prompt: "Why join?",
              answerText: "Networking",
              isSkipped: false,
              createdAt: "2026-02-18T10:01:00Z"
            }
          ]
        }
      ],
      [
        {
          userId: "u2",
          fullName: "Jane Wait",
          username: null,
          telegramId: null,
          position: 1,
          createdAt: "2026-02-18T10:05:00Z"
        }
      ]
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Attendees");

    expect(sheet).toBeTruthy();
    expect(sheet?.getRow(1).values).toContain("registeredAt");
    expect(sheet?.getRow(1).values).toContain("waitlistCreatedAt");
    expect(sheet?.getRow(1).values).toContain("questionPrompt");

    expect(sheet?.rowCount).toBe(4);
    expect(sheet?.getRow(2).getCell(12).value).toBe("2026-02-18T10:00:00Z");
    expect(sheet?.getRow(3).getCell(15).value).toBe("2026-02-18T10:01:00Z");
    expect(sheet?.getRow(3).getCell(18).value).toBe("Why join?");
    expect(sheet?.getRow(4).getCell(14).value).toBe("2026-02-18T10:05:00Z");
  });
});
