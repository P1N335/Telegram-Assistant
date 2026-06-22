import type { Subtask, Task } from "@tpc/database";
import {
  TaskStatus,
  TaskPeriod,
  type TaskDto,
  type SubtaskDto,
  type PlanDayRequest,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from "@tpc/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { getLocalDateString, periodAnchor, periodRange } from "../../shared/time.js";
import { now } from "../../shared/clock.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITaskRepository, TaskWithSubtasks } from "./task.repository.js";
import { TaskParser } from "./task.parser.js";

/** Бизнес-логика задач и подзадач. XP/достижения — через доменные события. */
export class TaskService {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly users: IUserRepository,
    private readonly parser: TaskParser,
    private readonly events: EventBus,
  ) {}

  /** Создание дневного плана из текста (бот) или готового списка. */
  async planDay(userId: string, input: PlanDayRequest): Promise<TaskDto[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const dateStr = input.date ?? getLocalDateString(user.timezone, now());
    const planDate = periodAnchor(TaskPeriod.DAY, dateStr);

    const items =
      input.tasks?.map((t) => ({ title: t.title.trim(), description: t.description?.trim() })) ??
      this.parser.parse(input.text ?? "");

    const valid = items.filter((t) => t.title.length > 0);
    if (valid.length === 0) throw new ValidationError("Не удалось распознать ни одной задачи");

    const base = await this.tasks.countForPeriod(userId, TaskPeriod.DAY, planDate);
    const created = await this.tasks.createMany(
      userId,
      TaskPeriod.DAY,
      planDate,
      valid.map((t, i) => ({ title: t.title, description: t.description ?? null, order: base + i })),
    );

    await this.events.emit({ type: "PlanCreated", userId, localDate: dateStr, taskCount: created.length });
    return created.map((t) => TaskService.toDto(t));
  }

  /** Создание одиночной задачи (Mini App) с периодом, дедлайном и подзадачами. */
  async createTask(userId: string, req: CreateTaskRequest): Promise<TaskDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const title = req.title.trim();
    if (!title) throw new ValidationError("Пустой заголовок задачи");

    const today = getLocalDateString(user.timezone, now());
    const anchor = periodAnchor(req.period, req.date ?? today);
    const dueDate = req.dueDate ? new Date(req.dueDate) : null;
    const base = await this.tasks.countForPeriod(userId, req.period, anchor);

    const created = await this.tasks.createOne(userId, req.period, anchor, {
      title,
      description: req.description?.trim() ?? null,
      dueDate,
      order: base,
      subtaskTitles: req.subtasks?.map((s) => s.trim()).filter(Boolean),
    });

    // Создание задачи = активность сегодня (стрик/счётчики), XP «плана» — раз в день.
    await this.events.emit({ type: "PlanCreated", userId, localDate: today, taskCount: 1 });
    return TaskService.toDto(created, created.subtasks);
  }

  listForDay(userId: string, dateStr?: string): Promise<TaskDto[]> {
    return this.listForPeriod(userId, TaskPeriod.DAY, dateStr);
  }

  async listForPeriod(userId: string, period: TaskPeriod, dateStr?: string): Promise<TaskDto[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const refDate = dateStr ?? getLocalDateString(user.timezone, now());
    const anchor = periodAnchor(period, refDate); // бакет для задач без даты
    const { start, end } = periodRange(period, user.timezone, refDate); // диапазон для задач с датой

    const rows = await this.tasks.findForView(userId, period, start, end, anchor);
    return rows.map((r) => TaskService.toDto(r, r.subtasks));
  }

  async setStatus(userId: string, taskId: string, status: TaskStatus): Promise<TaskDto> {
    const task = await this.requireOwnTask(userId, taskId);

    const previousStatus = task.status as TaskStatus;
    const firstCompletion = status === TaskStatus.COMPLETED && !task.xpAwarded;
    const completedAt = status === TaskStatus.COMPLETED ? now() : null;
    const updated = await this.tasks.updateStatus(taskId, status, completedAt, firstCompletion);

    const localDate = task.planDate.toISOString().slice(0, 10);
    await this.events.emit({
      type: "TaskStatusChanged",
      userId,
      localDate,
      taskId,
      status,
      previousStatus,
      firstCompletion,
    });

    // «Идеальный день» — только для дневных задач этого дня.
    if (firstCompletion && task.period === TaskPeriod.DAY) {
      const dayTasks = await this.tasks.findByPeriod(userId, TaskPeriod.DAY, task.planDate);
      if (dayTasks.length > 0 && dayTasks.every((t) => t.status === TaskStatus.COMPLETED)) {
        await this.events.emit({ type: "DayCompleted", userId, localDate });
      }
    }

    return TaskService.toDto(updated, task.subtasks);
  }

  async updateTask(userId: string, taskId: string, req: UpdateTaskRequest): Promise<TaskDto> {
    const task = await this.requireOwnTask(userId, taskId);
    const updated = await this.tasks.updateTask(taskId, {
      ...(req.title !== undefined ? { title: req.title.trim() } : {}),
      ...(req.dueDate !== undefined ? { dueDate: req.dueDate ? new Date(req.dueDate) : null } : {}),
    });
    return TaskService.toDto(updated, task.subtasks);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.requireOwnTask(userId, taskId);
    await this.tasks.delete(taskId);
  }

  // ── Подзадачи ──
  async addSubtask(userId: string, taskId: string, title: string): Promise<SubtaskDto> {
    await this.requireOwnTask(userId, taskId);
    const clean = title.trim();
    if (!clean) throw new ValidationError("Пустая подзадача");
    const order = await this.tasks.countSubtasks(taskId);
    return TaskService.subtaskDto(await this.tasks.createSubtask(taskId, clean, order));
  }

  async updateSubtask(
    userId: string,
    subtaskId: string,
    data: { title?: string; isDone?: boolean },
  ): Promise<SubtaskDto> {
    await this.requireOwnSubtask(userId, subtaskId);
    return TaskService.subtaskDto(
      await this.tasks.updateSubtask(subtaskId, {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.isDone !== undefined ? { isDone: data.isDone } : {}),
      }),
    );
  }

  async deleteSubtask(userId: string, subtaskId: string): Promise<void> {
    await this.requireOwnSubtask(userId, subtaskId);
    await this.tasks.deleteSubtask(subtaskId);
  }

  // ── helpers ──
  private async requireOwnTask(userId: string, taskId: string): Promise<TaskWithSubtasks> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError("Задача не найдена");
    if (task.userId !== userId) throw new ForbiddenError("Чужая задача");
    return task;
  }

  private async requireOwnSubtask(userId: string, subtaskId: string): Promise<void> {
    const owner = await this.tasks.findSubtaskOwner(subtaskId);
    if (!owner) throw new NotFoundError("Подзадача не найдена");
    if (owner.userId !== userId) throw new ForbiddenError("Чужая подзадача");
  }

  static toDto(t: Task, subtasks: Subtask[] = []): TaskDto {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as TaskDto["status"],
      period: t.period as TaskDto["period"],
      planDate: t.planDate.toISOString().slice(0, 10),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      order: t.order,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      subtasks: subtasks.map(TaskService.subtaskDto),
    };
  }

  static subtaskDto(s: Subtask): SubtaskDto {
    return { id: s.id, title: s.title, isDone: s.isDone, order: s.order };
  }
}
