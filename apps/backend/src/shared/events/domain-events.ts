import type { TaskStatus } from "@tpc/shared";

/**
 * Доменные события. Все несут localDate (YYYY-MM-DD в таймзоне пользователя),
 * вычисленный в сервисе-источнике, — слой геймификации остаётся tz-агностичным.
 */
export interface PlanCreatedEvent {
  type: "PlanCreated";
  userId: string;
  localDate: string;
  taskCount: number;
}

export interface TaskStatusChangedEvent {
  type: "TaskStatusChanged";
  userId: string;
  localDate: string;
  taskId: string;
  status: TaskStatus;
  previousStatus: TaskStatus;
  /** true только при первом в жизни задачи переходе в COMPLETED (анти-фарм). */
  firstCompletion: boolean;
}

export interface ReflectionSubmittedEvent {
  type: "ReflectionSubmitted";
  userId: string;
  localDate: string;
  rating: number;
  mood?: number | null;
  productivity?: number | null;
}

export interface DayCompletedEvent {
  type: "DayCompleted";
  userId: string;
  localDate: string;
}

export interface HabitCompletedEvent {
  type: "HabitCompleted";
  userId: string;
  habitId: string;
  xp: number;
}

export interface HabitMissedEvent {
  type: "HabitMissed";
  userId: string;
  habitId: string;
  penalty: number;
}

export type DomainEvent =
  | PlanCreatedEvent
  | TaskStatusChangedEvent
  | ReflectionSubmittedEvent
  | DayCompletedEvent
  | HabitCompletedEvent
  | HabitMissedEvent;

export type DomainEventType = DomainEvent["type"];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
