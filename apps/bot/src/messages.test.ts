import { describe, expect, it } from "vitest";
import { buildEventMessage, buildEventMessageHtml, registrationStatusToText } from "./messages";

describe("registrationStatusToText", () => {
  it("returns registered text", () => {
    expect(registrationStatusToText({ status: "registered" })).toContain("registered");
  });

  it("returns waitlist text with position", () => {
    expect(registrationStatusToText({ status: "waitlisted", position: 3 })).toContain("#3");
  });

  it("returns already registered text", () => {
    expect(registrationStatusToText({ status: "already_registered" })).toContain("already registered");
  });

  it("returns already waitlisted text", () => {
    expect(registrationStatusToText({ status: "already_waitlisted" })).toContain("already in waitlist");
  });
});

describe("buildEventMessage", () => {
  it("renders event details", () => {
    const message = buildEventMessage({
      id: "e1",
      title: "Team Sync",
      description: "Weekly internal sync",
      startsAt: "2026-02-19T10:00:00.000Z",
      endsAt: "2026-02-19T11:00:00.000Z",
      capacity: 20,
      status: "published"
    });

    expect(message).toContain("Team Sync");
    expect(message).toContain("Capacity: 20");
    expect(message).toContain("Weekly internal sync");
  });

  it("inserts blank line after title when enabled", () => {
    const message = buildEventMessage({
      id: "e1",
      title: "Team Sync",
      description: "Weekly internal sync",
      startsAt: null,
      endsAt: null,
      capacity: null,
      blankLineAfterTitle: true,
      status: "published"
    });

    expect(message).toContain("Team Sync\n\nWeekly internal sync");
  });
});

describe("buildEventMessageHtml", () => {
  it("renders markdown description to telegram html", () => {
    const message = buildEventMessageHtml({
      id: "e1",
      title: "**Team** *Sync*",
      description: "# Заголовок\n- **первый** пункт\n*курсив* и `код`",
      startsAt: "2026-02-19T10:00:00.000Z",
      endsAt: "2026-02-19T11:00:00.000Z",
      capacity: 20,
      status: "published"
    }, "ru");

    expect(message).toContain("<b>Team</b>");
    expect(message).toContain("<i>Sync</i>");
    expect(message).toContain("<b>Заголовок</b>");
    expect(message).toContain("• <b>первый</b> пункт");
    expect(message).toContain("<i>курсив</i>");
    expect(message).toContain("<code>код</code>");
  });

  it("omits invalid dates and empty capacity in html mode", () => {
    const message = buildEventMessageHtml({
      id: "e1",
      title: "Event",
      description: "Desc",
      startsAt: "" as any,
      endsAt: "invalid-date" as any,
      capacity: 0 as any,
      status: "published"
    }, "ru");

    expect(message).not.toContain("🕒");
    expect(message).not.toContain("🏁");
    expect(message).not.toContain("👥");
  });

  it("inserts blank line after title in html mode when enabled", () => {
    const message = buildEventMessageHtml({
      id: "e1",
      title: "Event",
      description: "Desc",
      startsAt: null,
      endsAt: null,
      capacity: null,
      blankLineAfterTitle: true,
      status: "published"
    }, "ru");

    expect(message).toContain("Event\n\nDesc");
  });
});
