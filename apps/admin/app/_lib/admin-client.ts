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

export async function promoteWaitlistAttendee(
  eventId: string,
  userId: string,
  organizationId?: string
): Promise<{ status?: "promoted" | "empty_waitlist" | "not_found"; user_id?: string; requestId?: string } | null> {
  const base = getClientAdminApiBase();
  console.debug("[waitlist-promote] client base", { base, eventId, userId, organizationId });
  if (!base) {
    console.debug("[waitlist-promote] missing base");
    return null;
  }

  try {
    const payload = {
      eventId,
      userId,
      ...(organizationId ? { organizationId } : {})
    };
    console.debug("[waitlist-promote] request", { url: `${base}/api/admin/promote-waitlist-user`, payload });
    const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const response = await fetch(`${base}/api/admin/promote-waitlist-user`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    console.debug("[waitlist-promote] response", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      requestId
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.debug("[waitlist-promote] error payload", payload);
      return {
        status: payload?.status ?? "not_found",
        user_id: payload?.user_id,
        requestId
      };
    }
    const data = (await response.json()) as { status?: "promoted" | "empty_waitlist" | "not_found"; user_id?: string };
    console.debug("[waitlist-promote] success payload", { ...data, requestId });
    return { ...data, requestId };
  } catch {
    console.debug("[waitlist-promote] network error");
    return null;
  }
}
