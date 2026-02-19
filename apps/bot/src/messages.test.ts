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
});

describe("buildEventMessageHtml", () => {
  it("renders markdown description to telegram html", () => {
    const message = buildEventMessageHtml({
      id: "e1",
      title: "Team Sync",
      description: "# Заголовок\n- **первый** пункт\n*курсив* и `код`",
      startsAt: "2026-02-19T10:00:00.000Z",
      endsAt: "2026-02-19T11:00:00.000Z",
      capacity: 20,
      status: "published"
    }, "ru");

    expect(message).toContain("<b>Team Sync</b>");
    expect(message).toContain("<b>Заголовок</b>");
    expect(message).toContain("• <b>первый</b> пункт");
    expect(message).toContain("<i>курсив</i>");
    expect(message).toContain("<code>код</code>");
  });
});
