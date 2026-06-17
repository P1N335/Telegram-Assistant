import type { TaskStatus, PetMoodLabel } from "../types/index.js";

/** Контракты REST API между backend и Mini App. */

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
  planDate: string; // YYYY-MM-DD
  dueDate: string | null; // ISO
  order: number;
  completedAt: string | null; // ISO
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

export interface HomeResponse {
  user: UserDto;
  statistics: StatisticsDto;
  tasks: TaskDto[];
  pet: PetDto;
}

export interface ApiErrorResponse {
  error: { code: string; message: string };
}
