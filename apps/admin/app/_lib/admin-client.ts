export function getClientAdminApiBase(): string | null {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
  if (!base) return null;
  return base;
}

export function missingClientApiBaseMessage(ru: boolean): string {
  return ru
    ? "Не задан NEXT_PUBLIC_ADMIN_API_BASE_URL."
    : "Missing NEXT_PUBLIC_ADMIN_API_BASE_URL.";
}

export async function cancelAttendeeRegistration(
  eventId: string,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  const base = getClientAdminApiBase();
  if (!base) return false;

  try {
    const response = await fetch(`${base}/api/admin/attendees`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        eventId,
        userId,
        ...(organizationId ? { organizationId } : {})
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
