import type { Request, Response, NextFunction } from "express";

/**
 * Минимальный CORS без внешних зависимостей. Нужен, когда фронт (GitHub Pages)
 * и API на разных доменах. Авторизация у нас по Bearer-токену (не cookie),
 * поэтому credentials не требуются.
 */
export function createCors(origins: string[]) {
  const allow = new Set(origins);
  const wildcard = allow.has("*");

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && (wildcard || allow.has(origin))) {
      res.setHeader("Access-Control-Allow-Origin", wildcard ? "*" : origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,ngrok-skip-browser-warning");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204); // preflight — без аутентификации
      return;
    }
    next();
  };
}
