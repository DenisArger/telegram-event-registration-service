import type { Context } from "telegraf";
import { getLocaleFromCtx, t } from "../i18n.js";

export async function handleStart(ctx: Context): Promise<void> {
  const locale = getLocaleFromCtx(ctx);
  await ctx.reply(t(locale, "start_welcome"));
}
