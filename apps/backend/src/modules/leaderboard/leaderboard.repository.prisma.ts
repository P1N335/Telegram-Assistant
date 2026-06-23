import type { PrismaClient } from "@tpc/database";
import type { ILeaderboardRepository, LeaderboardRow } from "./leaderboard.repository.js";

export class PrismaLeaderboardRepository implements ILeaderboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async topByXp(limit: number, offset: number): Promise<LeaderboardRow[]> {
    // ORDER BY xp DESC использует @@index([xp]) (обратный скан); id — детерминированный тай-брейк.
    const rows = await this.prisma.userStatistics.findMany({
      orderBy: [{ xp: "desc" }, { userId: "asc" }],
      take: limit,
      skip: offset,
      select: {
        userId: true,
        xp: true,
        level: true,
        user: { select: { firstName: true, username: true } },
      },
    });
    return rows.map(PrismaLeaderboardRepository.toRow);
  }

  countAll(): Promise<number> {
    return this.prisma.userStatistics.count();
  }

  countWithXpAbove(xp: number): Promise<number> {
    return this.prisma.userStatistics.count({ where: { xp: { gt: xp } } });
  }

  async getRow(userId: string): Promise<LeaderboardRow | null> {
    const row = await this.prisma.userStatistics.findUnique({
      where: { userId },
      select: {
        userId: true,
        xp: true,
        level: true,
        user: { select: { firstName: true, username: true } },
      },
    });
    return row ? PrismaLeaderboardRepository.toRow(row) : null;
  }

  private static toRow(r: {
    userId: string;
    xp: number;
    level: number;
    user: { firstName: string | null; username: string | null } | null;
  }): LeaderboardRow {
    return {
      userId: r.userId,
      xp: r.xp,
      level: r.level,
      firstName: r.user?.firstName ?? null,
      username: r.user?.username ?? null,
    };
  }
}
