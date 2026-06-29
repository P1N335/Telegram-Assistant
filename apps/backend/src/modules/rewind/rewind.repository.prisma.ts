import type { PrismaClient } from "@tpc/database";
import type { RewindRaw } from "./rewind.rules.js";
import type { IRewindRepository, RewindRange } from "./rewind.repository.js";

export class PrismaRewindRepository implements IRewindRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async aggregateMonth(userId: string, range: RewindRange): Promise<RewindRaw> {
    // Задачи (completedAt — реальный timestamp) и привычки (date — @db.Date) считаем
    // параллельно, разными границами. Все запросы префиксованы userId → индекс-дружелюбно.
    const [tasksCompleted, taskGroups, completions] = await Promise.all([
      this.prisma.task.count({
        where: { userId, status: "COMPLETED", completedAt: { gte: range.tsStart, lt: range.tsEnd } },
      }),
      this.prisma.task.groupBy({
        by: ["skillCode"],
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: range.tsStart, lt: range.tsEnd },
          skillCode: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.habitCompletion.findMany({
        where: { date: { gte: range.dateStart, lt: range.dateEnd }, habit: { userId } },
        select: { habit: { select: { skillCode: true, xpReward: true } } },
      }),
    ]);

    return {
      tasksCompleted,
      // skillCode != null гарантирован where-условием; flatMap заодно сужает тип к string.
      taskSkillCounts: taskGroups.flatMap((g) =>
        g.skillCode === null ? [] : [{ skillCode: g.skillCode, count: g._count._all }],
      ),
      habitCompletions: completions.map((c) => ({
        skillCode: c.habit.skillCode,
        xpReward: c.habit.xpReward,
      })),
    };
  }
}
