// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EventQuestionsEditor } from "./event-questions-editor";

describe("EventQuestionsEditor", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    delete process.env.NEXT_PUBLIC_LOCALE;
  });

  it("shows missing env message on save", async () => {
    render(<EventQuestionsEditor eventId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));
    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL or NEXT_PUBLIC_ADMIN_REQUEST_EMAIL.");
  });

  it("loads and saves questions", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [{ id: "q1", prompt: "Why?", isRequired: true, position: 1 }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [{ id: "q1", prompt: "Updated", isRequired: false, position: 1 }] })
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<EventQuestionsEditor eventId="e1" />);

    const input = await screen.findByDisplayValue("Why?");
    fireEvent.change(input, { target: { value: "Updated" } });

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall?.[0]).toBe("https://api.example/api/admin/event-questions");
    const body = JSON.parse((secondCall?.[1] as any).body);
    expect(body).toEqual({
      eventId: "e1",
      questions: [{ id: "q1", prompt: "Updated", required: false }]
    });

    await screen.findByText("Questions saved.");
  });

  it("shows load error message", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Failed custom" })
      })
    );

    render(<EventQuestionsEditor eventId="e1" />);
    await screen.findByText("Failed custom");
  });
});
