import type { CoachingInput, MorningInput } from "./llm-provider.js";

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

/**
 * Промпт утреннего мотивационного текста. Локаль-зависимый system (ru/en, фолбэк ru),
 * чтобы текст совпадал с языком интерфейса. Контекст (стрик/привычки/скиллы) подаётся
 * на том же языке — модель отвечает на нужном без отдельной инструкции про перевод.
 */
export function buildMorningPrompt(input: MorningInput): { system: string; user: string } {
  const en = (input.locale ?? "ru").toLowerCase().startsWith("en");

  const system = en
    ? "You are a warm, encouraging productivity companion. Reply in English, briefly " +
      "(2–3 sentences). Greet the person, acknowledge their streak/habits/skills if any, " +
      "and set a positive tone for the day. No moralizing, no lists, no markdown."
    : "Ты — тёплый, поддерживающий компаньон продуктивности. Отвечай на русском, кратко " +
      "(2–3 предложения). Поприветствуй человека, отметь его стрик/привычки/скиллы, если они есть, " +
      "и задай позитивный настрой на день. Без морализаторства, без списков, без разметки.";

  const lines = en
    ? [
        input.firstName ? `Name: ${input.firstName}` : null,
        `Current streak: ${input.currentStreak} day(s) (best ${input.longestStreak})`,
        input.habitsToday.length ? `Today's habits: ${input.habitsToday.join(", ")}` : null,
        input.topSkills.length
          ? `Top skills: ${input.topSkills.map((s) => `${s.name} (lvl ${s.level})`).join(", ")}`
          : null,
      ]
    : [
        input.firstName ? `Имя: ${input.firstName}` : null,
        `Текущий стрик: ${input.currentStreak} дн. (рекорд ${input.longestStreak})`,
        input.habitsToday.length ? `Привычки на сегодня: ${input.habitsToday.join(", ")}` : null,
        input.topSkills.length
          ? `Топ скиллов: ${input.topSkills.map((s) => `${s.name} (ур. ${s.level})`).join(", ")}`
          : null,
      ];

  return { system, user: lines.filter(Boolean).join("\n") };
}
