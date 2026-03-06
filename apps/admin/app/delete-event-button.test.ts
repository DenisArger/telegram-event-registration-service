// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeleteEventButton } from "./delete-event-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("DeleteEventButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    refresh.mockClear();
  });

  it("deletes via same-origin api when public base is not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ eventId: "e1" })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(DeleteEventButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    await screen.findByText("Event deleted.");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/api/admin/events");
  });

  it("deletes event and refreshes page", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ eventId: "e1" })
      })
    );

    render(React.createElement(DeleteEventButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    await screen.findByText("Event deleted.");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing when delete is not confirmed", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(DeleteEventButton, { eventId: "e1" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
