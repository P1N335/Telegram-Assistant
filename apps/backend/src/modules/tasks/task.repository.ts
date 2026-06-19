import type { Task, TaskStatus } from "@tpc/database";

export interface CreateTaskItem {
  title: string;
  description?: string | null;
  order: number;
}

/** Контракт доступа к задачам (DIP). Реализация — PrismaTaskRepository. */
export interface ITaskRepository {
  createMany(userId: string, planDate: Date, items: CreateTaskItem[]): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  findByDay(userId: string, planDate: Date): Promise<Task[]>;
  countForDay(userId: string, planDate: Date): Promise<number>;
  updateStatus(
    id: string,
    status: TaskStatus,
    completedAt: Date | null,
    markXpAwarded: boolean,
  ): Promise<Task>;
  delete(id: string): Promise<void>;
}
