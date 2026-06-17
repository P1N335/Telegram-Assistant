/**
 * Абстракция над LLM. Сервисы зависят от интерфейса, а не от OpenAI напрямую,
 * поэтому провайдера можно заменить (OpenAI → Ollama → ваш self-hosted) через конфиг.
 */

export interface CoachingInput {
  /** Свободный итог дня от пользователя. */
  howWasDay?: string | null;
  goodThings?: string | null;
  difficulties?: string | null;
  rating: number; // 1..10
  completedTasks: string[];
  pendingTasks: string[];
  locale?: string; // "ru" | "en"
}

export interface LLMProvider {
  readonly name: string;
  /** Короткий поддерживающий коучинг-инсайт по вечерней рефлексии. */
  generateCoaching(input: CoachingInput): Promise<string>;
}
