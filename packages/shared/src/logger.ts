const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = [
  "token",
  "secret",
  "password",
  "authorization",
  "cookie",
  "api_key",
  "service_role_key"
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((item) => normalized.includes(item));
}

function redactValue(value: unknown): unknown {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redactValue(nested);
    }
    return out;
  }

  return value;
}

export function logInfo(message: string, payload?: unknown): void {
  console.log(JSON.stringify({ level: "info", message, payload: redactValue(payload), ts: new Date().toISOString() }));
}

export function logError(message: string, payload?: unknown): void {
  console.error(JSON.stringify({ level: "error", message, payload: redactValue(payload), ts: new Date().toISOString() }));
}
