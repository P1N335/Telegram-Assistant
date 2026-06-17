import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../modules/users/auth.service.js";
import { UnauthorizedError } from "../errors/index.js";

/** Расширяем Request полем userId после успешной проверки JWT. */
export interface AuthedRequest extends Request {
  userId?: string;
}

/** Фабрика middleware: проверяет Bearer-токен и кладёт userId в req. */
export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Нет Bearer-токена");
    }
    const payload = authService.verifyToken(header.slice(7));
    req.userId = payload.sub;
    next();
  };
}

/** Гарантированно достаёт userId (после auth middleware). */
export function requireUserId(req: AuthedRequest): string {
  if (!req.userId) throw new UnauthorizedError();
  return req.userId;
}
