import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import type { AchievementService } from "./achievement.service.js";

/** GET /api/achievements — каталог достижений со статусом для пользователя. */
export function createAchievementsController(service: AchievementService): Router {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      res.json({ achievements: await service.listForUser(requireUserId(req)) });
    }),
  );
  return router;
}
