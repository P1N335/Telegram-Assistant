import type { Bot } from "grammy";
import type { TaskStatus } from "@tpc/shared";
import type { AppContainer } from "../../shared/di/container.js";
import type { BotContext } from "./context.js";
import { resolveUser } from "./resolve-user.js";
import { tasksKeyboard } from "./keyboards.js";
import { startReflection } from "./flows/reflection.flow.js";
import { TEXT } from "./text.js";

const VALID_STATUSES = new Set(["COMPLETED", "SKIPPED", "POSTPONED", "PENDING"]);

/** Обработка callback-кнопок: смена статуса задачи и запуск рефлексии. */
export function registerCallbacks(bot: Bot<BotContext>, c: AppContainer): void {
  // reflect:start
  bot.callbackQuery("reflect:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    await startReflection(ctx);
  });

  // task:<id>:<STATUS>
  bot.callbackQuery(/^task:([^:]+):([A-Z]+)$/, async (ctx) => {
    const user = await resolveUser(c, ctx);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const taskId = ctx.match[1]!;
    const status = ctx.match[2]!;
    if (!VALID_STATUSES.has(status)) {
      await ctx.answerCallbackQuery({ text: "Неизвестное действие" });
      return;
    }

    try {
      await c.services.tasks.setStatus(user.id, taskId, status as TaskStatus);
      await ctx.answerCallbackQuery({ text: "Готово ✅" });
      // Перерисовываем список с обновлёнными статусами.
      const tasks = await c.services.tasks.listForDay(user.id);
      await ctx.editMessageText(TEXT.tasksList(tasks), { reply_markup: tasksKeyboard(tasks) });
    } catch (err) {
      c.logger.child({ module: "bot" }).warn({ err }, "callback task status");
      await ctx.answerCallbackQuery({ text: "Не получилось обновить" });
    }
  });
}
