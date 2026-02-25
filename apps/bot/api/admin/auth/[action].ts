import type { VercelRequest, VercelResponse } from "@vercel/node";
import devLoginHandler from "./dev-login";
import emailHandler from "./email";
import logoutHandler from "./logout";
import meHandler from "./me";
import telegramHandler from "./telegram";
import verifyHandler from "./verify";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const HANDLERS_BY_ACTION: Record<string, Handler> = {
  "dev-login": devLoginHandler,
  email: emailHandler,
  logout: logoutHandler,
  me: meHandler,
  telegram: telegramHandler,
  verify: verifyHandler
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const actionParam = req.query.action;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;
  if (!action) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const targetHandler = HANDLERS_BY_ACTION[action];
  if (!targetHandler) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  return targetHandler(req, res);
}
