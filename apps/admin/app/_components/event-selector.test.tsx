// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventSelector } from "./event-selector";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

describe("EventSelector", () => {
  it("renders empty state", () => {
    render(React.createElement(EventSelector, { events: [], selectedEventId: null, basePath: "/stats" }));
    expect(screen.getByText("No events available to select.")).toBeTruthy();
  });

  it("pushes route with eventId on select change", () => {
    render(
      React.createElement(EventSelector, {
        events: [
          { id: "e1", title: "First", startsAt: "", status: "published", capacity: 1 },
          { id: "e2", title: "Second", startsAt: "", status: "published", capacity: 1 }
        ],
        selectedEventId: "e1",
        basePath: "/stats"
      })
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "e2" } });
    expect(push).toHaveBeenCalledWith("/stats?eventId=e2");
  });
});
