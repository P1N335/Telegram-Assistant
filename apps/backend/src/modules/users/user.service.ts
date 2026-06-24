import type { User, UserStatistics } from "@tpc/database";
import type { UserDto, StatisticsDto } from "@tpc/shared";
import { NotFoundError } from "../../shared/errors/index.js";
import type { CreateUserInput, IUserRepository } from "./user.repository.js";

/** Бизнес-логика пользователей. Без HTTP/Telegram-специфики (тестируема изолированно). */
export class UserService {
  constructor(
    private readonly repo: IUserRepository,
    private readonly defaultTimezone: string,
  ) {}

  /** Идемпотентный вход: находит пользователя по Telegram ID или создаёт нового. */
  async authenticateOrCreate(input: CreateUserInput): Promise<User> {
    const existing = await this.repo.findByTelegramId(input.telegramId);
    if (existing) {
      // Обновляем профиль, если изменился (имя/username).
      if (
        existing.username !== (input.username ?? null) ||
        existing.firstName !== (input.firstName ?? null)
      ) {
        return this.repo.update(existing.id, {
          username: input.username ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
        });
      }
      return existing;
    }
    return this.repo.createWithDefaults(input, this.defaultTimezone);
  }

  async getById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("Пользователь не найден");
    return user;
  }

  async getStatistics(userId: string): Promise<UserStatistics> {
    const stats = await this.repo.getStatistics(userId);
    if (!stats) throw new NotFoundError("Статистика не найдена");
    return stats;
  }

  /** Вкл/выкл вечернее подведение итогов. Возвращает новое состояние. */
  async setEveningEnabled(userId: string, enabled: boolean): Promise<boolean> {
    await this.repo.update(userId, { eveningEnabled: enabled });
    return enabled;
  }

  static toDto(user: User): UserDto {
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      timezone: user.timezone,
    };
  }

  static toStatisticsDto(s: UserStatistics): StatisticsDto {
    const completionRate = s.tasksCreated > 0 ? s.tasksCompleted / s.tasksCreated : 0;
    return {
      xp: s.xp,
      level: s.level,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      tasksCreated: s.tasksCreated,
      tasksCompleted: s.tasksCompleted,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }
}
