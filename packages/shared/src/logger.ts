const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const UNREADABLE = "[Unreadable]";
const GETTER = "[Getter]";
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
  return redactValueSafe(value, new WeakSet<object>());
}

function redactValueSafe(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;

  if (seen.has(value as object)) return CIRCULAR;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactValueSafe(item, seen));
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }

    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "get" in descriptor && typeof descriptor.get === "function" && !("value" in descriptor)) {
        out[key] = GETTER;
        continue;
      }
      out[key] = redactValueSafe((value as Record<string, unknown>)[key], seen);
    } catch {
      out[key] = UNREADABLE;
    }
  }

  return out;
}

function toLogLine(level: "info" | "error", message: string, payload?: unknown): string {
  const base = {
    level,
    message,
    payload: redactValue(payload),
    ts: new Date().toISOString()
  };

  try {
    return JSON.stringify(base);
  } catch {
    return JSON.stringify({
      level,
      message,
      payload: UNREADABLE,
      ts: new Date().toISOString()
    });
  }
}

export function logInfo(message: string, payload?: unknown): void {
  console.log(toLogLine("info", message, payload));
}

export function logError(message: string, payload?: unknown): void {
  console.error(toLogLine("error", message, payload));
}
