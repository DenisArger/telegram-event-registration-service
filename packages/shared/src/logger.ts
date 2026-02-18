export function logInfo(message: string, payload?: unknown): void {
  console.log(JSON.stringify({ level: "info", message, payload, ts: new Date().toISOString() }));
}

export function logError(message: string, payload?: unknown): void {
  console.error(JSON.stringify({ level: "error", message, payload, ts: new Date().toISOString() }));
}
