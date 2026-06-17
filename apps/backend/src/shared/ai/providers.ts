import type { Env } from "../../config/env.js";
import type { Logger } from "../logger.js";
import type { CoachingInput, LLMProvider } from "./llm-provider.js";
import { buildCoachingPrompt } from "./prompt.js";

/** Заглушка: AI отключён. Возвращает пусто — вызывающий код деградирует мягко. */
export class NoopLLMProvider implements LLMProvider {
  readonly name = "noop";
  async generateCoaching(): Promise<string> {
    return "";
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: Logger,
  ) {}

  async generateCoaching(input: CoachingInput): Promise<string> {
    const { system, user } = buildCoachingPrompt(input);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        this.logger.warn({ status: res.status }, "OpenAI: ошибка ответа");
        return "";
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      this.logger.warn({ err }, "OpenAI: запрос упал");
      return ""; // graceful degradation — рефлексия сохранится без инсайта
    }
  }
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly logger: Logger,
  ) {}

  async generateCoaching(input: CoachingInput): Promise<string> {
    const { system, user } = buildCoachingPrompt(input);
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) {
        this.logger.warn({ status: res.status }, "Ollama: ошибка ответа");
        return "";
      }
      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content?.trim() ?? "";
    } catch (err) {
      this.logger.warn({ err }, "Ollama: запрос упал");
      return "";
    }
  }
}

/** Фабрика провайдера по конфигу. */
export function createLLMProvider(env: Env, logger: Logger): LLMProvider {
  const log = logger.child({ module: "ai" });
  switch (env.AI_PROVIDER) {
    case "openai":
      if (!env.OPENAI_API_KEY) {
        log.warn("AI_PROVIDER=openai, но OPENAI_API_KEY пуст → noop");
        return new NoopLLMProvider();
      }
      return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL, log);
    case "ollama":
      if (!env.OLLAMA_BASE_URL || !env.OLLAMA_MODEL) {
        log.warn("AI_PROVIDER=ollama, но не задан baseUrl/model → noop");
        return new NoopLLMProvider();
      }
      return new OllamaProvider(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL, log);
    default:
      return new NoopLLMProvider();
  }
}
