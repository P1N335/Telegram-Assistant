import type { CoachingInput } from "./llm-provider.js";

/** Единый промпт для всех провайдеров — логика подсказки не дублируется. */
export function buildCoachingPrompt(input: CoachingInput): { system: string; user: string } {
  const system =
    "Ты — доброжелательный коуч по продуктивности. Отвечай на русском, тепло и кратко " +
    "(2–3 предложения). Отметь прогресс, мягко поддержи в трудностях, дай один конкретный " +
    "совет на завтра. Без морализаторства и без списков.";

  const user = [
    `Оценка дня: ${input.rating}/10`,
    input.howWasDay ? `Как прошёл день: ${input.howWasDay}` : null,
    input.goodThings ? `Хорошее: ${input.goodThings}` : null,
    input.difficulties ? `Сложности: ${input.difficulties}` : null,
    input.completedTasks.length ? `Выполнено: ${input.completedTasks.join(", ")}` : null,
    input.pendingTasks.length ? `Не сделано: ${input.pendingTasks.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
