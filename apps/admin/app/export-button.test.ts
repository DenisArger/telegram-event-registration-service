// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExportButton } from "./export-button";

describe("ExportButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
  });

  it("shows missing env message", async () => {
    render(React.createElement(ExportButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await screen.findByText("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.");
  });

  it("handles failed response", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Export not allowed" })
      })
    );

    render(React.createElement(ExportButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await screen.findByText("Export not allowed");
  });

  it("downloads csv on success", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const createObjectURL = vi.fn(() => "blob:url");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL } as any);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["csv"]) 
      })
    );

    render(React.createElement(ExportButton, { eventId: "e1" }));

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await screen.findByText("CSV downloaded.");

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");
  });

  it("handles network error", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    render(React.createElement(ExportButton, { eventId: "e1" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await screen.findByText("Network error.");
  });
});
