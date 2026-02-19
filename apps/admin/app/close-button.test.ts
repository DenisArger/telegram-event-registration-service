// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CloseButton } from "./close-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("CloseButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    refresh.mockClear();
  });

  it("shows missing env message", async () => {
    render(React.createElement(CloseButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText("Missing NEXT_PUBLIC admin env.");
  });

  it("closes event and refreshes page", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ event: { id: "e1", status: "closed" } })
      })
    );

    render(React.createElement(CloseButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText("Event closed.");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("handles api and network failures", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Forbidden" }) })
        .mockRejectedValueOnce(new Error("network"))
    );

    render(React.createElement(CloseButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText("Forbidden");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText("Network error.");
  });
});
