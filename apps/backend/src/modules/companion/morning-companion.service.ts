import type { User } from "@tpc/database";
import { resolveLocale } from "@tpc/shared";
import type { Env } from "../../config/env.js";
import type { Logger } from "../../shared/logger.js";
import { withTimeout } from "../../shared/async.js";
import type { LLMProvider, MorningInput } from "../../shared/ai/llm-provider.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { IHabitRepository } from "../habits/habit.repository.js";
import type { ISkillRepository } from "../skills/skill.repository.js";
import { isDueOn } from "../habits/habit.rules.js";

/** Сколько привычек/скиллов кладём в промпт — компактный контекст, без переполнения. */
const MAX_HABITS = 6;
const MAX_SKILLS = 3;

/**
 * AI-компаньон: персональный утренний мотивационный текст на основе стрика/привычек/
 * скиллов пользователя. Изолирован от планировщика как отдельный сервис, чтобы при
 * росте его мог дёргать BullMQ-воркер per-user без изменения логики (сейчас вызывается
 * из SchedulerService с ограниченным параллелизмом).
 *
 * Контракт: buildMorningText возвращает строку или null. null = AI выключен/недоступен/
 * пуст/превысил таймаут → вызывающий код шлёт обычный статичный текст (graceful degradation).
 * Фича строго opt-in (env AI_MORNING_ENABLED, по умолчанию выкл.) и требует не-noop провайдера —
 * текущее поведение утренней рассылки не меняется, пока владелец явно не включит её.
 */
export class MorningCompanionService {
  constructor(
    private readonly users: IUserRepository,
    private readonly habits: IHabitRepository,
    private readonly skills: ISkillRepository,
    private readonly ai: LLMProvider,
    private readonly env: Env,
    private readonly logger: Logger,
  ) {}

  /** Включена ли генерация (флаг + наличие реального провайдера). */
  get enabled(): boolean {
    return this.env.AI_MORNING_ENABLED && this.ai.name !== "noop";
  }

  /**
   * Готовит утренний текст для пользователя на локальную дату `localDate` (YYYY-MM-DD).
   * Никогда не бросает — любые сбои деградируют в null.
   */
  async buildMorningText(user: User, localDate: string): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const input = await this.collect(user, localDate);
      const text = await withTimeout(
        this.ai.generateMorningMotivation(input),
        this.env.AI_MORNING_TIMEOUT_MS,
      );
      const trimmed = text.trim();
      return trimmed.length ? trimmed : null;
    } catch (err) {
      this.logger.warn({ err, userId: user.id }, "AI-утро: текст не сгенерирован");
      return null;
    }
  }

  /** Снимок контекста пользователя для промпта (стрик/привычки сегодня/топ скиллов). */
  private async collect(user: User, localDate: string): Promise<MorningInput> {
    const [stats, habits, skills] = await Promise.all([
      this.users.getStatistics(user.id),
      this.habits.listActiveByUser(user.id),
      this.skills.listByUser(user.id),
    ]);

    const habitsToday = habits
      .filter((h) =>
        isDueOn(
          {
            cadence: h.cadence,
            intervalDays: h.intervalDays,
            weekdays: h.weekdays,
            startDate: h.startDate.toISOString().slice(0, 10),
          },
          localDate,
        ),
      )
      .slice(0, MAX_HABITS)
      .map((h) => h.title);

    const topSkills = [...skills]
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, MAX_SKILLS)
      .map((s) => ({ name: s.name, level: s.level }));

    return {
      firstName: user.firstName,
      locale: resolveLocale(user.languageCode),
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      habitsToday,
      topSkills,
    };
  }
}
