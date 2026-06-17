import type { User, UserStatistics } from "@tpc/database";

export interface CreateUserInput {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  timezone?: string;
}

export type UpdateUserInput = Partial<Pick<User, "username" | "firstName" | "lastName" | "timezone" | "isActive" | "morningHour" | "eveningHour">>;

/**
 * Контракт доступа к пользователям. Сервисы зависят от него, а не от Prisma (DIP).
 * Реализация — PrismaUserRepository.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: bigint): Promise<User | null>;
  /** Создаёт пользователя вместе со строкой статистики в одной транзакции. */
  createWithDefaults(data: CreateUserInput, defaultTimezone: string): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  getStatistics(userId: string): Promise<UserStatistics | null>;

  // ── Планировщик рассылок (выборка по таймзоне) ──
  /** Уникальные таймзоны активных пользователей (их немного → дёшево). */
  findDistinctActiveTimezones(): Promise<string[]>;
  /** Активные пользователи в указанных таймзонах без персонального override часа. */
  findDefaultDue(kind: "morning" | "evening", timezones: string[]): Promise<User[]>;
  /** Активные пользователи с персональным override часа (фильтруются по локальному часу в сервисе). */
  findOverriddenDue(kind: "morning" | "evening"): Promise<User[]>;
}
