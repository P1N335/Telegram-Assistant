import cron, { type ScheduledTask } from "node-cron";
import type { AppContainer } from "../shared/di/container.js";

/**
 * Scheduler runtime — отправка утренних/вечерних сообщений с учётом таймзоны.
 * node-cron, тик в начале каждого часа. Идемпотентность гарантирует NotificationService
 * (dedupeKey), поэтому при нескольких worker'ах дубли исключены.
 * При росте заменяется на BullMQ + Redis — SchedulerService остаётся прежним.
 */
export async function startSchedulerRuntime(c: AppContainer): Promise<() => Promise<void>> {
  const log = c.logger.child({ runtime: "scheduler" });

  const task: ScheduledTask = cron.schedule("0 * * * *", () => {
    void c.services.scheduler.tick().catch((err) => log.error({ err }, "Ошибка тика планировщика"));
  });

  log.info(
    { morning: c.env.MORNING_HOUR, evening: c.env.EVENING_HOUR },
    "Scheduler runtime запущен (ежечасный тик)",
  );

  return async () => {
    task.stop();
    log.info("Scheduler runtime остановлен");
  };
}
