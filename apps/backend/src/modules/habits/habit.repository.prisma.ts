import { Prisma, type Habit, type PrismaClient } from "@tpc/database";
import type {
  CreateHabitData,
  HabitDueWindow,
  HabitWithUser,
  IHabitRepository,
  UpdateHabitData,
} from "./habit.repository.js";

export class PrismaHabitRepository implements IHabitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string, data: CreateHabitData): Promise<Habit> {
    return this.prisma.habit.create({
      data: {
        userId,
        title: data.title,
        timeOfDay: data.timeOfDay,
        cadence: data.cadence,
        intervalDays: data.intervalDays ?? null,
        weekdays: data.weekdays ?? [],
        startDate: data.startDate,
        xpReward: data.xpReward,
        xpPenalty: data.xpPenalty,
        skillCode: data.skillCode ?? null,
      },
    });
  }

  update(id: string, data: UpdateHabitData): Promise<Habit> {
    return this.prisma.habit.update({
      where: { id },
      data: {
        title: data.title,
        timeOfDay: data.timeOfDay,
        cadence: data.cadence,
        intervalDays: data.intervalDays,
        weekdays: data.weekdays,
        xpReward: data.xpReward,
        xpPenalty: data.xpPenalty,
        ...(data.skillCode !== undefined ? { skillCode: data.skillCode } : {}),
      },
    });
  }

  findById(id: string): Promise<Habit | null> {
    return this.prisma.habit.findUnique({ where: { id } });
  }

  listActiveByUser(userId: string): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: { userId, isActive: true },
      orderBy: { timeOfDay: "asc" },
    });
  }

  listActiveDueInWindows(windows: HabitDueWindow[]): Promise<HabitWithUser[]> {
    const nonEmpty = windows.filter((w) => w.timezones.length > 0);
    if (nonEmpty.length === 0) return Promise.resolve([]);
    // Каждый OR-кляуз связывает диапазон времени со своей группой таймзон, поэтому
    // привычка матчится, только если ОБА условия её окна выполнены (без перекрёста
    // между группами). Диапазон по `timeOfDay` опирается на индекс (isActive,timeOfDay).
    return this.prisma.habit.findMany({
      where: {
        isActive: true,
        OR: nonEmpty.map((w) => ({
          timeOfDay: { gte: w.gte, lte: w.lte },
          user: { timezone: { in: w.timezones } },
        })),
      },
      include: { user: { select: { telegramId: true, timezone: true } } },
    });
  }

  listActiveByTimezones(timezones: string[]): Promise<HabitWithUser[]> {
    if (timezones.length === 0) return Promise.resolve([]);
    return this.prisma.habit.findMany({
      where: { isActive: true, user: { timezone: { in: timezones } } },
      include: { user: { select: { telegramId: true, timezone: true } } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.habit.delete({ where: { id } });
  }

  async createCompletionIfAbsent(habitId: string, date: Date): Promise<boolean> {
    try {
      await this.prisma.habitCompletion.create({ data: { habitId, date } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  }

  async deleteCompletion(habitId: string, date: Date): Promise<boolean> {
    const res = await this.prisma.habitCompletion.deleteMany({ where: { habitId, date } });
    return res.count > 0;
  }

  async hasCompletion(habitId: string, date: Date): Promise<boolean> {
    const row = await this.prisma.habitCompletion.findUnique({
      where: { habitId_date: { habitId, date } },
      select: { id: true },
    });
    return row !== null;
  }

  async completedHabitIds(userId: string, date: Date): Promise<Set<string>> {
    const rows = await this.prisma.habitCompletion.findMany({
      where: { date, habit: { userId } },
      select: { habitId: true },
    });
    return new Set(rows.map((r) => r.habitId));
  }
}
