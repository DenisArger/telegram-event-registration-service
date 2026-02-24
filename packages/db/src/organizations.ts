import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationEntity, OrganizationMemberRole } from "@event/shared";

interface OrganizationRow {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

function mapOrganization(row: OrganizationRow): OrganizationEntity {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at
  };
}

export async function createOrganization(
  db: SupabaseClient,
  payload: {
    name: string;
    ownerUserId: string;
    telegramBotTokenEncrypted?: string | null;
  }
): Promise<OrganizationEntity> {
  const { data, error } = await db
    .from("organizations")
    .insert({
      name: payload.name,
      owner_user_id: payload.ownerUserId,
      telegram_bot_token_encrypted: payload.telegramBotTokenEncrypted ?? null
    })
    .select("id,name,owner_user_id,created_at")
    .single();

  if (error) throw error;
  return mapOrganization(data as OrganizationRow);
}

export async function listUserOrganizations(
  db: SupabaseClient,
  userId: string
): Promise<Array<OrganizationEntity & { role: OrganizationMemberRole }>> {
  const { data, error } = await db
    .from("organization_members")
    .select(
      `
      role,
      organizations!inner(
        id,
        name,
        owner_user_id,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...mapOrganization(row.organizations as OrganizationRow),
    role: row.role as OrganizationMemberRole
  }));
}

export async function assertUserOrganizationAccess(
  db: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { count, error } = await db
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function assertEventInOrg(
  db: SupabaseClient,
  eventId: string,
  organizationId: string
): Promise<boolean> {
  const { count, error } = await db
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("id", eventId)
    .eq("organization_id", organizationId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
