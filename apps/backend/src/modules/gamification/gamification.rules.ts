import type { Achievement } from "@tpc/database";

/** Чистые функции правил геймификации — тестируются без БД. */

/** YYYY-MM-DD предыдущего дня. */
export function previousDate(localDate: string): string {
  const dt = new Date(`${localDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function toLocalDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewActiveDay: boolean;
}

/**
 * Переход streak при активности (план или рефлексия) в localDate.
 * Сегодня уже активны → без изменений; вчера → +1; иначе сброс к 1.
 */
export function nextStreak(
  prevStreak: number,
  prevLongest: number,
  lastActivity: string | null,
  localDate: string,
): StreakResult {
  if (lastActivity === localDate) {
    return { currentStreak: prevStreak, longestStreak: prevLongest, isNewActiveDay: false };
  }
  const current = lastActivity === previousDate(localDate) ? prevStreak + 1 : 1;
  return {
    currentStreak: current,
    longestStreak: Math.max(prevLongest, current),
    isNewActiveDay: true,
  };
}

/** Скользящее среднее. */
export function runningAverage(oldAvg: number | null, oldCount: number, value: number): number {
  if (oldCount <= 0 || oldAvg === null) return value;
  return (oldAvg * oldCount + value) / (oldCount + 1);
}

/** Проекция метрик для проверки достижений (после применения события). */
export interface AchievementContext {
  level: number;
  currentStreak: number;
  plansCreated: number;
  reflectionsDone: number;
  tasksCompleted: number;
}

/** Достижение разблокируется по категории + порогу (данные из каталога, не хардкод кодов). */
export function meetsCriteria(a: Achievement, ctx: AchievementContext): boolean {
  const t = a.threshold ?? Number.POSITIVE_INFINITY;
  switch (a.category) {
    case "streak":
      return ctx.currentStreak >= t;
    case "level":
      return ctx.level >= t;
    case "reflection":
      return ctx.reflectionsDone >= (a.threshold ?? 1);
    case "tasks":
      if (a.code === "first_plan") return ctx.plansCreated >= 1;
      if (a.code === "perfect_day") return false; // только через событие DayCompleted
      return ctx.tasksCompleted >= t;
    default:
      return false;
  }
}
