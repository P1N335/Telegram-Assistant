import type { PrismaClient, User, UserStatistics } from "@tpc/database";
import type { CreateUserInput, IUserRepository, UpdateUserInput } from "./user.repository.js";

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByTelegramId(telegramId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }

  createWithDefaults(data: CreateUserInput, defaultTimezone: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        languageCode: data.languageCode ?? null,
        timezone: data.timezone ?? defaultTimezone,
        statistics: { create: {} }, // 1:1 строка статистики с дефолтами
      },
    });
  }

  update(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  getStatistics(userId: string): Promise<UserStatistics | null> {
    return this.prisma.userStatistics.findUnique({ where: { userId } });
  }

  async findDistinctActiveTimezones(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { isActive: true },
      distinct: ["timezone"],
      select: { timezone: true },
    });
    return rows.map((r) => r.timezone);
  }

  findDefaultDue(kind: "morning" | "evening", timezones: string[]): Promise<User[]> {
    const hourField = kind === "morning" ? "morningHour" : "eveningHour";
    return this.prisma.user.findMany({
      where: { isActive: true, timezone: { in: timezones }, [hourField]: null },
    });
  }

  findOverriddenDue(kind: "morning" | "evening"): Promise<User[]> {
    const hourField = kind === "morning" ? "morningHour" : "eveningHour";
    return this.prisma.user.findMany({
      where: { isActive: true, [hourField]: { not: null } },
    });
  }
}
