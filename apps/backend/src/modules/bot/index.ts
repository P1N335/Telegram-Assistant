import { Bot, session } from "grammy";
import type { AppContainer } from "../../shared/di/container.js";
import { type BotContext, type SessionData, initialSession } from "./context.js";
import { PrismaSessionStorage } from "./session-storage.js";
import { registerCommands } from "./commands.js";
import { registerCallbacks } from "./callbacks.js";
import { handlePlanText } from "./flows/planning.js";
import { handleReflectionStep } from "./flows/reflection.flow.js";

/** Создаёт и настраивает grammY-бота из DI-контейнера. */
export function createBot(c: AppContainer): Bot<BotContext> {
  const bot = new Bot<BotContext>(c.env.TELEGRAM_BOT_TOKEN);

  // Сессии в Postgres (нужны для пошаговой рефлексии).
  bot.use(
    session<SessionData, BotContext>({
      initial: initialSession,
      storage: new PrismaSessionStorage<SessionData>(c.prisma),
    }),
  );

  registerCommands(bot, c);
  registerCallbacks(bot, c);

  // Свободный текст: сперва шаг рефлексии, иначе — план дня.
  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return; // команды обрабатываются выше
    const consumed = await handleReflectionStep(c, ctx);
    if (!consumed) await handlePlanText(c, ctx);
  });

  bot.catch((err) => {
    c.logger.child({ module: "bot" }).error({ err: err.error }, "Ошибка в обработчике бота");
  });

  return bot;
}
