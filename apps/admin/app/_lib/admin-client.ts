export function getClientAdminApiBase(): string | null {
  const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
  if (!base) return null;
  return base;
}

export function missingClientApiBaseMessage(ru: boolean): string {
  return ru
    ? "Не задан NEXT_PUBLIC_ADMIN_API_BASE_URL."
    : "Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.";
}
