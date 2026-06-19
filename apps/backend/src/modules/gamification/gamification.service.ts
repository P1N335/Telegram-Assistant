import type { UserStatistics } from "@tpc/database";
import { TaskStatus, XP_REWARDS, levelFromXp } from "@tpc/shared";
import type { Logger } from "../../shared/logger.js";
import { toDateOnly } from "../../shared/time.js";
import type { DomainEvent } from "../../shared/events/domain-events.js";
import type { IGamificationRepository, StatsPatch } from "./gamification.repository.js";
import type { IAchievementRepository } from "./achievement.repository.js";
import {
  type AchievementContext,
  meetsCriteria,
  nextStreak,
  runningAverage,
  toLocalDateString,
} from "./gamification.rules.js";

export interface UnlockedAchievement {
  code: string;
  title: string;
  icon: string | null;
}

export interface GamificationOutcome {
  userId: string;
  xpGained: number;
  newXp: number;
  leveledUpTo: number | null; // null, если уровень не вырос
  unlocked: UnlockedAchievement[];
}

/**
 * Единый слой правил геймификации. Подписан на доменные события.
 * Считает XP/уровень/streak/достижения и инкрементально обновляет UserStatistics.
 * Не знает про HTTP/Telegram — побочные эффекты (уведомления) делает подписчик (register.ts).
 */
export class GamificationService {
  constructor(
    private readonly stats: IGamificationRepository,
    private readonly achievements: IAchievementRepository,
    private readonly logger: Logger,
  ) {}

  async handle(event: DomainEvent): Promise<GamificationOutcome | null> {
    const current = await this.stats.getStatistics(event.userId);
    if (!current) {
      this.logger.warn({ userId: event.userId }, "Нет статистики для геймификации");
      return null;
    }

    const { patch, baseXp } = this.buildBasePatch(event, current);

    // XP достижений учитываем до применения, чтобы уровень посчитать один раз.
    const projected = this.project(current, patch, baseXp);
    const unlocked = await this.resolveAchievements(event, current, projected);
    const achXp = unlocked.reduce((s, a) => s + a.xpReward, 0);

    const totalXp = baseXp + achXp;
    const newXp = current.xp + totalXp;
    const newLevel = levelFromXp(newXp);

    if (totalXp > 0) patch.incXp = totalXp;
    if (newLevel !== current.level) patch.setLevel = newLevel;

    await this.stats.applyUpdate(event.userId, patch);
    for (const a of unlocked) await this.achievements.unlock(event.userId, a.id);

    return {
      userId: event.userId,
      xpGained: totalXp,
      newXp,
      leveledUpTo: newLevel > current.level ? newLevel : null,
      unlocked: unlocked.map((a) => ({ code: a.code, title: a.title, icon: a.icon })),
    };
  }

  // ── построение патча по типу события ──
  private buildBasePatch(event: DomainEvent, s: UserStatistics): { patch: StatsPatch; baseXp: number } {
    const patch: StatsPatch = {};
    let baseXp = 0;

    switch (event.type) {
      case "PlanCreated": {
        patch.incTasksCreated = event.taskCount;
        const firstToday = toLocalDateString(s.lastPlanDate) !== event.localDate;
        if (firstToday) {
          patch.incPlansCreated = 1;
          patch.setLastPlanDate = toDateOnly(event.localDate);
          baseXp += XP_REWARDS.PLAN_CREATED;
          this.applyActivity(patch, s, event.localDate);
        }
        break;
      }
      case "TaskStatusChanged": {
        if (event.status === TaskStatus.COMPLETED) {
          // Начисляем только за первое выполнение задачи (анти-фарм по галочке).
          if (event.firstCompletion) {
            patch.incTasksCompleted = 1;
            baseXp += XP_REWARDS.TASK_COMPLETED;
          }
        } else if (event.status === TaskStatus.SKIPPED && event.previousStatus !== TaskStatus.SKIPPED) {
          patch.incTasksSkipped = 1;
        } else if (event.status === TaskStatus.POSTPONED && event.previousStatus !== TaskStatus.POSTPONED) {
          patch.incTasksPostponed = 1;
        }
        break;
      }
      case "ReflectionSubmitted": {
        const firstToday = toLocalDateString(s.lastReflectDate) !== event.localDate;
        if (firstToday) {
          patch.incReflections = 1;
          patch.setLastReflectDate = toDateOnly(event.localDate);
          baseXp += XP_REWARDS.REFLECTION_SUBMITTED;
          this.applyActivity(patch, s, event.localDate);
          if (event.mood != null) patch.setAvgMood = runningAverage(s.avgMood, s.reflectionsDone, event.mood);
          if (event.productivity != null)
            patch.setAvgProductivity = runningAverage(s.avgProductivity, s.reflectionsDone, event.productivity);
        }
        break;
      }
      case "DayCompleted": {
        baseXp += XP_REWARDS.DAY_COMPLETED;
        break;
      }
    }

    return { patch, baseXp };
  }

  /** Обновление streak + активных дней (общий путь для плана и рефлексии). */
  private applyActivity(patch: StatsPatch, s: UserStatistics, localDate: string): void {
    const streak = nextStreak(
      s.currentStreak,
      s.longestStreak,
      toLocalDateString(s.lastActivityDate),
      localDate,
    );
    patch.setCurrentStreak = streak.currentStreak;
    patch.setLongestStreak = streak.longestStreak;
    patch.setLastActivityDate = toDateOnly(localDate);
    if (streak.isNewActiveDay) patch.incTotalActiveDays = 1;
  }

  /** Проекция метрик после патча — для проверки порогов достижений. */
  private project(s: UserStatistics, patch: StatsPatch, baseXp: number): AchievementContext {
    return {
      level: levelFromXp(s.xp + baseXp),
      currentStreak: patch.setCurrentStreak ?? s.currentStreak,
      plansCreated: s.plansCreated + (patch.incPlansCreated ?? 0),
      reflectionsDone: s.reflectionsDone + (patch.incReflections ?? 0),
      tasksCompleted: s.tasksCompleted + (patch.incTasksCompleted ?? 0),
    };
  }

  private async resolveAchievements(event: DomainEvent, current: UserStatistics, ctx: AchievementContext) {
    const [catalog, unlockedCodes] = await Promise.all([
      this.achievements.listActive(),
      this.achievements.findUnlockedCodes(current.userId),
    ]);

    const result = catalog.filter((a) => {
      if (unlockedCodes.has(a.code)) return false;
      if (a.code === "perfect_day") return event.type === "DayCompleted";
      return meetsCriteria(a, ctx);
    });
    return result;
  }
}
