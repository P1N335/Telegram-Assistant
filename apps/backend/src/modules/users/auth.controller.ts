import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { AuthService } from "./auth.service.js";

const BodySchema = z.object({ initData: z.string().min(1) });

/** POST /api/auth/telegram — обмен Telegram initData на JWT. Публичный роут. */
export function createAuthController(authService: AuthService): Router {
  const router = Router();

  router.post(
    "/telegram",
    asyncHandler(async (req, res) => {
      const parsed = BodySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Требуется поле initData");
      const result = await authService.authenticate(parsed.data.initData);
      res.json(result);
    }),
  );

  return router;
}
