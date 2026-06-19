import type { PrismaClient, Task, TaskStatus } from "@tpc/database";
import type { CreateTaskItem, ITaskRepository } from "./task.repository.js";

export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(userId: string, planDate: Date, items: CreateTaskItem[]): Promise<Task[]> {
    // createManyAndReturn — один round-trip, возвращает созданные строки.
    return this.prisma.task.createManyAndReturn({
      data: items.map((it) => ({
        userId,
        planDate,
        title: it.title,
        description: it.description ?? null,
        order: it.order,
      })),
    });
  }

  findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  findByDay(userId: string, planDate: Date): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { userId, planDate },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }

  countForDay(userId: string, planDate: Date): Promise<number> {
    return this.prisma.task.count({ where: { userId, planDate } });
  }

  updateStatus(
    id: string,
    status: TaskStatus,
    completedAt: Date | null,
    markXpAwarded: boolean,
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { status, completedAt, ...(markXpAwarded ? { xpAwarded: true } : {}) },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
