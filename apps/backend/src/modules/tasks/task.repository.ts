import type { Subtask, Task, TaskPeriod, TaskStatus } from "@tpc/database";

export interface CreateTaskItem {
  title: string;
  description?: string | null;
  order: number;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  order: number;
  subtaskTitles?: string[];
}

export type TaskWithSubtasks = Task & { subtasks: Subtask[] };

/** Задача с минимумом полей пользователя — для рассылки напоминаний. */
export type ReminderTask = Task & { user: { telegramId: bigint; timezone: string } };

/** Контракт доступа к задачам и подзадачам (DIP). */
export interface ITaskRepository {
  // Задачи
  createMany(userId: string, period: TaskPeriod, planDate: Date, items: CreateTaskItem[]): Promise<Task[]>;
  createOne(userId: string, period: TaskPeriod, planDate: Date, data: CreateTaskData): Promise<TaskWithSubtasks>;
  findById(id: string): Promise<TaskWithSubtasks | null>;
  /** Точный бакет (период + якорь) — для внутренней логики (идеальный день, рефлексия). */
  findByPeriod(userId: string, period: TaskPeriod, planDate: Date): Promise<TaskWithSubtasks[]>;
  /**
   * Видимость во вкладке периода (date-driven каскад):
   * задачи с dueDate в [start, end) ИЛИ задачи без даты из бакета (period + anchor).
   */
  findForView(
    userId: string,
    period: TaskPeriod,
    start: Date,
    end: Date,
    anchor: Date,
  ): Promise<TaskWithSubtasks[]>;
  countForPeriod(userId: string, period: TaskPeriod, planDate: Date): Promise<number>;
  updateStatus(id: string, status: TaskStatus, completedAt: Date | null, markXpAwarded: boolean): Promise<Task>;
  updateTask(id: string, data: { title?: string; dueDate?: Date | null }): Promise<Task>;
  delete(id: string): Promise<void>;

  // Напоминания
  findDueForReminder(from: Date, to: Date): Promise<ReminderTask[]>;
  markReminderSent(id: string): Promise<void>;

  // Подзадачи
  createSubtask(taskId: string, title: string, order: number): Promise<Subtask>;
  updateSubtask(id: string, data: { title?: string; isDone?: boolean }): Promise<Subtask>;
  deleteSubtask(id: string): Promise<void>;
  countSubtasks(taskId: string): Promise<number>;
  findSubtaskOwner(id: string): Promise<{ userId: string } | null>;
}
