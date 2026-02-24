import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnnouncementPrompt, generateAnnouncementWithAi, getAiConfig } from "./aiDraft";

describe("aiDraft", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds russian prompt with constraints", () => {
    const prompt = buildAnnouncementPrompt({
      title: "Встреча команды",
      startsAt: "2026-03-01T10:00:00Z",
      location: "Гомель",
      locale: "ru",
      tone: "formal"
    });

    expect(prompt).toContain("Сгенерируй короткий анонс");
    expect(prompt).toContain("Название: Встреча команды");
    expect(prompt).toContain("Дата/время: 2026-03-01T10:00:00Z");
  });

  it("reads provider config from env", () => {
    const cfg = getAiConfig({
      AI_PROVIDER: "openai",
      AI_MODEL: "gpt-4o-mini",
      OPENAI_API_KEY: "key",
      OPENAI_BASE_URL: "https://example.com/v1",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com/v1",
      YANDEX_MODEL_URI: "gpt://folder/yandexgpt-lite/latest",
      YANDEX_IAM_TOKEN: "iam-token"
    });

    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o-mini");
    expect(cfg.apiKey).toBe("key");
    expect(cfg.baseUrl).toBe("https://example.com/v1");
    expect(cfg.deepseekApiKey).toBe("deepseek-key");
    expect(cfg.deepseekBaseUrl).toBe("https://api.deepseek.com/v1");
    expect(cfg.yandexModelUri).toBe("gpt://folder/yandexgpt-lite/latest");
    expect(cfg.yandexIamToken).toBe("iam-token");
  });

  it("throws on missing key", async () => {
    await expect(
      generateAnnouncementWithAi({ title: "Event" }, { AI_PROVIDER: "openai" })
    ).rejects.toThrow("missing_ai_api_key");
  });

  it("returns draft text from provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Draft announcement text" } }]
        })
      })
    );

    const result = await generateAnnouncementWithAi(
      {
        title: "Event title",
        locale: "en",
        tone: "friendly"
      },
      {
        AI_PROVIDER: "openai",
        AI_MODEL: "gpt-4o-mini",
        OPENAI_API_KEY: "key"
      }
    );

    expect(result).toEqual({
      text: "Draft announcement text",
      provider: "openai",
      model: "gpt-4o-mini"
    });
  });

  it("returns yandex completion response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            alternatives: [{ message: { text: "Yandex draft text" } }]
          }
        })
      })
    );

    const result = await generateAnnouncementWithAi(
      {
        title: "Event title",
        locale: "ru",
        tone: "friendly"
      },
      {
        AI_PROVIDER: "yandex",
        YANDEX_API_KEY: "key",
        YANDEX_MODEL_URI: "gpt://folder/yandexgpt-lite/latest"
      }
    );

    expect(result).toEqual({
      text: "Yandex draft text",
      provider: "yandex",
      model: "gpt://folder/yandexgpt-lite/latest"
    });
  });

  it("returns deepseek completion response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "DeepSeek R1 draft text" } }]
        })
      })
    );

    const result = await generateAnnouncementWithAi(
      {
        title: "Event title",
        locale: "ru",
        tone: "concise"
      },
      {
        AI_PROVIDER: "deepseek",
        AI_MODEL: "deepseek-reasoner",
        DEEPSEEK_API_KEY: "deepseek-key",
        DEEPSEEK_BASE_URL: "https://api.deepseek.com/v1"
      }
    );

    expect(result).toEqual({
      text: "DeepSeek R1 draft text",
      provider: "deepseek",
      model: "deepseek-reasoner"
    });
  });
});
