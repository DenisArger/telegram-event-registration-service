import type { VercelRequest, VercelResponse } from "@vercel/node";
import aiDraftHandler from "./ai-draft";
import attendeesHandler from "./attendees";
import checkinHandler from "./checkin";
import closeHandler from "./close";
import eventQuestionsHandler from "./event-questions";
import eventsHandler from "./events";
import exportHandler from "./export";
import organizationsHandler from "./organizations";
import organizationMembersHandler from "./organization-members";
import organizationTransferOwnershipHandler from "./organization-transfer-ownership";
import promoteHandler from "./promote";
import publishHandler from "./publish";
import statsHandler from "./stats";
import waitlistHandler from "./waitlist";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const HANDLERS_BY_ROUTE: Record<string, Handler> = {
  "ai-draft": aiDraftHandler,
  attendees: attendeesHandler,
  checkin: checkinHandler,
  close: closeHandler,
  "event-questions": eventQuestionsHandler,
  events: eventsHandler,
  export: exportHandler,
  organizations: organizationsHandler,
  "organization-members": organizationMembersHandler,
  "organization-transfer-ownership": organizationTransferOwnershipHandler,
  promote: promoteHandler,
  publish: publishHandler,
  stats: statsHandler,
  waitlist: waitlistHandler
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const routeParam = req.query.route;
  const route = Array.isArray(routeParam) ? routeParam[0] : routeParam;
  if (!route) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const targetHandler = HANDLERS_BY_ROUTE[route];
  if (!targetHandler) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  return targetHandler(req, res);
}
