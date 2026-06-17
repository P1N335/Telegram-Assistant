import type { User } from "@tpc/database";
import type { AppContainer } from "../../shared/di/container.js";
import type { BotContext } from "./context.js";

/**
 * Сопоставляет Telegram-пользователя с записью в нашей БД (idempotent).
 * Один источник логики регистрации — тот же UserService, что и в API.
 */
export async function resolveUser(c: AppContainer, ctx: BotContext): Promise<User | null> {
  const from = ctx.from;
  if (!from) return null;
  return c.services.users.authenticateOrCreate({
    telegramId: BigInt(from.id),
    username: from.username ?? null,
    firstName: from.first_name ?? null,
    lastName: from.last_name ?? null,
    languageCode: from.language_code ?? null,
  });
}
