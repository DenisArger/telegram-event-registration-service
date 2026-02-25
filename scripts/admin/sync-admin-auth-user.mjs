#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = { email: "", roles: ["admin", "organizer"] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if ((token === "--email" || token === "-e") && argv[i + 1]) {
      args.email = String(argv[i + 1]).trim().toLowerCase();
      i += 1;
      continue;
    }
    if ((token === "--roles" || token === "-r") && argv[i + 1]) {
      args.roles = String(argv[i + 1])
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      i += 1;
    }
  }
  return args;
}

async function listAllUsers(authAdmin) {
  const users = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await authAdmin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers_failed: ${error.message}`);
    const chunk = data?.users ?? [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }
  return users;
}

async function main() {
  const { email, roles } = parseArgs(process.argv);

  if (!email || !email.includes("@")) {
    console.error("Usage: node scripts/admin/sync-admin-auth-user.mjs --email den.arger@gmail.com [--roles admin,organizer]");
    process.exit(2);
  }

  const url = String(process.env.SUPABASE_URL ?? "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !serviceRoleKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(2);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const allUsers = await listAllUsers(supabase.auth.admin);
  let authUser = allUsers.find((u) => String(u.email ?? "").toLowerCase() === email) ?? null;

  if (!authUser) {
    const created = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {}
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser_failed: ${created.error?.message ?? "unknown"}`);
    }
    authUser = created.data.user;
    console.log(JSON.stringify({ step: "auth_user_created", id: authUser.id, email: authUser.email }));
  } else {
    console.log(JSON.stringify({ step: "auth_user_found", id: authUser.id, email: authUser.email }));
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("users")
    .update({ auth_user_id: authUser.id, email })
    .ilike("email", email)
    .in("role", roles)
    .select("id,role,email,auth_user_id");

  if (updateError) {
    throw new Error(`public_users_update_failed: ${updateError.message}`);
  }

  console.log(
    JSON.stringify({
      step: "public_users_linked",
      updatedCount: updatedRows?.length ?? 0,
      rows: updatedRows ?? []
    })
  );

  if (!updatedRows || updatedRows.length === 0) {
    console.log(
      JSON.stringify({
        step: "warning",
        message: "No public.users rows matched by email and roles; verify role/email in public.users"
      })
    );
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "failed", message: error?.message ?? String(error) }));
  process.exit(1);
});
