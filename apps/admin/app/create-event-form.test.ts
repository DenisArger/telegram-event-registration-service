// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateEventForm } from "./create-event-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("CreateEventForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    refresh.mockClear();
  });

  it("shows missing env message", async () => {
    render(React.createElement(CreateEventForm));

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL or NEXT_PUBLIC_ADMIN_REQUEST_EMAIL.");
  });

  it("validates required fields", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";
    render(React.createElement(CreateEventForm));

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await screen.findByText("Event title is required.");
  });

  it("creates event and refreshes page", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ event: { id: "e1" } }) });
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CreateEventForm));
    fireEvent.change(screen.getByPlaceholderText("Event title"), { target: { value: "Team Meetup" } });
    fireEvent.change(screen.getByPlaceholderText("startsAt"), { target: { value: "2026-03-01T10:00" } });
    fireEvent.change(screen.getByPlaceholderText("Capacity (optional)"), { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await screen.findByText("Event created in draft status.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("calls onCreated callback on successful create", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";
    const onCreated = vi.fn();

    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ event: { id: "e1" } }) });
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CreateEventForm, { onCreated }));
    fireEvent.change(screen.getByPlaceholderText("Event title"), { target: { value: "Team Meetup" } });
    fireEvent.change(screen.getByPlaceholderText("startsAt"), { target: { value: "2026-03-01T10:00" } });
    fireEvent.change(screen.getByPlaceholderText("Capacity (optional)"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await screen.findByText("Event created in draft status.");
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("handles api and network errors", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Custom API error" }) })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetch);

    render(React.createElement(CreateEventForm));
    fireEvent.change(screen.getByPlaceholderText("Event title"), { target: { value: "Team Meetup" } });
    fireEvent.change(screen.getByPlaceholderText("startsAt"), { target: { value: "2026-03-01T10:00" } });
    fireEvent.change(screen.getByPlaceholderText("Capacity (optional)"), { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    await screen.findByText("Custom API error");

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    await screen.findByText("Network error.");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create event" }).hasAttribute("disabled")).toBe(false);
    });
  });
});
