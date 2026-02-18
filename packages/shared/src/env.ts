import { z } from "zod";

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAIL_ALLOWLIST: z.string().min(1)
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(input);
}
