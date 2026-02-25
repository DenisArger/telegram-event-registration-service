// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrganizationMembersManager } from "./organization-members-manager";

const initialMembers = [
  {
    organizationId: "11111111-1111-4111-8111-111111111111",
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "owner" as const,
    createdAt: "2026-02-25T10:00:00Z",
    fullName: "Alice",
    username: "alice",
    telegramId: 1001
  },
  {
    organizationId: "11111111-1111-4111-8111-111111111111",
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    role: "admin" as const,
    createdAt: "2026-02-25T10:10:00Z",
    fullName: "Bob",
    username: "bob",
    telegramId: 1002
  }
];

describe("OrganizationMembersManager", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_LOCALE;
  });

  it("skips delete request when confirm is cancelled", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        initialMembers={initialMembers}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows API message on ownership transfer failure (409)", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Cannot transfer ownership" })
      })
    );

    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        initialMembers={initialMembers}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Select member"), {
      target: { value: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Transfer" }));

    await screen.findByText("Cannot transfer ownership");
  });

  it("shows API message on delete failure (404)", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Organization member not found" })
      })
    );

    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        initialMembers={initialMembers}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    await screen.findByText("Organization member not found");
  });

  it("promotes admin to owner and refreshes member list", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "owner" }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          members: [
            initialMembers[0],
            {
              ...initialMembers[1],
              role: "owner"
            }
          ]
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        initialMembers={initialMembers}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Promote to owner" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe("https://api.example/api/admin/organization-members");
    const payload = JSON.parse((firstCall?.[1] as any).body);
    expect(payload).toEqual({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      role: "owner"
    });
  });

  it("demotes owner to admin", async () => {
    process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL = "https://api.example";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin" }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          members: [
            {
              ...initialMembers[0],
              role: "admin"
            },
            initialMembers[1]
          ]
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        initialMembers={initialMembers}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Demote to admin" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const firstCall = fetchMock.mock.calls[0];
    const payload = JSON.parse((firstCall?.[1] as any).body);
    expect(payload).toEqual({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "admin"
    });
  });

  it("disables remove button for current user", () => {
    render(
      <OrganizationMembersManager
        organizationId="11111111-1111-4111-8111-111111111111"
        currentUserId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        initialMembers={initialMembers}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    const firstRemove = removeButtons[0];
    if (!firstRemove) throw new Error("Remove button not found");
    expect(firstRemove.hasAttribute("disabled")).toBe(true);
    expect(firstRemove.getAttribute("title")).toContain("Cannot remove yourself.");
  });
});
