import type { VercelRequest, VercelResponse } from "@vercel/node";
import aiDraftHandler from "./ai-draft";
import attendeesHandler from "./attendees";
import checkinHandler from "./checkin";
import closeHandler from "./close";
import eventQuestionsHandler from "./event-questions";
import eventsHandler from "./events";
import exportHandler from "./export";
import organizationsHandler from "./organizations";
import organizationWebhookHandler from "./organization-webhook";
import organizationMembersHandler from "./organization-members";
import organizationTransferOwnershipHandler from "./organization-transfer-ownership";
import promoteHandler from "./promote";
import promoteWaitlistUserHandler from "./promote-waitlist-user";
import publishHandler from "./publish";
import statsHandler from "./stats";
import waitlistHandler from "./waitlist";
import { logError, logInfo } from "@event/shared";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

// Keep route registration centralized so every /api/admin/* path resolves through one entrypoint.
const HANDLERS_BY_ROUTE: Record<string, Handler> = {
  "ai-draft": aiDraftHandler,
  attendees: attendeesHandler,
  checkin: checkinHandler,
  close: closeHandler,
  "event-questions": eventQuestionsHandler,
  events: eventsHandler,
  export: exportHandler,
  organizations: organizationsHandler,
  "organization-webhook": organizationWebhookHandler,
  "organization-members": organizationMembersHandler,
  "organization-transfer-ownership": organizationTransferOwnershipHandler,
  promote: promoteHandler,
  "promote-waitlist-user": promoteWaitlistUserHandler,
  publish: publishHandler,
  stats: statsHandler,
  waitlist: waitlistHandler
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const routeParam = req.query.route;
  const route = Array.isArray(routeParam) ? routeParam[0] : routeParam;
  logInfo("admin_route_dispatch", {
    route,
    method: req.method,
    path: req.url,
    hasBody: Boolean(req.body),
    bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body as Record<string, unknown>) : []
  });
  if (!route) {
    logError("admin_route_missing", { path: req.url, query: req.query });
    res.status(404).json({ error: "Not found" });
    return;
  }

  const targetHandler = HANDLERS_BY_ROUTE[route];
  if (!targetHandler) {
    logError("admin_route_unknown", {
      route,
      availableRoutes: Object.keys(HANDLERS_BY_ROUTE),
      path: req.url
    });
    res.status(404).json({ error: "Not found" });
    return;
  }

  return targetHandler(req, res);
}
