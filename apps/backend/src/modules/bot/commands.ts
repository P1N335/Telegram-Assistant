import type { Bot } from "grammy";
import type { AppContainer } from "../../shared/di/container.js";
import { UserService } from "../users/user.service.js";
import type { BotContext } from "./context.js";
import { resolveUser } from "./resolve-user.js";
import { miniAppButton, tasksKeyboard } from "./keyboards.js";
import { startReflection } from "./flows/reflection.flow.js";
import { TEXT } from "./text.js";

/** Регистрирует команды бота. Deep-link payload приходит в ctx.match у /start. */
export function registerCommands(bot: Bot<BotContext>, c: AppContainer): void {
  bot.command("start", async (ctx) => {
    const user = await resolveUser(c, ctx);
    const payload = ctx.match; // deep link: t.me/<bot>?start=<payload>
    if (payload) c.logger.child({ module: "bot" }).info({ payload, userId: user?.id }, "deep link");
    await ctx.reply(TEXT.start(ctx.from?.first_name ?? "друг"), {
      reply_markup: miniAppButton(c.env.MINI_APP_URL),
    });
  });

  bot.command("help", (ctx) => ctx.reply(TEXT.help));

  bot.command("tasks", async (ctx) => {
    const user = await resolveUser(c, ctx);
    if (!user) return;
    const tasks = await c.services.tasks.listForDay(user.id);
    if (tasks.length === 0) {
      await ctx.reply(TEXT.noTasks, { reply_markup: miniAppButton(c.env.MINI_APP_URL) });
      return;
    }
    await ctx.reply(TEXT.tasksList(tasks), { reply_markup: tasksKeyboard(tasks) });
  });

  bot.command("stats", async (ctx) => {
    const user = await resolveUser(c, ctx);
    if (!user) return;
    const stats = await c.services.users.getStatistics(user.id);
    await ctx.reply(TEXT.stats(UserService.toStatisticsDto(stats)));
  });

  bot.command("pet", async (ctx) => {
    const user = await resolveUser(c, ctx);
    if (!user) return;
    const pet = await c.services.pet.getView(user.id);
    await ctx.reply(TEXT.pet(pet), { reply_markup: miniAppButton(c.env.MINI_APP_URL) });
  });

  bot.command("reflect", async (ctx) => {
    await startReflection(ctx);
  });
}
