export interface AiDraftInput {
  title: string;
  startsAt?: string | null;
  location?: string | null;
  description?: string | null;
  locale?: "ru" | "en";
  tone?: "formal" | "friendly" | "concise";
}

export interface AiDraftResult {
  text: string;
  provider: string;
  model: string;
}

function normalizeLocale(value: string | null | undefined): "ru" | "en" {
  return String(value ?? "").trim().toLowerCase() === "ru" ? "ru" : "en";
}

function normalizeTone(value: string | null | undefined): "formal" | "friendly" | "concise" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "formal") return "formal";
  if (normalized === "concise") return "concise";
  return "friendly";
}

function toneInstruction(locale: "ru" | "en", tone: "formal" | "friendly" | "concise"): string {
  if (locale === "ru") {
    if (tone === "formal") return "Стиль: формальный, деловой, без смайлов.";
    if (tone === "concise") return "Стиль: максимально краткий, только суть.";
    return "Стиль: дружелюбный и понятный, без лишней воды.";
  }
  if (tone === "formal") return "Tone: formal and professional, no emojis.";
  if (tone === "concise") return "Tone: concise, keep only essential details.";
  return "Tone: friendly and clear, avoid filler text.";
}

export function buildAnnouncementPrompt(input: AiDraftInput): string {
  const locale = normalizeLocale(input.locale);
  const tone = normalizeTone(input.tone);
  const startsAt = String(input.startsAt ?? "").trim();
  const location = String(input.location ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (locale === "ru") {
    return [
      "Сгенерируй короткий анонс мероприятия для Telegram.",
      toneInstruction(locale, tone),
      "Формат ответа: только текст анонса, без комментариев и без markdown-блоков.",
      `Название: ${input.title}`,
      startsAt ? `Дата/время: ${startsAt}` : "",
      location ? `Локация: ${location}` : "",
      description ? `Описание: ${description}` : "",
      "Добавь в конце мягкий CTA: зарегистрироваться через бота."
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Generate a short Telegram event announcement.",
    toneInstruction(locale, tone),
    "Output format: plain announcement text only, no extra commentary.",
    `Title: ${input.title}`,
    startsAt ? `Date/time: ${startsAt}` : "",
    location ? `Location: ${location}` : "",
    description ? `Description: ${description}` : "",
    "End with a soft CTA to register via bot."
  ]
    .filter(Boolean)
    .join("\n");
}

export function getAiConfig(envSource: Record<string, string | undefined>): {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  vedaiApiKey: string;
  vedaiBaseUrl: string;
  yandexModelUri: string;
  yandexIamToken: string;
} {
  const provider = String(envSource.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const model = String(envSource.AI_MODEL ?? "gpt-4o-mini").trim();
  const apiKey = String(envSource.OPENAI_API_KEY ?? "").trim();
  const baseUrl = String(envSource.OPENAI_BASE_URL ?? "https://api.openai.com/v1").trim();
  const deepseekApiKey = String(envSource.DEEPSEEK_API_KEY ?? "").trim();
  const deepseekBaseUrl = String(envSource.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1").trim();
  const vedaiApiKey = String(envSource.VEDAI_API_KEY ?? deepseekApiKey).trim();
  const vedaiBaseUrl = String(envSource.VEDAI_BASE_URL ?? deepseekBaseUrl).trim();
  const yandexModelUri = String(envSource.YANDEX_MODEL_URI ?? "").trim();
  const yandexIamToken = String(envSource.YANDEX_IAM_TOKEN ?? "").trim();
  return {
    provider,
    model,
    apiKey,
    baseUrl,
    deepseekApiKey,
    deepseekBaseUrl,
    vedaiApiKey,
    vedaiBaseUrl,
    yandexModelUri,
    yandexIamToken
  };
}

export async function generateAnnouncementWithAi(
  input: AiDraftInput,
  envSource: Record<string, string | undefined>
): Promise<AiDraftResult> {
  const config = getAiConfig(envSource);
  if (config.provider === "openai") {
    if (!config.apiKey) {
      throw new Error("missing_ai_api_key");
    }

    const prompt = buildAnnouncementPrompt(input);
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are a backend assistant for event automation." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`ai_provider_http_${response.status}`);
    }

    const payload = await response.json() as any;
    const text = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("empty_ai_response");
    }

    return {
      text,
      provider: config.provider,
      model: config.model
    };
  }

  if (config.provider === "yandex") {
    const yandexApiKey = String(envSource.YANDEX_API_KEY ?? "").trim();
    const yandexAuthHeader = yandexApiKey
      ? `Api-Key ${yandexApiKey}`
      : config.yandexIamToken
        ? `Bearer ${config.yandexIamToken}`
        : "";
    if (!yandexAuthHeader) {
      throw new Error("missing_yandex_auth");
    }
    if (!config.yandexModelUri) {
      throw new Error("missing_yandex_model_uri");
    }

    const prompt = buildAnnouncementPrompt(input);
    const base = String(envSource.YANDEX_API_BASE_URL ?? "https://llm.api.cloud.yandex.net/foundationModels/v1").trim();
    const response = await fetch(`${base.replace(/\/+$/, "")}/completion`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: yandexAuthHeader
      },
      body: JSON.stringify({
        modelUri: config.yandexModelUri,
        completionOptions: {
          stream: false,
          temperature: 0.4,
          maxTokens: "500"
        },
        messages: [
          { role: "system", text: "You are a backend assistant for event automation." },
          { role: "user", text: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`ai_provider_http_${response.status}`);
    }

    const payload = await response.json() as any;
    const text = String(payload?.result?.alternatives?.[0]?.message?.text ?? "").trim();
    if (!text) {
      throw new Error("empty_ai_response");
    }

    return {
      text,
      provider: config.provider,
      model: config.yandexModelUri
    };
  }

  if (config.provider === "deepseek") {
    if (!config.deepseekApiKey) {
      throw new Error("missing_deepseek_api_key");
    }

    const prompt = buildAnnouncementPrompt(input);
    const response = await fetch(`${config.deepseekBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.deepseekApiKey}`
      },
      body: JSON.stringify({
        model: config.model || "deepseek-reasoner",
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are a backend assistant for event automation." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`ai_provider_http_${response.status}`);
    }

    const payload = await response.json() as any;
    const text = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("empty_ai_response");
    }

    return {
      text,
      provider: config.provider,
      model: config.model || "deepseek-reasoner"
    };
  }

  if (config.provider === "vedai") {
    if (!config.vedaiApiKey) {
      throw new Error("missing_vedai_api_key");
    }

    const prompt = buildAnnouncementPrompt(input);
    const response = await fetch(`${config.vedaiBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.vedaiApiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are a backend assistant for event automation." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`ai_provider_http_${response.status}`);
    }

    const payload = await response.json() as any;
    const text = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("empty_ai_response");
    }

    return {
      text,
      provider: config.provider,
      model: config.model
    };
  }

  throw new Error("unsupported_ai_provider");
}
