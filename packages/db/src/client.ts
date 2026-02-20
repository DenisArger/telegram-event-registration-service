import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "@event/shared";

export function createServiceClient(envSource: Record<string, string | undefined>) {
  const env = loadEnv(envSource);
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServiceClientLoose(envSource: Record<string, string | undefined>) {
  const url = String(envSource.SUPABASE_URL ?? "").trim();
  const key = String(envSource.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key);
}
