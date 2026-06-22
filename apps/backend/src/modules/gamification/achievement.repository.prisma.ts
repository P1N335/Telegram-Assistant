import { Prisma, type Achievement, type PrismaClient } from "@tpc/database";
import type { IAchievementRepository } from "./achievement.repository.js";

export class PrismaAchievementRepository implements IAchievementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listActive(): Promise<Achievement[]> {
    return this.prisma.achievement.findMany({ where: { isActive: true } });
  }

  async findUnlockedCodes(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievement: { select: { code: true } } },
    });
    return new Set(rows.map((r) => r.achievement.code));
  }

  async findUnlockedMap(userId: string): Promise<Map<string, Date>> {
    const rows = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { unlockedAt: true, achievement: { select: { code: true } } },
    });
    return new Map(rows.map((r) => [r.achievement.code, r.unlockedAt]));
  }

  async unlock(userId: string, achievementId: string): Promise<boolean> {
    try {
      await this.prisma.userAchievement.create({ data: { userId, achievementId } });
      return true;
    } catch (err) {
      // P2002 = уже разблокировано (unique userId+achievementId)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  }
}
