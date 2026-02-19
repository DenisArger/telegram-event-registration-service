// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AttendeeDrawer } from "./attendee-drawer";

const attendee = {
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
};

describe("AttendeeDrawer", () => {
  it("renders details and closes by button", () => {
    const onClose = vi.fn();
    render(<AttendeeDrawer attendee={attendee} onClose={onClose} />);

    expect(screen.getByText("Attendee details")).toBeTruthy();
    expect(screen.getByText("Why?: Because")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes by escape key", () => {
    const onClose = vi.fn();
    render(<AttendeeDrawer attendee={attendee} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
