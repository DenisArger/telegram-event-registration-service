import { vi } from "vitest";

export function setRequiredEnv() {
  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
}

export function createRes() {
  const res: any = {
    statusCode: 200,
    payload: undefined,
    headers: {} as Record<string, string>
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn((body: unknown) => {
    res.payload = body;
    return res;
  });

  res.send = vi.fn((body: unknown) => {
    res.payload = body;
    return res;
  });

  res.end = vi.fn(() => res);

  res.setHeader = vi.fn((key: string, value: string) => {
    res.headers[key.toLowerCase()] = value;
    return res;
  });

  return res;
}
