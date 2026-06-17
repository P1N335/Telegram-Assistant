import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { UserService } from "./user.service.js";

/** Роуты текущего пользователя (защищённые). */
export function createUsersController(userService: UserService): Router {
  const router = Router();

  // GET /api/users/me — профиль + статистика
  router.get(
    "/me",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const user = await userService.getById(userId);
      const stats = await userService.getStatistics(userId);
      res.json({ user: UserService.toDto(user), statistics: UserService.toStatisticsDto(stats) });
    }),
  );

  return router;
}
