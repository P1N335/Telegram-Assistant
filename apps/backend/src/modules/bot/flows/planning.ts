import type { AppContainer } from "../../../shared/di/container.js";
import type { BotContext } from "../context.js";
import { resolveUser } from "../resolve-user.js";
import { miniAppButton } from "../keyboards.js";
import { TEXT } from "../text.js";

/**
 * Разбор плана дня: любой свободный текст (не команда и не шаг рефлексии)
 * трактуется как список задач на сегодня и сохраняется через TaskService
 * (та же эвристика, что и в API).
 */
export async function handlePlanText(c: AppContainer, ctx: BotContext): Promise<void> {
  const user = await resolveUser(c, ctx);
  if (!user) return;
  const text = ctx.message?.text ?? "";

  const tasks = await c.services.tasks.planDay(user.id, { text });
  if (tasks.length === 0) {
    await ctx.reply(TEXT.noTasks);
    return;
  }
  await ctx.reply(TEXT.planSaved(tasks), { reply_markup: miniAppButton(c.env.MINI_APP_URL) });
}
