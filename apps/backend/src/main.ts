import { loadEnv } from "./config/env.js";
import { createLogger } from "./shared/logger.js";
import { configureClock } from "./shared/clock.js";
import { createContainer } from "./config/container.js";
import { startHttpRuntime } from "./runtimes/http.runtime.js";
import { startBotRuntime } from "./runtimes/bot.runtime.js";
import { startSchedulerRuntime } from "./runtimes/scheduler.runtime.js";

/**
 * Точка входа backend. Один кодовый base, три независимых runtime.
 * RUN_MODE решает, что поднять в этом процессе:
 *   all    → http + bot + scheduler (старт, один контейнер)
 *   api    → только http
 *   bot    → только bot
 *   worker → только scheduler
 * DI-контейнер собирается один раз и передаётся во все runtime'ы.
 */
async function bootstrap(): Promise<void> {
  const env = loadEnv();
  configureClock(env.CLOCK_OFFSET_MINUTES);
  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV !== "production");
  logger.info({ mode: env.RUN_MODE, env: env.NODE_ENV }, "🚀 Запуск Telegram Productivity Companion");

  const container = createContainer(env, logger);

  const stoppers: Array<() => Promise<void>> = [];
  const wants = (m: "api" | "bot" | "worker") => env.RUN_MODE === "all" || env.RUN_MODE === m;

  if (wants("api")) stoppers.push(await startHttpRuntime(container));
  if (wants("bot")) stoppers.push(await startBotRuntime(container));
  if (wants("worker")) stoppers.push(await startSchedulerRuntime(container));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Остановка…");
    await Promise.allSettled(stoppers.map((stop) => stop()));
    await container.prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Фатальная ошибка при старте:", err);
  process.exit(1);
});
