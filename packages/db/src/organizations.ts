import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationEntity, OrganizationMemberRole } from "@event/shared";

interface OrganizationRow {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

interface OrganizationMemberRow {
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  created_at: string;
  users?:
  | {
    full_name: string;
    username: string | null;
    telegram_id: number | null;
  }
  | Array<{
    full_name: string;
    username: string | null;
    telegram_id: number | null;
  }>;
}

function mapOrganization(row: OrganizationRow): OrganizationEntity {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at
  };
}

function mapOrganizationMember(row: OrganizationMemberRow): {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: string;
  fullName: string | null;
  username: string | null;
  telegramId: number | null;
} {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
    fullName: user?.full_name ?? null,
    username: user?.username ?? null,
    telegramId: user?.telegram_id ?? null
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
  userId: string,
  options?: { includeAllForAdmin?: boolean }
): Promise<Array<OrganizationEntity & { role: OrganizationMemberRole }>> {
  if (options?.includeAllForAdmin) {
    const { data, error } = await db
      .from("organizations")
      .select("id,name,owner_user_id,created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...mapOrganization(row as OrganizationRow),
      role: "owner" as const
    }));
  }

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

export async function listOrganizationMembers(
  db: SupabaseClient,
  organizationId: string
): Promise<Array<{
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: string;
  fullName: string | null;
  username: string | null;
  telegramId: number | null;
}>> {
  const { data, error } = await db
    .from("organization_members")
    .select(
      `
      organization_id,
      user_id,
      role,
      created_at,
      users!inner(
        full_name,
        username,
        telegram_id
      )
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => mapOrganizationMember(row as OrganizationMemberRow));
}

export async function upsertOrganizationMember(
  db: SupabaseClient,
  payload: {
    organizationId: string;
    userId: string;
    role: OrganizationMemberRole;
  }
): Promise<{
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: string;
  fullName: string | null;
  username: string | null;
  telegramId: number | null;
}> {
  const { error: upsertError } = await db.from("organization_members").upsert(
    {
      organization_id: payload.organizationId,
      user_id: payload.userId,
      role: payload.role
    },
    { onConflict: "organization_id,user_id" }
  );
  if (upsertError) throw upsertError;

  const { data, error } = await db
    .from("organization_members")
    .select(
      `
      organization_id,
      user_id,
      role,
      created_at,
      users!inner(
        full_name,
        username,
        telegram_id
      )
    `
    )
    .eq("organization_id", payload.organizationId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("organization_member_not_found_after_upsert");
  }

  return mapOrganizationMember(data as OrganizationMemberRow);
}

export async function removeOrganizationMember(
  db: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await db
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .select("organization_id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function transferOrganizationOwnership(
  db: SupabaseClient,
  payload: {
    organizationId: string;
    currentOwnerUserId: string;
    newOwnerUserId: string;
  }
): Promise<{
  organizationId: string;
  previousOwnerUserId: string;
  newOwnerUserId: string;
}> {
  const { data, error } = await db.rpc("transfer_organization_ownership", {
    p_organization_id: payload.organizationId,
    p_current_owner_user_id: payload.currentOwnerUserId,
    p_new_owner_user_id: payload.newOwnerUserId
  });

  if (error) throw error;

  return {
    organizationId: String((data as any).organization_id),
    previousOwnerUserId: String((data as any).previous_owner_user_id),
    newOwnerUserId: String((data as any).new_owner_user_id)
  };
}
