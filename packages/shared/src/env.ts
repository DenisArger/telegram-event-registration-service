import { z } from "zod";

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAIL_ALLOWLIST: z.string().optional().default(""),
  ADMIN_AUTH_ALLOW_EMAIL_FALLBACK: z.string().optional().default("true"),
  ADMIN_REQUIRE_ORG_CONTEXT: z.string().optional().default("false"),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default("")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(input);
}
