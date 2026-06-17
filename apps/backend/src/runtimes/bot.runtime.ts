import type { AppContainer } from "../shared/di/container.js";
import { createBot } from "../modules/bot/index.js";

/**
 * Bot runtime — Telegram-бот (grammY).
 * Dev: long-polling. Prod: webhook (горизонтально масштабируется, в отличие от polling).
 */
export async function startBotRuntime(c: AppContainer): Promise<() => Promise<void>> {
  const log = c.logger.child({ runtime: "bot" });
  const bot = createBot(c);

  if (c.env.TELEGRAM_USE_WEBHOOK) {
    if (!c.env.TELEGRAM_WEBHOOK_DOMAIN) {
      log.error("TELEGRAM_USE_WEBHOOK=true, но TELEGRAM_WEBHOOK_DOMAIN не задан");
    } else {
      const url = `${c.env.TELEGRAM_WEBHOOK_DOMAIN}/telegram/webhook`;
      await bot.api.setWebhook(url, { secret_token: c.env.TELEGRAM_WEBHOOK_SECRET });
      log.info({ url }, "Webhook установлен (приём апдейтов поднимается в HTTP runtime)");
      // Приём webhook-запросов монтируется в http.runtime через webhookCallback (Этап деплоя).
    }
    return async () => {
      log.info("Bot runtime остановлен (webhook)");
    };
  }

  // Polling — гарантированно убираем webhook, чтобы не конфликтовал.
  await bot.api.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined);
  void bot.start({ onStart: (me) => log.info({ username: me.username }, "Bot runtime запущен (polling)") });

  return async () => {
    await bot.stop();
    log.info("Bot runtime остановлен (polling)");
  };
}
