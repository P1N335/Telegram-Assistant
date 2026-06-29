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

/**
 * Окно выборки привычек по локальному времени дня (для напоминаний). Каждое окно
 * связывает группу таймзон с инклюзивным диапазоном `timeOfDay` ["HH:MM".."HH:MM"].
 * Таймзоны с одинаковым текущим локальным временем делят одно окно (меньше запросов).
 */
export interface HabitDueWindow {
  timezones: string[];
  gte: string;
  lte: string;
}

export interface IHabitRepository {
  create(userId: string, data: CreateHabitData): Promise<Habit>;
  update(id: string, data: UpdateHabitData): Promise<Habit>;
  findById(id: string): Promise<Habit | null>;
  listActiveByUser(userId: string): Promise<Habit[]>;
  /**
   * Активные привычки, чьё `timeOfDay` попадает в окно своей таймзоны — для
   * напоминаний. Оконный предфильтр вместо скана всех привычек (масштаб 100k+).
   */
  listActiveDueInWindows(windows: HabitDueWindow[]): Promise<HabitWithUser[]>;
  /**
   * Активные привычки пользователей из указанных таймзон — для ночного роллловера
   * (берём только таймзоны, где сейчас локальная полночь), без скана всей таблицы.
   */
  listActiveByTimezones(timezones: string[]): Promise<HabitWithUser[]>;
  delete(id: string): Promise<void>;

  /** Создаёт отметку выполнения; false, если уже была (идемпотентность по дню). */
  createCompletionIfAbsent(habitId: string, date: Date): Promise<boolean>;
  /** Удаляет отметку выполнения; true, если запись была. */
  deleteCompletion(habitId: string, date: Date): Promise<boolean>;
  hasCompletion(habitId: string, date: Date): Promise<boolean>;
  /** id привычек пользователя, выполненных в указанный день. */
  completedHabitIds(userId: string, date: Date): Promise<Set<string>>;
}
