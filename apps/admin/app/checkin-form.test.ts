// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckInForm } from "./checkin-form";

describe("CheckInForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
  });

  it("shows missing env message", async () => {
    render(React.createElement(CheckInForm));

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));

    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.");
  });

  it("validates required fields", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    render(React.createElement(CheckInForm));

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));

    await screen.findByText("eventId and userId are required.");
  });

  it("handles successful and already-checked-in responses", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "checked_in" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "already_checked_in" }) });
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CheckInForm, { initialEventId: "e1" }));
    fireEvent.change(screen.getByPlaceholderText("userId"), { target: { value: "u1" } });

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));
    await screen.findByText("Check-in successful.");

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));
    await screen.findByText("Already checked in.");

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("allows editing prefilled eventId", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: "checked_in" }) });
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CheckInForm, { initialEventId: "e1" }));
    fireEvent.change(screen.getByPlaceholderText("eventId"), { target: { value: "e2" } });
    fireEvent.change(screen.getByPlaceholderText("userId"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));

    await screen.findByText("Check-in successful.");
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({ eventId: "e2", userId: "u1", method: "manual" })
    });
  });

  it("handles api and network errors", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Custom API error" }) })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CheckInForm));
    fireEvent.change(screen.getByPlaceholderText("eventId"), { target: { value: "e1" } });
    fireEvent.change(screen.getByPlaceholderText("userId"), { target: { value: "u1" } });

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));
    await screen.findByText("Custom API error");

    fireEvent.click(screen.getByRole("button", { name: "Check in attendee" }));
    await screen.findByText("Network error.");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Check in attendee" }).hasAttribute("disabled")).toBe(false);
    });
  });
});
