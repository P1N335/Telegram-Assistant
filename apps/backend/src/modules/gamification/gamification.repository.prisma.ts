import type { Prisma, PrismaClient, UserStatistics } from "@tpc/database";
import type { IGamificationRepository, StatsPatch } from "./gamification.repository.js";

export class PrismaGamificationRepository implements IGamificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getStatistics(userId: string): Promise<UserStatistics | null> {
    return this.prisma.userStatistics.findUnique({ where: { userId } });
  }

  applyUpdate(userId: string, patch: StatsPatch): Promise<UserStatistics> {
    const data: Prisma.UserStatisticsUpdateInput = {};

    const inc = (field: keyof Prisma.UserStatisticsUpdateInput, value?: number) => {
      if (value) (data as Record<string, unknown>)[field] = { increment: value };
    };
    inc("xp", patch.incXp);
    inc("tasksCreated", patch.incTasksCreated);
    inc("tasksCompleted", patch.incTasksCompleted);
    inc("tasksSkipped", patch.incTasksSkipped);
    inc("tasksPostponed", patch.incTasksPostponed);
    inc("plansCreated", patch.incPlansCreated);
    inc("reflectionsDone", patch.incReflections);
    inc("totalActiveDays", patch.incTotalActiveDays);

    if (patch.setLevel !== undefined) data.level = patch.setLevel;
    if (patch.setCurrentStreak !== undefined) data.currentStreak = patch.setCurrentStreak;
    if (patch.setLongestStreak !== undefined) data.longestStreak = patch.setLongestStreak;
    if (patch.setLastPlanDate !== undefined) data.lastPlanDate = patch.setLastPlanDate;
    if (patch.setLastReflectDate !== undefined) data.lastReflectDate = patch.setLastReflectDate;
    if (patch.setLastActivityDate !== undefined) data.lastActivityDate = patch.setLastActivityDate;
    if (patch.setAvgMood !== undefined) data.avgMood = patch.setAvgMood;
    if (patch.setAvgProductivity !== undefined) data.avgProductivity = patch.setAvgProductivity;

    return this.prisma.userStatistics.update({ where: { userId }, data });
  }
}
