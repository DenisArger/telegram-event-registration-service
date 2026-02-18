import type { Context } from "telegraf";

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(
    "Welcome to Event Registration Bot. Use /events to see available events."
  );
}
