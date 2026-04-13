// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AttendeesTable } from "./attendees-table";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

const attendees = [
  {
    userId: "11111111-1111-4111-8111-111111111111",
    fullName: "John",
    username: "john",
    displayOrder: 1,
    rowColor: null,
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
    rowColor: "#FFE5E5",
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
    refreshMock.mockReset();
  });

  it("reorders rows and persists order", async () => {
    const firstAttendee = attendees[0];
    const secondAttendee = attendees[1];
    if (!firstAttendee || !secondAttendee) {
      throw new Error("Test attendees are not initialized");
    }

    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);

    const handles = screen.getAllByRole("button").filter((item) => item.textContent?.includes("⋮⋮"));
    const firstHandle = handles[0];
    if (!firstHandle) throw new Error("Drag handle not found");
    fireEvent.dragStart(firstHandle, { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId(`attendee-row-${secondAttendee.userId}`));

    await vi.runAllTimersAsync();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example/api/admin/attendees",
      expect.objectContaining({ method: "PUT" })
    );

    const firstCall = (fetch as any).mock.calls[0];
    if (!firstCall || !firstCall[1]) throw new Error("Fetch call not captured");
    const body = JSON.parse(firstCall[1].body);
    expect(body.orderedUserIds).toEqual([secondAttendee.userId, firstAttendee.userId]);
  });

  it("refreshes after attendee cancellation", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<AttendeesTable eventId="e1" attendees={attendees} />);
    const firstRow = screen.getByTestId(`attendee-row-${attendees[0]?.userId}`);
    fireEvent.click(firstRow);
    fireEvent.click(screen.getByRole("button", { name: "Cancel registration" }));

    await Promise.resolve();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example/api/admin/attendees",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps row order visible when persistence fails", async () => {
    const secondAttendee = attendees[1];
    if (!secondAttendee) {
      throw new Error("Test attendees are not initialized");
    }

    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "failed" })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);

    const handles = screen.getAllByRole("button").filter((item) => item.textContent?.includes("⋮⋮"));
    const firstHandle = handles[0];
    if (!firstHandle) throw new Error("Drag handle not found");
    fireEvent.dragStart(firstHandle, { dataTransfer: { setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId(`attendee-row-${secondAttendee.userId}`));

    const rowsAfterDrop = Array.from(document.querySelectorAll("tbody tr"));
    expect(rowsAfterDrop[0]?.textContent).toContain("Jane");

    await new Promise((resolve) => setTimeout(resolve, 700));

    const rowsAfterFailure = Array.from(document.querySelectorAll("tbody tr"));
    expect(rowsAfterFailure[0]?.textContent).toContain("Jane");
  });

  it("updates row color and persists colorUpdate payload", async () => {
    const firstAttendee = attendees[0];
    if (!firstAttendee) {
      throw new Error("Test attendees are not initialized");
    }

    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);
    const firstRow = screen.getByTestId(`attendee-row-${firstAttendee.userId}`);
    fireEvent.change(within(firstRow).getByLabelText("Custom color"), { target: { value: "#FFE5E5" } });
    await vi.runAllTimersAsync();

    const firstCall = (fetch as any).mock.calls[0];
    if (!firstCall || !firstCall[1]) throw new Error("Fetch call not captured");
    const payload = JSON.parse(firstCall[1].body);
    expect(payload.colorUpdate).toEqual({
      userId: firstAttendee.userId,
      rowColor: "#FFE5E5"
    });
  });

  it("rolls back row color when persistence fails", async () => {
    const firstAttendee = attendees[0];
    if (!firstAttendee) {
      throw new Error("Test attendees are not initialized");
    }

    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "failed" })
      })
    );

    render(<AttendeesTable eventId="e1" attendees={attendees} />);
    const firstRow = screen.getByTestId(`attendee-row-${firstAttendee.userId}`);
    expect(firstRow.getAttribute("style") ?? "").not.toContain("background-color");

    fireEvent.change(within(firstRow).getByLabelText("Custom color"), { target: { value: "#FFE5E5" } });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rollbackRow = screen.getByTestId(`attendee-row-${firstAttendee.userId}`);
    expect(rollbackRow.getAttribute("style") ?? "").not.toContain("background-color");
  });
});
