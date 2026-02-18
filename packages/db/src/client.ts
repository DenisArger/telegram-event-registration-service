import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "@event/shared";

export function createServiceClient(envSource: Record<string, string | undefined>) {
  const env = loadEnv(envSource);
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
