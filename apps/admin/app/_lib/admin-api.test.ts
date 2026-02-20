import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdminEventById,
  getAdminEvents,
  getAttendees,
  getHealth,
  getStats,
  getWaitlist
} from "./admin-api";

describe("admin-api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_BOT_HEALTH_URL;
    delete process.env.ADMIN_API_BASE_URL;
    delete process.env.ADMIN_REQUEST_EMAIL;
  });

  it("getHealth returns unknown when env is missing", async () => {
    await expect(getHealth()).resolves.toContain("unknown");
  });

  it("getHealth handles ok/down/network", async () => {
    process.env.NEXT_PUBLIC_BOT_HEALTH_URL = "https://health.example";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true }));
    await expect(getHealth()).resolves.toBe("ok");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }));
    await expect(getHealth()).resolves.toBe("down (503)");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network")));
    await expect(getHealth()).resolves.toBe("down (network error)");
  });

  it("getAdminEvents returns [] without config and on non-ok", async () => {
    await expect(getAdminEvents()).resolves.toEqual([]);

    process.env.ADMIN_API_BASE_URL = "https://api.example";
    process.env.ADMIN_REQUEST_EMAIL = "admin@example.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }));

    await expect(getAdminEvents()).resolves.toEqual([]);
  });

  it("getAdminEvents returns events on success", async () => {
    process.env.ADMIN_API_BASE_URL = "https://api.example";
    process.env.ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [{ id: "e1", title: "T", startsAt: "", status: "published", capacity: 1 }] })
      })
    );

    const events = await getAdminEvents();
    expect(events).toEqual([{ id: "e1", title: "T", startsAt: "", status: "published", capacity: 1 }]);
  });

  it("getAdminEventById handles 404 and success", async () => {
    process.env.ADMIN_API_BASE_URL = "https://api.example";
    process.env.ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ status: 404, ok: false }));
    await expect(getAdminEventById("e1")).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ event: { id: "e1", title: "T", startsAt: "", status: "draft", capacity: null } })
      })
    );
    await expect(getAdminEventById("e1")).resolves.toEqual({ id: "e1", title: "T", startsAt: "", status: "draft", capacity: null });
  });

  it("getAttendees/getWaitlist/getStats map successful payloads", async () => {
    process.env.ADMIN_API_BASE_URL = "https://api.example";
    process.env.ADMIN_REQUEST_EMAIL = "admin@example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ attendees: [{ userId: "u1", fullName: "John", username: "john", displayOrder: 1, rowColor: null, status: "registered", registeredAt: "2026", checkedIn: true }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ waitlist: [{ userId: "u2", fullName: "Jane", username: null, position: 1 }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ stats: { registeredCount: 1, checkedInCount: 1, waitlistCount: 0, noShowRate: 0 } }) })
    );

    const attendees = await getAttendees("e1");
    const waitlist = await getWaitlist("e1");
    const stats = await getStats("e1");

    expect(attendees[0]?.userId).toBe("u1");
    expect(waitlist[0]?.userId).toBe("u2");
    expect(stats?.registeredCount).toBe(1);
  });
});
