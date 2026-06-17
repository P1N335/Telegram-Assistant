import pino from "pino";

/**
 * Структурированный логгер. Один инстанс на процесс; модули создают child-логгеры
 * через logger.child({ module: "tasks" }) для контекста.
 */
export function createLogger(level: string, pretty: boolean) {
  return pino({
    level,
    transport: pretty
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
