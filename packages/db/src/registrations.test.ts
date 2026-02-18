import { describe, expect, it, vi } from "vitest";
import { cancelRegistration, registerForEvent } from "./registrations";

describe("registrations rpc", () => {
  it("calls register_for_event rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "registered" }, error: null }));
    const db = { rpc } as any;

    const result = await registerForEvent(db, "e1", "u1");

    expect(rpc).toHaveBeenCalledWith("register_for_event", {
      p_event_id: "e1",
      p_user_id: "u1"
    });
    expect(result.status).toBe("registered");
  });

  it("throws when register rpc fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const db = { rpc } as any;

    await expect(registerForEvent(db, "e1", "u1")).rejects.toThrow("boom");
  });

  it("calls cancel_registration rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "cancelled" }, error: null }));
    const db = { rpc } as any;

    const result = await cancelRegistration(db, "e1", "u1");

    expect(rpc).toHaveBeenCalledWith("cancel_registration", {
      p_event_id: "e1",
      p_user_id: "u1"
    });
    expect(result.status).toBe("cancelled");
  });

  it("throws when cancel rpc fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const db = { rpc } as any;

    await expect(cancelRegistration(db, "e1", "u1")).rejects.toThrow("boom");
  });
});
