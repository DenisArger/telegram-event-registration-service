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

  it("shows missing env message", async () => {
    render(React.createElement(DeleteEventButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.");
  });

  it("deletes event and refreshes page", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ eventId: "e1" })
      })
    );

    render(React.createElement(DeleteEventButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("Event deleted.");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing when delete is not confirmed", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(DeleteEventButton, { eventId: "e1" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
