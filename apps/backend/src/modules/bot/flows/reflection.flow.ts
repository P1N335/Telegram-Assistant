import type { AppContainer } from "../../../shared/di/container.js";
import type { ReflectionData } from "../../reflection/reflection.repository.js";
import type { BotContext, ReflectionAnswers } from "../context.js";
import { resolveUser } from "../resolve-user.js";
import { miniAppButton } from "../keyboards.js";
import { TEXT } from "../text.js";

const ORDER: Array<keyof ReflectionAnswers> = [
  "howWasDay",
  "summary",
  "goodThings",
  "difficulties",
  "rating",
];

/** Запускает пошаговый диалог рефлексии. */
export async function startReflection(ctx: BotContext): Promise<void> {
  ctx.session.reflection = { step: 0, answers: {} };
  await ctx.reply(TEXT.reflection.questions[0]!);
}

/**
 * Обрабатывает очередной ответ. Возвращает true, если сообщение «поглощено» рефлексией
 * (тогда планировщик текста его не трогает).
 */
export async function handleReflectionStep(c: AppContainer, ctx: BotContext): Promise<boolean> {
  const state = ctx.session.reflection;
  if (!state) return false;

  const field = ORDER[state.step]!;
  const raw = (ctx.message?.text ?? "").trim();

  if (field === "rating") {
    const rating = Number.parseInt(raw, 10);
    if (Number.isNaN(rating) || rating < 1 || rating > 10) {
      await ctx.reply(TEXT.reflection.badRating);
      return true;
    }
    state.answers.rating = rating;
  } else {
    state.answers[field] = raw;
  }

  state.step += 1;

  if (state.step < ORDER.length) {
    await ctx.reply(TEXT.reflection.questions[state.step]!);
    return true;
  }

  // Завершение: сохраняем отчёт.
  await finalize(c, ctx, state.answers as ReflectionAnswers);
  ctx.session.reflection = undefined;
  return true;
}

async function finalize(c: AppContainer, ctx: BotContext, answers: ReflectionAnswers): Promise<void> {
  const user = await resolveUser(c, ctx);
  if (!user) return;

  const data: ReflectionData = {
    howWasDay: answers.howWasDay,
    summary: answers.summary,
    goodThings: answers.goodThings,
    difficulties: answers.difficulties,
    rating: answers.rating,
  };

  const { insight } = await c.services.reflection.submit(user.id, data);
  const message = TEXT.reflection.done + (insight ? TEXT.reflection.insight(insight) : "");
  await ctx.reply(message, { reply_markup: miniAppButton(c.env.MINI_APP_URL) });
}
