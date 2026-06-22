import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { AppError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { now } from "../../shared/clock.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { EntitlementService } from "./entitlement.service.js";

/** Защита admin-роутов по заголовку x-admin-token. Если токен не задан — раздел выключен. */
function requireAdmin(adminToken: string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!adminToken) return next(new NotFoundError());
    if (req.header("x-admin-token") !== adminToken) return next(new AppError(403, "Доступ запрещён", "FORBIDDEN"));
    next();
  };
}

const GrantSchema = z.object({
  telegramId: z.union([z.string(), z.number()]),
  days: z.number().int().min(1).optional(), // null/нет = бессрочно
});

const RevokeSchema = z.object({ telegramId: z.union([z.string(), z.number()]) });

/**
 * Ручная выдача/отзыв премиума (тест + будущая интеграция платежей).
 * POST /api/admin/premium/grant   { telegramId, days? }
 * POST /api/admin/premium/revoke  { telegramId }
 */
export function createAdminController(
  entitlements: EntitlementService,
  users: IUserRepository,
  adminToken: string | undefined,
): Router {
  const router = Router();
  router.use(requireAdmin(adminToken));

  router.post(
    "/premium/grant",
    asyncHandler(async (req, res) => {
      const parsed = GrantSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Нужен telegramId");
      const user = await users.findByTelegramId(BigInt(parsed.data.telegramId));
      if (!user) throw new NotFoundError("Пользователь не найден");
      const until = parsed.data.days ? new Date(now().getTime() + parsed.data.days * 86_400_000) : null;
      await entitlements.grant(user.id, { until });
      res.json({ premium: await entitlements.getStatus(user.id) });
    }),
  );

  router.post(
    "/premium/revoke",
    asyncHandler(async (req, res) => {
      const parsed = RevokeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Нужен telegramId");
      const user = await users.findByTelegramId(BigInt(parsed.data.telegramId));
      if (!user) throw new NotFoundError("Пользователь не найден");
      await entitlements.revoke(user.id);
      res.json({ premium: await entitlements.getStatus(user.id) });
    }),
  );

  return router;
}
