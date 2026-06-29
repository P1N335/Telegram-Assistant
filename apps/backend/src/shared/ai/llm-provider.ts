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

/**
 * Контекст для утреннего мотивационного текста. Собирается из привычек/скиллов/стрика
 * пользователя (см. MorningCompanionService) — провайдер не знает про БД, только про
 * этот «снимок». Массивы могут быть пустыми → промпт деградирует мягко.
 */
export interface MorningInput {
  firstName?: string | null;
  locale?: string; // "ru" | "en"
  currentStreak: number; // дней подряд
  longestStreak: number;
  /** Названия привычек, запланированных на сегодня (уже отфильтрованы по расписанию). */
  habitsToday: string[];
  /** Топ скиллов пользователя (name + level), отсортированы по уровню убыв. */
  topSkills: Array<{ name: string; level: number }>;
}

export interface LLMProvider {
  readonly name: string;
  /** Короткий поддерживающий коучинг-инсайт по вечерней рефлексии. */
  generateCoaching(input: CoachingInput): Promise<string>;
  /**
   * Короткий тёплый утренний текст: поприветствовать, отметить стрик/привычки/скиллы,
   * задать настрой на день. Пустая строка = провайдер не дал ответа (вызывающий код
   * деградирует на статичный текст).
   */
  generateMorningMotivation(input: MorningInput): Promise<string>;
}
