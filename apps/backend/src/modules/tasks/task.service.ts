import type { Task } from "@tpc/database";
import { TaskStatus, type TaskDto, type PlanDayRequest } from "@tpc/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { getLocalDateString, toDateOnly } from "../../shared/time.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITaskRepository } from "./task.repository.js";
import { TaskParser } from "./task.parser.js";

/** Бизнес-логика задач. XP/достижения начисляются через доменные события (event-bus). */
export class TaskService {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly users: IUserRepository,
    private readonly parser: TaskParser,
    private readonly events: EventBus,
  ) {}

  async planDay(userId: string, input: PlanDayRequest): Promise<TaskDto[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const dateStr = input.date ?? getLocalDateString(user.timezone);
    const planDate = toDateOnly(dateStr);

    const items =
      input.tasks?.map((t) => ({ title: t.title.trim(), description: t.description?.trim() })) ??
      this.parser.parse(input.text ?? "");

    const valid = items.filter((t) => t.title.length > 0);
    if (valid.length === 0) throw new ValidationError("Не удалось распознать ни одной задачи");

    const base = await this.tasks.countForDay(userId, planDate);
    const created = await this.tasks.createMany(
      userId,
      planDate,
      valid.map((t, i) => ({ title: t.title, description: t.description ?? null, order: base + i })),
    );

    await this.events.emit({
      type: "PlanCreated",
      userId,
      localDate: dateStr,
      taskCount: created.length,
    });

    return created.map(TaskService.toDto);
  }

  async listForDay(userId: string, dateStr?: string): Promise<TaskDto[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");
    const planDate = toDateOnly(dateStr ?? getLocalDateString(user.timezone));
    const rows = await this.tasks.findByDay(userId, planDate);
    return rows.map(TaskService.toDto);
  }

  async setStatus(userId: string, taskId: string, status: TaskStatus): Promise<TaskDto> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError("Задача не найдена");
    if (task.userId !== userId) throw new ForbiddenError("Чужая задача");

    const previousStatus = task.status as TaskStatus;
    const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
    const updated = await this.tasks.updateStatus(taskId, status, completedAt);

    const localDate = task.planDate.toISOString().slice(0, 10);
    await this.events.emit({
      type: "TaskStatusChanged",
      userId,
      localDate,
      taskId,
      status,
      previousStatus,
    });

    // Полностью выполненный день → отдельная награда (один раз — гард по previousStatus).
    if (status === TaskStatus.COMPLETED && previousStatus !== TaskStatus.COMPLETED) {
      const dayTasks = await this.tasks.findByDay(userId, task.planDate);
      if (dayTasks.length > 0 && dayTasks.every((t) => t.status === TaskStatus.COMPLETED)) {
        await this.events.emit({ type: "DayCompleted", userId, localDate });
      }
    }

    return TaskService.toDto(updated);
  }

  static toDto(t: Task): TaskDto {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as TaskDto["status"],
      planDate: t.planDate.toISOString().slice(0, 10),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      order: t.order,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    };
  }
}
