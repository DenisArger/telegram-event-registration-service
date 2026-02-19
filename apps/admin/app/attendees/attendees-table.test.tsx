// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AttendeesTable } from "./attendees-table";

const attendees = [
  {
    userId: "11111111-1111-4111-8111-111111111111",
    fullName: "John",
    username: "john",
    displayOrder: 1,
    status: "registered" as const,
    registeredAt: "2026-02-19T10:00:00Z",
    checkedIn: true,
    answers: [
      {
        questionId: "q1",
        questionVersion: 1,
        prompt: "Why?",
        answerText: "Because",
        isSkipped: false,
        createdAt: "2026"
      }
    ]
  },
  {
    userId: "22222222-2222-4222-8222-222222222222",
    fullName: "Jane",
    username: "jane",
    displayOrder: 2,
    status: "cancelled" as const,
    registeredAt: "2026-02-19T11:00:00Z",
    checkedIn: false,
    answers: []
  }
];

describe("AttendeesTable", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
  });

  it("reorders rows and persists order", async () => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);

    const handles = screen.getAllByRole("button").filter((item) => item.textContent?.includes("⋮⋮"));
    fireEvent.dragStart(handles[0], { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId(`attendee-row-${attendees[1].userId}`));

    await vi.runAllTimersAsync();
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example/api/admin/attendees",
        expect.objectContaining({ method: "PUT" })
      );

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.orderedUserIds).toEqual([attendees[1].userId, attendees[0].userId]);
  });

  it("rolls back row order when persistence fails", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "failed" })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);

    const handles = screen.getAllByRole("button").filter((item) => item.textContent?.includes("⋮⋮"));
    fireEvent.dragStart(handles[0], { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId(`attendee-row-${attendees[1].userId}`));

    const rowsAfterDrop = Array.from(document.querySelectorAll("tbody tr"));
    expect(rowsAfterDrop[0]?.textContent).toContain("Jane");

    await new Promise((resolve) => setTimeout(resolve, 700));

    const rowsAfterRollback = Array.from(document.querySelectorAll("tbody tr"));
    expect(rowsAfterRollback[0]?.textContent).toContain("John");
  });
});
