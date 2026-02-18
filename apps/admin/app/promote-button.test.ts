// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PromoteButton } from "./promote-button";

describe("PromoteButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
  });

  it("shows missing env message", async () => {
    render(React.createElement(PromoteButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Promote next from waitlist" }));
    await screen.findByText("Missing NEXT_PUBLIC admin env.");
  });

  it("shows waitlist empty state", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "empty_waitlist" })
      })
    );

    render(React.createElement(PromoteButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Promote next from waitlist" }));
    await screen.findByText("Waitlist is empty.");
  });

  it("shows promoted user", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "promoted", user_id: "u1" })
      })
    );

    render(React.createElement(PromoteButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Promote next from waitlist" }));
    await screen.findByText("Promoted user: u1");
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

    render(React.createElement(PromoteButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Promote next from waitlist" }));
    await screen.findByText("Forbidden");

    fireEvent.click(screen.getByRole("button", { name: "Promote next from waitlist" }));
    await screen.findByText("Network error.");
  });
});
