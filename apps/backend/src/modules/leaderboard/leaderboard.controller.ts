import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { LEADERBOARD_MAX_LIMIT, type LeaderboardService } from "./leaderboard.service.js";

// Query coerce: ?limit & ?offset приходят строками. Невалидные значения отбрасываются
// (.catch(undefined)), итоговый клампинг — в сервисе (единый источник правды).
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LEADERBOARD_MAX_LIMIT).optional().catch(undefined),
  offset: z.coerce.number().int().min(0).optional().catch(undefined),
});

/** GET /api/leaderboard?limit&offset — топ по XP + место текущего пользователя. */
export function createLeaderboardController(service: LeaderboardService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const { limit, offset } = QuerySchema.parse(req.query);
      res.json(await service.getLeaderboard(requireUserId(req), { limit, offset }));
    }),
  );

  return router;
}
