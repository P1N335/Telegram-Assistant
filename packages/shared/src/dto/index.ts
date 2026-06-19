import type { TaskStatus, TaskPeriod, PetMoodLabel } from "../types/index.js";

/** Контракты REST API между backend и Mini App. */

export interface SubtaskDto {
  id: string;
  title: string;
  isDone: boolean;
  order: number;
}

export interface PetDto {
  name: string;
  speciesCode: string;
  emoji: string;
  stageTitle: string;
  level: number;
  xp: number;
  mood: number; // 0..100, с учётом ленивого decay
  energy: number; // 0..100
  moodLabel: PetMoodLabel;
  phrase: string;
}

export interface UserDto {
  id: string;
  telegramId: string; // BigInt сериализуется строкой
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
}

export interface StatisticsDto {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  tasksCreated: number;
  tasksCompleted: number;
  completionRate: number; // 0..1
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  period: TaskPeriod;
  planDate: string; // YYYY-MM-DD (якорь периода)
  dueDate: string | null; // ISO
  order: number;
  completedAt: string | null; // ISO
  subtasks: SubtaskDto[];
}

// ── Requests / Responses ──────────────────────────────────────

export interface TelegramAuthRequest {
  initData: string;
}

export interface TelegramAuthResponse {
  token: string;
  user: UserDto;
}

export interface PlanDayRequest {
  /** Сырой текст плана (бот) — будет распознан эвристикой. */
  text?: string;
  /** Либо готовый список (Mini App). */
  tasks?: Array<{ title: string; description?: string }>;
  /** YYYY-MM-DD; по умолчанию — сегодня в таймзоне пользователя. */
  date?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

/** Создание одиночной задачи из Mini App. */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  period: TaskPeriod;
  /** Дедлайн (ISO с временем). */
  dueDate?: string | null;
  /** Опорная дата для якоря периода (YYYY-MM-DD); по умолчанию — сегодня. */
  date?: string;
  /** Заголовки подзадач. */
  subtasks?: string[];
}

/** Частичное редактирование задачи. */
export interface UpdateTaskRequest {
  title?: string;
  dueDate?: string | null;
}

export interface CreateSubtaskRequest {
  title: string;
}

export interface UpdateSubtaskRequest {
  title?: string;
  isDone?: boolean;
}

export interface HomeResponse {
  user: UserDto;
  statistics: StatisticsDto;
  tasks: TaskDto[];
  pet: PetDto;
}

export interface ApiErrorResponse {
  error: { code: string; message: string };
}
