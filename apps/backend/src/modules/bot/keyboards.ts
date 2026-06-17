import { InlineKeyboard } from "grammy";
import type { TaskDto } from "@tpc/shared";

/** Кнопка запуска Mini App (требует https-URL в проде). */
export function miniAppButton(url: string): InlineKeyboard {
  return new InlineKeyboard().webApp("📱 Открыть приложение", url);
}

/** Утреннее сообщение: только запуск приложения (план вводится текстом). */
export function morningKeyboard(url: string): InlineKeyboard {
  return miniAppButton(url);
}

/** Вечернее сообщение: запустить рефлексию или открыть приложение. */
export function eveningKeyboard(url: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("📝 Заполнить отчёт", "reflect:start")
    .row()
    .webApp("📱 Открыть приложение", url);
}

/** Под каждой задачей — действия смены статуса (callback task:<id>:<STATUS>). */
export function tasksKeyboard(tasks: TaskDto[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  tasks.forEach((t, i) => {
    kb.text(`✅ ${i + 1}`, `task:${t.id}:COMPLETED`)
      .text(`⏭️ ${i + 1}`, `task:${t.id}:SKIPPED`)
      .text(`⌛️ ${i + 1}`, `task:${t.id}:POSTPONED`)
      .row();
  });
  return kb;
}
