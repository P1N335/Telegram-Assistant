import type { PrismaClient, Subtask, Task, TaskPeriod, TaskStatus } from "@tpc/database";
import type {
  CreateTaskData,
  CreateTaskItem,
  ITaskRepository,
  ReminderTask,
  TaskWithSubtasks,
} from "./task.repository.js";

const SUBTASK_ORDER = { orderBy: { order: "asc" } } as const;

export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createMany(userId: string, period: TaskPeriod, planDate: Date, items: CreateTaskItem[]): Promise<Task[]> {
    return this.prisma.task.createManyAndReturn({
      data: items.map((it) => ({
        userId,
        period,
        planDate,
        title: it.title,
        description: it.description ?? null,
        order: it.order,
      })),
    });
  }

  createOne(userId: string, period: TaskPeriod, planDate: Date, data: CreateTaskData): Promise<TaskWithSubtasks> {
    return this.prisma.task.create({
      data: {
        userId,
        period,
        planDate,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
        order: data.order,
        subtasks: data.subtaskTitles?.length
          ? { create: data.subtaskTitles.map((t, i) => ({ title: t, order: i })) }
          : undefined,
      },
      include: { subtasks: SUBTASK_ORDER },
    });
  }

  findById(id: string): Promise<TaskWithSubtasks | null> {
    return this.prisma.task.findUnique({ where: { id }, include: { subtasks: SUBTASK_ORDER } });
  }

  findByPeriod(userId: string, period: TaskPeriod, planDate: Date): Promise<TaskWithSubtasks[]> {
    return this.prisma.task.findMany({
      where: { userId, period, planDate },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { subtasks: SUBTASK_ORDER },
    });
  }

  findForView(
    userId: string,
    period: TaskPeriod,
    start: Date,
    end: Date,
    anchor: Date,
  ): Promise<TaskWithSubtasks[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: start, lt: end } }, // задачи с датой в этом периоде
          { dueDate: null, period, planDate: anchor }, // задачи без даты — из своего бакета
        ],
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { order: "asc" }, { createdAt: "asc" }],
      include: { subtasks: SUBTASK_ORDER },
    });
  }

  countForPeriod(userId: string, period: TaskPeriod, planDate: Date): Promise<number> {
    return this.prisma.task.count({ where: { userId, period, planDate } });
  }

  updateStatus(id: string, status: TaskStatus, completedAt: Date | null, markXpAwarded: boolean): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { status, completedAt, ...(markXpAwarded ? { xpAwarded: true } : {}) },
    });
  }

  updateTask(id: string, data: { title?: string; dueDate?: Date | null }): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        // Меняем дедлайн → сбрасываем метку напоминания, чтобы напомнить заново.
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate, reminderSentAt: null } : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }

  findDueForReminder(from: Date, to: Date): Promise<ReminderTask[]> {
    return this.prisma.task.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { not: "COMPLETED" },
        reminderSentAt: null,
      },
      include: { user: { select: { telegramId: true, timezone: true } } },
    });
  }

  async markReminderSent(id: string): Promise<void> {
    await this.prisma.task.update({ where: { id }, data: { reminderSentAt: new Date() } });
  }

  createSubtask(taskId: string, title: string, order: number): Promise<Subtask> {
    return this.prisma.subtask.create({ data: { taskId, title, order } });
  }

  updateSubtask(id: string, data: { title?: string; isDone?: boolean }): Promise<Subtask> {
    return this.prisma.subtask.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.isDone !== undefined ? { isDone: data.isDone } : {}),
      },
    });
  }

  async deleteSubtask(id: string): Promise<void> {
    await this.prisma.subtask.delete({ where: { id } });
  }

  countSubtasks(taskId: string): Promise<number> {
    return this.prisma.subtask.count({ where: { taskId } });
  }

  async findSubtaskOwner(id: string): Promise<{ userId: string } | null> {
    const row = await this.prisma.subtask.findUnique({
      where: { id },
      select: { task: { select: { userId: true } } },
    });
    return row ? { userId: row.task.userId } : null;
  }
}
