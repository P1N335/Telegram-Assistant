import type { Habit, HabitCadence } from "@tpc/database";

export interface CreateHabitData {
  title: string;
  timeOfDay: string;
  cadence: HabitCadence;
  intervalDays?: number | null;
  weekdays?: number[];
  startDate: Date;
  xpReward: number;
  xpPenalty: number;
  skillCode?: string | null;
}

export interface UpdateHabitData {
  title: string;
  timeOfDay: string;
  cadence: HabitCadence;
  intervalDays: number | null;
  weekdays: number[];
  xpReward: number;
  xpPenalty: number;
  skillCode?: string | null;
}

export type HabitWithUser = Habit & { user: { telegramId: bigint; timezone: string } };

export interface IHabitRepository {
  create(userId: string, data: CreateHabitData): Promise<Habit>;
  update(id: string, data: UpdateHabitData): Promise<Habit>;
  findById(id: string): Promise<Habit | null>;
  listActiveByUser(userId: string): Promise<Habit[]>;
  /** Все активные привычки с данными пользователя — для планировщика. */
  listAllActiveWithUser(): Promise<HabitWithUser[]>;
  delete(id: string): Promise<void>;

  /** Создаёт отметку выполнения; false, если уже была (идемпотентность по дню). */
  createCompletionIfAbsent(habitId: string, date: Date): Promise<boolean>;
  /** Удаляет отметку выполнения; true, если запись была. */
  deleteCompletion(habitId: string, date: Date): Promise<boolean>;
  hasCompletion(habitId: string, date: Date): Promise<boolean>;
  /** id привычек пользователя, выполненных в указанный день. */
  completedHabitIds(userId: string, date: Date): Promise<Set<string>>;
}
