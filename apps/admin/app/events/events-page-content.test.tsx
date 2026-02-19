// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../create-event-form", () => ({
  CreateEventForm: ({ onCreated }: { onCreated?: () => void }) => (
    <button onClick={() => onCreated?.()}>submit-create</button>
  )
}));
vi.mock("../publish-button", () => ({
  PublishButton: () => <span>publish</span>
}));
vi.mock("../close-button", () => ({
  CloseButton: () => <span>close</span>
}));
vi.mock("../event-questions-editor", () => ({
  EventQuestionsEditor: () => <span>editor</span>
}));

import { EventsPageContent } from "./events-page-content";

describe("EventsPageContent", () => {
  it("opens and closes create modal", () => {
    render(
      <EventsPageContent
        locale="en"
        events={[{ id: "e1", title: "Team", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "submit-create" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
