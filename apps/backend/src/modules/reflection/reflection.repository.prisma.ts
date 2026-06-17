import type { DailyReport, PrismaClient } from "@tpc/database";
import type { IReflectionRepository, ReflectionData } from "./reflection.repository.js";

export class PrismaReflectionRepository implements IReflectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  upsert(userId: string, date: Date, data: ReflectionData): Promise<DailyReport> {
    const payload = {
      howWasDay: data.howWasDay ?? null,
      summary: data.summary ?? null,
      goodThings: data.goodThings ?? null,
      difficulties: data.difficulties ?? null,
      rating: data.rating,
      mood: data.mood ?? null,
      productivity: data.productivity ?? null,
      aiInsight: data.aiInsight ?? null,
    };
    return this.prisma.dailyReport.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...payload },
      update: payload,
    });
  }

  findByDay(userId: string, date: Date): Promise<DailyReport | null> {
    return this.prisma.dailyReport.findUnique({ where: { userId_date: { userId, date } } });
  }

  async setInsight(id: string, insight: string): Promise<void> {
    await this.prisma.dailyReport.update({ where: { id }, data: { aiInsight: insight } });
  }
}
