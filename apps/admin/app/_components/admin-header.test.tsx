// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminHeader } from "./admin-header";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: any) =>
    React.createElement("a", { href, className }, children)
}));

const usePathname = vi.fn(() => "/attendees");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock("./logout-button", () => ({
  LogoutButton: () => React.createElement("button", null, "Log out")
}));

describe("AdminHeader", () => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  });

  afterEach(() => {
    cleanup();
  });

  it("renders navigation and marks active link", () => {
    render(<AdminHeader />);

    expect(screen.getByText("Event Registration Admin")).toBeTruthy();
    const attendeesLink = screen.getByRole("link", { name: "Attendees" });
    expect(attendeesLink.getAttribute("class") ?? "").toContain("bg-accent/15");
  });

  it("marks root as active for dashboard path", () => {
    usePathname.mockReturnValueOnce("/");
    render(<AdminHeader />);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink.getAttribute("class") ?? "").toContain("bg-accent/15");
  });
});
