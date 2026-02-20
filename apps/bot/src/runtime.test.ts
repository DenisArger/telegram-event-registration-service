import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  startHandler: undefined as undefined | ((ctx: any) => Promise<void>),
  commands: new Map<string, (ctx: any) => Promise<void>>(),
  actions: [] as Array<{ pattern: RegExp; handler: (ctx: any) => Promise<void> }>,
  textHandler: undefined as undefined | ((ctx: any) => Promise<void>)
}));

const mocks = vi.hoisted(() => ({
  loadEnv: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  createServiceClient: vi.fn(),
  listPublishedEvents: vi.fn(),
  upsertTelegramUser: vi.fn(),
  registerForEvent: vi.fn(),
  saveAnswersAndRegister: vi.fn(),
  cancelRegistration: vi.fn(),
  getRegistrationQuestions: vi.fn(),
  getOrCreateQuestionSession: vi.fn(),
  getActiveQuestionSession: vi.fn(),
  advanceQuestionSession: vi.fn(),
  cancelQuestionSession: vi.fn(),
  completeQuestionSession: vi.fn(),
  getExistingRegistrationStatus: vi.fn(),
  createEvent: vi.fn(),
  getEventById: vi.fn(),
  publishEvent: vi.fn(),
  closeEvent: vi.fn(),
  handleStart: vi.fn(),
  buildEventMessage: vi.fn(),
  buildEventMessageHtml: vi.fn(),
  renderMarkdownToTelegramHtml: vi.fn(),
  registrationStatusToText: vi.fn(),
  canManageEvents: vi.fn(),
  parseCreateEventCommand: vi.fn(),
  validateLifecycleTransition: vi.fn()
}));

vi.mock("telegraf", () => {
  class Telegraf {
    token: string;
    handleUpdate: (update: unknown) => Promise<void>;

    constructor(token: string) {
      this.token = token;
      this.handleUpdate = vi.fn(async () => undefined);
    }

    start(handler: (ctx: any) => Promise<void>) {
      state.startHandler = handler;
    }

    command(name: string, handler: (ctx: any) => Promise<void>) {
      state.commands.set(name, handler);
    }

    action(pattern: RegExp, handler: (ctx: any) => Promise<void>) {
      state.actions.push({ pattern, handler });
    }

    on(name: string, handler: (ctx: any) => Promise<void>) {
      if (name === "text") state.textHandler = handler;
    }
  }

  return {
    Telegraf,
    Markup: {
      inlineKeyboard: vi.fn((rows: unknown) => ({ rows })),
      button: {
        callback: vi.fn((text: string, data: string) => ({ text, data }))
      }
    }
  };
});

vi.mock("@event/shared", () => ({
  loadEnv: mocks.loadEnv,
  logError: mocks.logError,
  logInfo: mocks.logInfo
}));

vi.mock("@event/db", () => ({
  createServiceClient: mocks.createServiceClient,
  listPublishedEvents: mocks.listPublishedEvents,
  upsertTelegramUser: mocks.upsertTelegramUser,
  registerForEvent: mocks.registerForEvent,
  saveAnswersAndRegister: mocks.saveAnswersAndRegister,
  cancelRegistration: mocks.cancelRegistration,
  getRegistrationQuestions: mocks.getRegistrationQuestions,
  getOrCreateQuestionSession: mocks.getOrCreateQuestionSession,
  getActiveQuestionSession: mocks.getActiveQuestionSession,
  advanceQuestionSession: mocks.advanceQuestionSession,
  cancelQuestionSession: mocks.cancelQuestionSession,
  completeQuestionSession: mocks.completeQuestionSession,
  getExistingRegistrationStatus: mocks.getExistingRegistrationStatus,
  createEvent: mocks.createEvent,
  getEventById: mocks.getEventById,
  publishEvent: mocks.publishEvent,
  closeEvent: mocks.closeEvent
}));

vi.mock("./handlers/start.js", () => ({
  handleStart: mocks.handleStart
}));

