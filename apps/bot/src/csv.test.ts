import { describe, expect, it } from "vitest";
import { buildEventExportCsv } from "./csv";

describe("buildEventExportCsv", () => {
  it("renders attendees and waitlist rows", () => {
    const csv = buildEventExportCsv(
      "event-1",
      [
        {
          userId: "u1",
          fullName: "John Doe",
          username: "john",
          telegramId: 123,
          status: "registered",
          paymentStatus: "mock_paid",
          registeredAt: "2026-02-18T10:00:00Z",
          checkedIn: true
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

    expect(csv).toContain("row_type,event_id,user_id");
    expect(csv).toContain("attendee,event-1,u1");
    expect(csv).toContain("waitlist,event-1,u2");
  });

  it("escapes comma and quotes", () => {
    const csv = buildEventExportCsv(
      "event-1",
      [
        {
          userId: "u1",
          fullName: "John, \"Danger\" Doe",
          username: "john",
          telegramId: 123,
          status: "registered",
          paymentStatus: "mock_paid",
          registeredAt: "2026-02-18T10:00:00Z",
          checkedIn: false
        }
      ],
      []
    );

    expect(csv).toContain("\"John, \"\"Danger\"\" Doe\"");
  });
});
