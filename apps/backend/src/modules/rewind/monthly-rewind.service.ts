import type { User } from "@tpc/database";
import { REWIND_TOP_SKILLS, type MonthlyRewindDto } from "@tpc/shared";
import type { Logger } from "../../shared/logger.js";
import { periodRange, toDateOnly } from "../../shared/time.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ISkillRepository } from "../skills/skill.repository.js";
import type { IRewindRepository, RewindRange } from "./rewind.repository.js";
import {
  isEmptyRewind,
  previousMonthAnchor,
  skillXpGains,
  topSkills,
  totalSkillXpGained,
} from "./rewind.rules.js";

/**
 * Месячный ревайнд: агрегированный отчёт за ПРЕДЫДУЩИЙ календарный месяц пользователя.
 * Изолирован как отдельный сервис (как MorningCompanionService): планировщик дёргает его
 * per-user в начале месяца. Считает только из данных с временными метками (без снапшотов):
 *   выполненные задачи, отметки привычек, текущий стрик, рост XP по скиллам за месяц.
 *
 * Контракт: buildRewind возвращает DTO или null. null = за месяц не было активности
 * (пустой отчёт не шлём — без спама). Никогда не бросает: сбои деградируют в null.
 */
export class MonthlyRewindService {
  constructor(
    private readonly rewind: IRewindRepository,
    private readonly users: IUserRepository,
    private readonly skills: ISkillRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Готовит отчёт за месяц, предшествующий локальной дате `localToday` (YYYY-MM-DD).
   * Обычно вызывается в локальную полночь 1-го числа → отчёт за только что закрытый месяц.
   */
  async buildRewind(user: User, localToday: string): Promise<MonthlyRewindDto | null> {
    try {
      const prev = previousMonthAnchor(localToday);
      const range = monthRange(user.timezone, prev.anchor, prev.nextAnchor);

      const raw = await this.rewind.aggregateMonth(user.id, range);
      if (isEmptyRewind(raw)) return null;

      const [stats, userSkills] = await Promise.all([
        this.users.getStatistics(user.id),
        this.skills.listByUser(user.id),
      ]);

      const gains = skillXpGains(raw);
      return {
        month: prev.label,
        tasksCompleted: raw.tasksCompleted,
        habitsCompleted: raw.habitCompletions.length,
        currentStreak: stats?.currentStreak ?? 0,
        longestStreak: stats?.longestStreak ?? 0,
        topSkills: topSkills(gains, userSkills, REWIND_TOP_SKILLS),
        totalSkillXpGained: totalSkillXpGained(gains),
      };
    } catch (err) {
      this.logger.warn({ err, userId: user.id }, "Месячный ревайнд: отчёт не собран");
      return null;
    }
  }
}

/**
 * Границы отчётного месяца в таймзоне пользователя:
 *  - ts* — UTC-инстанты локальных границ (для Task.completedAt);
 *  - date* — полночь-UTC YYYY-MM-01 (для HabitCompletion.date @db.Date).
 */
function monthRange(timezone: string, anchor: string, nextAnchor: string): RewindRange {
  const { start, end } = periodRange("MONTH", timezone, anchor);
  return { tsStart: start, tsEnd: end, dateStart: toDateOnly(anchor), dateEnd: toDateOnly(nextAnchor) };
}
