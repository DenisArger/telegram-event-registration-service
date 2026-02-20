// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EventEditor } from "./event-editor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

vi.mock("../publish-button", () => ({
  PublishButton: () => React.createElement("span", null, "publish")
}));
vi.mock("../close-button", () => ({
  CloseButton: () => React.createElement("span", null, "close")
}));
vi.mock("../event-questions-editor", () => ({
  EventQuestionsEditor: () => React.createElement("span", null, "questions")
}));
vi.mock("../_components/markdown-preview", () => ({
  MarkdownPreview: ({ markdown }: { markdown: string }) => React.createElement("div", null, markdown)
}));

const baseEvent = {
  id: "e1",
  title: "Title",
  startsAt: "2026-02-19T10:30:00.000Z",
  endsAt: "2026-02-19T11:30:00.000Z",
  capacity: 10,
  status: "draft" as const
};

describe("EventEditor", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_LOCALE;
  });

  it("shows missing env message", async () => {
    render(<EventEditor event={baseEvent} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.");
  });

  it("validates required title", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    render(<EventEditor event={baseEvent} />);
    fireEvent.change(screen.getAllByPlaceholderText("title")[0]!, { target: { value: "  " } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    await screen.findByText("Event title is required.");
  });

  it("saves event and refreshes router", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ event: { id: "e1" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EventEditor event={baseEvent} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(refresh).toHaveBeenCalled();
    await screen.findByText("Event updated.");
  });

  it("validates start/end/capacity and shows server and network errors", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "bad update" }) })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    render(<EventEditor event={baseEvent} />);

    fireEvent.change(screen.getAllByPlaceholderText("capacity (optional)")[0]!, { target: { value: "0" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);
    await screen.findByText("Capacity must be a positive integer.");

    fireEvent.change(screen.getAllByPlaceholderText("capacity (optional)")[0]!, { target: { value: "12" } });
    fireEvent.change(screen.getAllByPlaceholderText("startsAt")[0]!, { target: { value: "2026-02-19T11:00" } });
    fireEvent.change(screen.getAllByPlaceholderText("endsAt")[0]!, { target: { value: "2026-02-19T10:00" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);
    await screen.findByText("End date must be later than start date.");

    fireEvent.change(screen.getAllByPlaceholderText("startsAt")[0]!, { target: { value: "2026-02-19T10:00" } });
    fireEvent.change(screen.getAllByPlaceholderText("endsAt")[0]!, { target: { value: "2026-02-19T11:00" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);
    await screen.findByText("bad update");

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);
    await screen.findByText("Network error.");
  });

  it("renders close action for published event and ru locale message", async () => {
    process.env.NEXT_PUBLIC_LOCALE = "ru";
    const publishedEvent = { ...baseEvent, status: "published" as const };

    render(<EventEditor event={publishedEvent} />);
    expect(screen.getByText("close")).toBeTruthy();
    expect(screen.queryByText("publish")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await screen.findByText("Не задан NEXT_PUBLIC_ADMIN_API_BASE_URL.");
  });
});
