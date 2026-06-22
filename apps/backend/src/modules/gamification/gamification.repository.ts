import type { UserStatistics } from "@tpc/database";

/**
 * Патч статистики: increment-поля (атомарны на стороне БД) и set-поля (вычисляемые).
 * Разделение позволяет инкрементить счётчики без гонок, а level/streak ставить из расчёта.
 */
export interface StatsPatch {
  incXp?: number;
  setXp?: number; // перезапись (для штрафа с клампом 0)
  incTasksCreated?: number;
  incTasksCompleted?: number;
  incTasksSkipped?: number;
  incTasksPostponed?: number;
  incPlansCreated?: number;
  incReflections?: number;
  incTotalActiveDays?: number;

  setLevel?: number;
  setCurrentStreak?: number;
  setLongestStreak?: number;
  setLastPlanDate?: Date;
  setLastReflectDate?: Date;
  setLastActivityDate?: Date;
  setAvgMood?: number;
  setAvgProductivity?: number;
}

export interface IGamificationRepository {
  getStatistics(userId: string): Promise<UserStatistics | null>;
  applyUpdate(userId: string, patch: StatsPatch): Promise<UserStatistics>;
}