vi.mock("./messages.js", () => ({
  buildEventMessage: mocks.buildEventMessage,
  buildEventMessageHtml: mocks.buildEventMessageHtml,
  renderMarkdownToTelegramHtml: mocks.renderMarkdownToTelegramHtml,
  registrationStatusToText: mocks.registrationStatusToText
}));

vi.mock("./organizer.js", () => ({
  canManageEvents: mocks.canManageEvents,
  parseCreateEventCommand: mocks.parseCreateEventCommand,
  validateLifecycleTransition: mocks.validateLifecycleTransition
}));

function baseCtx(overrides?: Partial<any>) {
  return {
    from: {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      username: "john"
    },
    message: { text: "" },
    match: ["", "e1"],
    reply: vi.fn(async () => undefined),
    answerCbQuery: vi.fn(async () => undefined),
    ...overrides
  };
}

describe("bot runtime", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.commands.clear();
    state.actions.length = 0;
    state.startHandler = undefined;
    state.textHandler = undefined;

    mocks.loadEnv.mockReturnValue({ TELEGRAM_BOT_TOKEN: "token" });
    mocks.createServiceClient.mockReturnValue({});
    mocks.listPublishedEvents.mockResolvedValue([]);
    mocks.upsertTelegramUser.mockResolvedValue({ id: "u1", role: "participant" });
    mocks.registerForEvent.mockResolvedValue({ status: "registered" });
    mocks.saveAnswersAndRegister.mockResolvedValue({ status: "registered" });
    mocks.cancelRegistration.mockResolvedValue({ status: "cancelled" });
    mocks.getRegistrationQuestions.mockResolvedValue([]);
    mocks.getOrCreateQuestionSession.mockResolvedValue({
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getActiveQuestionSession.mockResolvedValue(null);
    mocks.advanceQuestionSession.mockResolvedValue(undefined);
    mocks.cancelQuestionSession.mockResolvedValue(undefined);
    mocks.completeQuestionSession.mockResolvedValue(undefined);
    mocks.getExistingRegistrationStatus.mockResolvedValue(null);
    mocks.canManageEvents.mockReturnValue(false);
    mocks.parseCreateEventCommand.mockReturnValue({
      title: "T",
      startsAt: "2026-03-01T10:00:00Z",
      endsAt: null,
      capacity: 10,
      description: "D"
    });
    mocks.createEvent.mockResolvedValue({ id: "e1", title: "T", status: "draft" });
    mocks.buildEventMessage.mockReturnValue("event message");
    mocks.buildEventMessageHtml.mockReturnValue("event message html");
    mocks.renderMarkdownToTelegramHtml.mockReturnValue("<b>custom success</b>");
    mocks.registrationStatusToText.mockReturnValue("registered");
    mocks.getEventById.mockResolvedValue({ id: "e1", status: "draft", title: "T" });
    mocks.validateLifecycleTransition.mockReturnValue(true);
    mocks.publishEvent.mockResolvedValue({ id: "e1", status: "published", title: "T" });
    mocks.closeEvent.mockResolvedValue({ id: "e1", status: "closed", title: "T" });

    vi.resetModules();
    await import("./runtime");
  });

  it("logs initialization", () => {
    expect(mocks.logInfo).toHaveBeenCalledWith("bot_initialized");
    expect(state.startHandler).toBeTypeOf("function");
    expect(state.commands.has("events")).toBe(true);
  });

  it("handles /start success and failure", async () => {
    const ctx = baseCtx();
    await state.startHandler?.(ctx);
    expect(mocks.handleStart).toHaveBeenCalledWith(ctx);

    mocks.handleStart.mockRejectedValueOnce(new Error("boom"));
    const errCtx = baseCtx();
    await state.startHandler?.(errCtx);
    expect(errCtx.reply).toHaveBeenCalledWith("Unexpected error. Please try again.");
  });

  it("handles /events with empty and filled list", async () => {
    const command = state.commands.get("events");
    const emptyCtx = baseCtx();

    await command?.(emptyCtx);
    expect(emptyCtx.reply).toHaveBeenCalledWith("No published events right now.");

    mocks.listPublishedEvents.mockResolvedValueOnce([
      { id: "e1", title: "Event", description: null, startsAt: "2026", endsAt: null, capacity: 10, status: "published" }
    ]);
    const filledCtx = baseCtx();
    await command?.(filledCtx);
    expect(filledCtx.reply).toHaveBeenCalled();
  });

  it("shows only cancel button when user is already registered", async () => {
    const command = state.commands.get("events");
    mocks.listPublishedEvents.mockResolvedValueOnce([
      { id: "e1", title: "Event", description: null, startsAt: "2026", endsAt: null, capacity: 10, status: "published" }
    ]);
    mocks.getExistingRegistrationStatus.mockResolvedValueOnce({ status: "already_registered" });

    const ctx = baseCtx();
    await command?.(ctx);

    const secondArg = (ctx.reply as any).mock.calls[0]?.[1];
    const rows = secondArg?.rows ?? [];
    const callbackData = rows.flat().map((btn: any) => btn.data);
    expect(callbackData).toContain("cancel:e1");
    expect(callbackData).not.toContain("reg:e1");
  });

  it("handles /events errors", async () => {
    const command = state.commands.get("events");
    mocks.listPublishedEvents.mockRejectedValueOnce(new Error("boom"));
    const ctx = baseCtx();

    await command?.(ctx);

    expect(mocks.logError).toHaveBeenCalledWith("events_command_failed", expect.any(Object));
    expect(ctx.reply).toHaveBeenCalledWith("Could not load events now. Try again later.");
  });

  it("handles /create_event permission and success", async () => {
    const command = state.commands.get("create_event");

    const deniedCtx = baseCtx({ message: { text: "/create_event T | 2026-03-01T10:00:00Z | 10" } });
    await command?.(deniedCtx);
    expect(deniedCtx.reply).toHaveBeenCalledWith("Access denied. Organizer or admin role required.");

    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValue(true);
    const okCtx = baseCtx({ message: { text: "/create_event T | 2026-03-01T10:00:00Z | 10" } });
    await command?.(okCtx);
    expect(mocks.createEvent).toHaveBeenCalled();
    expect(okCtx.reply).toHaveBeenCalled();
  });

  it("handles /create_event validation errors", async () => {
    const command = state.commands.get("create_event");
    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValue(true);
    mocks.parseCreateEventCommand.mockImplementationOnce(() => {
      throw new Error("capacity_invalid");
    });

    const ctx = baseCtx({ message: { text: "/create_event bad" } });
    await command?.(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Usage:\n/create_event Title | 2026-03-01T10:00:00Z | 30 | Optional description"
    );
  });

  it("handles /create_event missing user and unexpected errors", async () => {
    const command = state.commands.get("create_event");

    const noFromCtx = baseCtx({ from: undefined });
    await command?.(noFromCtx);
    expect(noFromCtx.reply).toHaveBeenCalledWith("User info not available.");

    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValue(true);
    mocks.parseCreateEventCommand.mockImplementationOnce(() => {
      throw new Error("unexpected");
    });

    const errCtx = baseCtx({ message: { text: "/create_event fail" } });
    await command?.(errCtx);
    expect(errCtx.reply).toHaveBeenCalledWith("Could not create event now.");
  });

  it("handles register and cancel callbacks", async () => {
    const regAction = state.actions.find((item) => String(item.pattern) === String(/^reg:(.+)$/));
    const cancelAction = state.actions.find((item) => String(item.pattern) === String(/^cancel:(.+)$/));
    const cancelConfirmAction = state.actions.find((item) => String(item.pattern) === String(/^cancel_confirm:(.+)$/));

    const regCtx = baseCtx({ match: ["reg:e1", "e1"] });
    await regAction?.handler(regCtx);
    expect(regCtx.answerCbQuery).toHaveBeenCalledWith();
    expect(regCtx.reply).toHaveBeenCalledWith("registered");

    const cancelCtx = baseCtx({ match: ["cancel:e1", "e1"] });
    await cancelAction?.handler(cancelCtx);
    expect(cancelCtx.reply).toHaveBeenCalled();

    const cancelConfirmCtx = baseCtx({ match: ["cancel_confirm:e1", "e1"] });
    await cancelConfirmAction?.handler(cancelConfirmCtx);
    expect(cancelConfirmCtx.answerCbQuery).toHaveBeenCalledWith("Your registration has been cancelled.", {
      show_alert: true
    });
  });

  it("sends custom registration success message when configured", async () => {
    const regAction = state.actions.find((item) => String(item.pattern) === String(/^reg:(.+)$/));
    mocks.getEventById.mockResolvedValueOnce({
      id: "e1",
      status: "published",
      title: "T",
      registrationSuccessMessage: "**Welcome**"
    });

    const regCtx = baseCtx({ match: ["reg:e1", "e1"] });
    await regAction?.handler(regCtx);

    expect(mocks.renderMarkdownToTelegramHtml).toHaveBeenCalledWith("**Welcome**");
    expect(regCtx.reply).toHaveBeenCalledWith("<b>custom success</b>", { parse_mode: "HTML" });
  });

  it("handles register/cancel callback edge cases", async () => {
    const regAction = state.actions.find((item) => String(item.pattern) === String(/^reg:(.+)$/));
    const cancelAction = state.actions.find((item) => String(item.pattern) === String(/^cancel:(.+)$/));
    const cancelConfirmAction = state.actions.find((item) => String(item.pattern) === String(/^cancel_confirm:(.+)$/));

    const regNoFrom = baseCtx({ from: undefined, match: ["reg:e1", "e1"] });
    await regAction?.handler(regNoFrom);
    expect(regNoFrom.answerCbQuery).toHaveBeenCalledWith("User info not available.");

    mocks.registerForEvent.mockRejectedValueOnce(new Error("boom"));
    const regErr = baseCtx({ match: ["reg:e1", "e1"] });
    await regAction?.handler(regErr);
    expect(regErr.answerCbQuery).toHaveBeenCalledWith("Registration failed. Try again later.", {
      show_alert: true
    });

    mocks.cancelRegistration.mockResolvedValueOnce({ status: "not_registered" });
    const cancelNotReg = baseCtx({ match: ["cancel_confirm:e1", "e1"] });
    await cancelConfirmAction?.handler(cancelNotReg);
    expect(cancelNotReg.answerCbQuery).toHaveBeenCalledWith("You were not registered for this event.", {
      show_alert: true
    });

    mocks.cancelRegistration.mockRejectedValueOnce(new Error("boom"));
    const cancelErr = baseCtx({ match: ["cancel_confirm:e1", "e1"] });
    await cancelConfirmAction?.handler(cancelErr);
    expect(cancelErr.answerCbQuery).toHaveBeenCalledWith("Cancellation failed. Try again later.", {
      show_alert: true
    });

    const cancelPrompt = baseCtx({ match: ["cancel:e1", "e1"] });
    await cancelAction?.handler(cancelPrompt);
    expect(cancelPrompt.reply).toHaveBeenCalled();
  });

  it("starts questionnaire flow when event has questions", async () => {
    const regAction = state.actions.find((item) => String(item.pattern) === String(/^reg:(.+)$/));
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", version: 1, prompt: "Why?", isRequired: true, position: 1, isActive: true, eventId: "e1" }
    ]);

    const regCtx = baseCtx({ match: ["reg:e1", "e1"] });
    await regAction?.handler(regCtx);

    expect(mocks.getOrCreateQuestionSession).toHaveBeenCalled();
    expect(regCtx.reply).toHaveBeenCalled();
  });

  it("handles organizer lifecycle command and action", async () => {
    const publishCommand = state.commands.get("publish_event");
    const publishAction = state.actions.find((item) => String(item.pattern) === String(/^pub:(.+)$/));

    mocks.upsertTelegramUser.mockResolvedValue({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValue(true);

    const cmdCtx = baseCtx({ message: { text: "/publish_event e1" } });
    await publishCommand?.(cmdCtx);
    expect(cmdCtx.reply).toHaveBeenCalledWith("Event updated to published: T");

    const actionCtx = baseCtx({ match: ["pub:e1", "e1"] });
    await publishAction?.handler(actionCtx);
    expect(actionCtx.answerCbQuery).toHaveBeenCalledWith("Event is now published.", {
      show_alert: true
    });
  });

  it("covers organizer lifecycle failure branches", async () => {
    const publishCommand = state.commands.get("publish_event");
    const closeCommand = state.commands.get("close_event");
    const publishAction = state.actions.find((item) => String(item.pattern) === String(/^pub:(.+)$/));
    const closeAction = state.actions.find((item) => String(item.pattern) === String(/^cls:(.+)$/));

    const usageCtx = baseCtx({ message: { text: "" } });
    await publishCommand?.(usageCtx);
    expect(usageCtx.reply).toHaveBeenCalledWith("Usage: /publish_event <event_id>");

    mocks.upsertTelegramUser.mockResolvedValue({ id: "u1", role: "participant" });
    mocks.canManageEvents.mockReturnValue(false);
    const deniedCtx = baseCtx({ message: { text: "/close_event e1" } });
    await closeCommand?.(deniedCtx);
    expect(deniedCtx.reply).toHaveBeenCalledWith("Access denied. Organizer or admin role required.");

    mocks.upsertTelegramUser.mockResolvedValue({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValue(true);
    mocks.getEventById.mockResolvedValueOnce(null);
    const notFoundCtx = baseCtx({ message: { text: "/publish_event e1" } });
    await publishCommand?.(notFoundCtx);
    expect(notFoundCtx.reply).toHaveBeenCalledWith("Event not found.");

    mocks.getEventById.mockResolvedValueOnce({ id: "e1", status: "draft", title: "T" });
    mocks.validateLifecycleTransition.mockReturnValueOnce(false);
    const invalidCtx = baseCtx({ message: { text: "/publish_event e1" } });
    await publishCommand?.(invalidCtx);
    expect(invalidCtx.reply).toHaveBeenCalledWith("Invalid transition: draft -> published");

    mocks.getEventById.mockResolvedValueOnce({ id: "e1", status: "draft", title: "T" });
    mocks.validateLifecycleTransition.mockReturnValueOnce(true);
    mocks.publishEvent.mockResolvedValueOnce(null);
    const notUpdatedCtx = baseCtx({ message: { text: "/publish_event e1" } });
    await publishCommand?.(notUpdatedCtx);
    expect(notUpdatedCtx.reply).toHaveBeenCalledWith("Event state was not updated.");

    mocks.getEventById.mockRejectedValueOnce(new Error("boom"));
    const cmdErrCtx = baseCtx({ message: { text: "/publish_event e1" } });
    await publishCommand?.(cmdErrCtx);
    expect(cmdErrCtx.reply).toHaveBeenCalledWith("Could not update event now.");

    const actionInvalidCtx = baseCtx({ from: undefined, match: ["pub:e1", "e1"] });
    await publishAction?.handler(actionInvalidCtx);
    expect(actionInvalidCtx.answerCbQuery).toHaveBeenCalledWith("Invalid action.", { show_alert: true });

    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "participant" });
    mocks.canManageEvents.mockReturnValueOnce(false);
    const actionDeniedCtx = baseCtx({ match: ["cls:e1", "e1"] });
    await closeAction?.handler(actionDeniedCtx);
    expect(actionDeniedCtx.answerCbQuery).toHaveBeenCalledWith("Organizer/admin role required.", {
      show_alert: true
    });

    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValueOnce(true);
    mocks.getEventById.mockResolvedValueOnce(null);
    const actionBadStateCtx = baseCtx({ match: ["pub:e1", "e1"] });
    await publishAction?.handler(actionBadStateCtx);
    expect(actionBadStateCtx.answerCbQuery).toHaveBeenCalledWith("Invalid event state transition.", {
      show_alert: true
    });

    mocks.upsertTelegramUser.mockResolvedValueOnce({ id: "u1", role: "organizer" });
    mocks.canManageEvents.mockReturnValueOnce(true);
    mocks.getEventById.mockResolvedValueOnce({ id: "e1", status: "published", title: "T" });
    mocks.validateLifecycleTransition.mockReturnValueOnce(true);
    mocks.closeEvent.mockResolvedValueOnce(null);
    const actionNotUpdatedCtx = baseCtx({ match: ["cls:e1", "e1"] });
    await closeAction?.handler(actionNotUpdatedCtx);
    expect(actionNotUpdatedCtx.answerCbQuery).toHaveBeenCalledWith("Event update failed.", {
      show_alert: true
    });

    mocks.upsertTelegramUser.mockRejectedValueOnce(new Error("boom"));
    const actionErrCtx = baseCtx({ match: ["pub:e1", "e1"] });
    await publishAction?.handler(actionErrCtx);
    expect(actionErrCtx.answerCbQuery).toHaveBeenCalledWith("Could not update event.", {
      show_alert: true
    });
  });

  it("covers qskip branches", async () => {
    const qskipAction = state.actions.find((item) => String(item.pattern) === String(/^qskip:(.+):([0-9]+)$/));
    const qskipNoFrom = baseCtx({ from: undefined, match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(qskipNoFrom);
    expect(qskipNoFrom.answerCbQuery).toHaveBeenCalledWith("Invalid action.", { show_alert: true });

    mocks.getActiveQuestionSession.mockResolvedValueOnce(null);
    const noSessionCtx = baseCtx({ match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(noSessionCtx);
    expect(noSessionCtx.answerCbQuery).toHaveBeenCalledWith("Questionnaire session expired. Please tap Register again.", {
      show_alert: true
    });

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: true
    });
    const expiredCtx = baseCtx({ match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(expiredCtx);
    expect(mocks.cancelQuestionSession).toHaveBeenCalled();

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([]);
    const missingQuestionCtx = baseCtx({ match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(missingQuestionCtx);
    expect(mocks.cancelQuestionSession).toHaveBeenCalled();

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Required?", isRequired: true, position: 1, isActive: true }
    ]);
    const requiredCtx = baseCtx({ match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(requiredCtx);
    expect(requiredCtx.answerCbQuery).toHaveBeenCalledWith("Answer is required.", { show_alert: true });

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Optional?", isRequired: false, position: 1, isActive: true },
      { id: "q2", eventId: "e1", version: 1, prompt: "Next", isRequired: true, position: 2, isActive: true }
    ]);
    const optionalCtx = baseCtx({ match: ["qskip:e1:1", "e1", "1"] });
    await qskipAction?.handler(optionalCtx);
    expect(mocks.advanceQuestionSession).toHaveBeenCalled();
    expect(optionalCtx.reply).toHaveBeenCalled();
    expect(optionalCtx.answerCbQuery).toHaveBeenCalledWith();
  });

  it("covers qcancel and qcancel_confirm branches", async () => {
    const qcancelAction = state.actions.find((item) => String(item.pattern) === String(/^qcancel:(.+)$/));
    const qcancelConfirmAction = state.actions.find((item) => String(item.pattern) === String(/^qcancel_confirm:(.+)$/));
    const qcancelKeepAction = state.actions.find((item) => String(item.pattern) === String(/^qcancel_keep:(.+)$/));

    const invalidQcancelCtx = baseCtx({ match: ["qcancel:", ""] });
    await qcancelAction?.handler(invalidQcancelCtx);
    expect(invalidQcancelCtx.answerCbQuery).toHaveBeenCalledWith("Invalid action.", { show_alert: true });

    const promptQcancelCtx = baseCtx({ match: ["qcancel:e1", "e1"] });
    await qcancelAction?.handler(promptQcancelCtx);
    expect(promptQcancelCtx.reply).toHaveBeenCalled();

    const invalidConfirmCtx = baseCtx({ from: undefined, match: ["qcancel_confirm:e1", "e1"] });
    await qcancelConfirmAction?.handler(invalidConfirmCtx);
    expect(invalidConfirmCtx.answerCbQuery).toHaveBeenCalledWith("Invalid action.", { show_alert: true });

    const confirmCtx = baseCtx({ match: ["qcancel_confirm:e1", "e1"] });
    await qcancelConfirmAction?.handler(confirmCtx);
    expect(mocks.cancelQuestionSession).toHaveBeenCalled();
    expect(confirmCtx.answerCbQuery).toHaveBeenCalledWith("Questionnaire cancelled.", { show_alert: true });

    const keepCtx = baseCtx({ match: ["qcancel_keep:e1", "e1"] });
    await qcancelKeepAction?.handler(keepCtx);
    expect(keepCtx.answerCbQuery).toHaveBeenCalledWith("Registration kept.", { show_alert: false });

    const keepErrAnswerCbQuery = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const keepErrCtx = baseCtx({ match: ["qcancel_keep:e1", "e1"], answerCbQuery: keepErrAnswerCbQuery });
    await qcancelKeepAction?.handler(keepErrCtx);
    expect(keepErrCtx.answerCbQuery).toHaveBeenCalledWith("Unexpected error. Please try again.", { show_alert: true });
  });

  it("covers text handler branches", async () => {
    const handler = state.textHandler;

    const slashCtx = baseCtx({ message: { text: "/events" }, reply: vi.fn(async () => undefined) });
    await handler?.(slashCtx);
    expect(slashCtx.reply).not.toHaveBeenCalled();

    mocks.getActiveQuestionSession.mockResolvedValueOnce(null);
    const noSessionCtx = baseCtx({ message: { text: "hello" } });
    await handler?.(noSessionCtx);
    expect(noSessionCtx.reply).not.toHaveBeenCalled();

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: true
    });
    const expiredCtx = baseCtx({ message: { text: "hello" } });
    await handler?.(expiredCtx);
    expect(expiredCtx.reply).toHaveBeenCalledWith("Questionnaire session expired. Please tap Register again.");

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([]);
    const missingQuestionCtx = baseCtx({ message: { text: "hello" } });
    await handler?.(missingQuestionCtx);
    expect(missingQuestionCtx.reply).toHaveBeenCalledWith("Questionnaire session expired. Please tap Register again.");

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Q", isRequired: true, position: 1, isActive: true }
    ]);
    const longAnswerCtx = baseCtx({ message: { text: "a".repeat(501) } });
    await handler?.(longAnswerCtx);
    expect(longAnswerCtx.reply).toHaveBeenCalledWith("Answer is too long (max 500 chars).");

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Q", isRequired: true, position: 1, isActive: true }
    ]);
    const requiredCtx = baseCtx({ message: { text: "   " } });
    await handler?.(requiredCtx);
    expect(requiredCtx.reply).toHaveBeenCalledWith("Answer is required.");

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Q1", isRequired: true, position: 1, isActive: true },
      { id: "q2", eventId: "e1", version: 1, prompt: "Q2", isRequired: true, position: 2, isActive: true }
    ]);
    const nextQuestionCtx = baseCtx({ message: { text: "first answer" } });
    await handler?.(nextQuestionCtx);
    expect(mocks.advanceQuestionSession).toHaveBeenCalled();

    mocks.getActiveQuestionSession.mockResolvedValueOnce({
      eventId: "e1",
      currentIndex: 1,
      answers: [],
      expiresAt: "2026-03-01T10:00:00Z",
      isExpired: false
    });
    mocks.getRegistrationQuestions.mockResolvedValueOnce([
      { id: "q1", eventId: "e1", version: 1, prompt: "Q1", isRequired: true, position: 1, isActive: true }
    ]);
    const finalizeCtx = baseCtx({ message: { text: "final answer" } });
    await handler?.(finalizeCtx);
    expect(mocks.saveAnswersAndRegister).toHaveBeenCalled();
    expect(mocks.completeQuestionSession).toHaveBeenCalled();

    mocks.upsertTelegramUser.mockRejectedValueOnce(new Error("boom"));
    const errCtx = baseCtx({ message: { text: "hello" } });
    await handler?.(errCtx);
    expect(errCtx.reply).toHaveBeenCalledWith("Could not save your answers.");
  });
});
