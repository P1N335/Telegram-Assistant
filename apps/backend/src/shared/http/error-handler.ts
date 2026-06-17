import type { ErrorRequestHandler } from "express";
import type { Logger } from "../logger.js";
import { AppError } from "../errors/index.js";

/** Централизованная обработка ошибок → единый JSON-формат ApiErrorResponse. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      if (err.statusCode >= 500) logger.error({ err }, "AppError 5xx");
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    logger.error({ err }, "Необработанная ошибка");
    res.status(500).json({ error: { code: "INTERNAL", message: "Внутренняя ошибка сервера" } });
  };
}
