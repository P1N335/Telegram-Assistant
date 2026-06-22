import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { UserService } from "./user.service.js";
import type { EntitlementService } from "../subscription/entitlement.service.js";

/** Роуты текущего пользователя (защищённые). */
export function createUsersController(userService: UserService, entitlements: EntitlementService): Router {
  const router = Router();

  // GET /api/users/me — профиль + статистика + премиум-статус
  router.get(
    "/me",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const [user, stats, premium] = await Promise.all([
        userService.getById(userId),
        userService.getStatistics(userId),
        entitlements.getStatus(userId),
      ]);
      res.json({
        user: UserService.toDto(user),
        statistics: UserService.toStatisticsDto(stats),
        premium,
      });
    }),
  );

  return router;
}
