import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, logInfo } from "./logger";

describe("logger", () => {
  const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("writes info logs", () => {
    logInfo("info_message", { ok: true });

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const payload = String(consoleLogSpy.mock.calls[0][0]);
    expect(payload).toContain('"level":"info"');
    expect(payload).toContain('"message":"info_message"');
  });

  it("writes error logs", () => {
    logError("error_message", { ok: false });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const payload = String(consoleErrorSpy.mock.calls[0][0]);
    expect(payload).toContain('"level":"error"');
    expect(payload).toContain('"message":"error_message"');
  });

  it("redacts sensitive payload keys", () => {
    logInfo("secure_log", {
      token: "abc",
      nested: { api_key: "123" },
      safe: "value"
    });

    const payload = String(consoleLogSpy.mock.calls[0][0]);
    expect(payload).toContain('"token":"[REDACTED]"');
    expect(payload).toContain('"api_key":"[REDACTED]"');
    expect(payload).toContain('"safe":"value"');
  });

  it("does not throw on circular payload", () => {
    const data: Record<string, unknown> = { ok: true };
    data.self = data;

    expect(() => logError("circular", data)).not.toThrow();
    const payload = String(consoleErrorSpy.mock.calls[0][0]);
    expect(payload).toContain('"self":"[Circular]"');
  });

  it("does not throw on unreadable getter payload", () => {
    const data: Record<string, unknown> = {};
    Object.defineProperty(data, "broken", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() => logError("getter", data)).not.toThrow();
    const payload = String(consoleErrorSpy.mock.calls[0][0]);
    expect(payload).toContain('"broken":"[Getter]"');
  });
});
