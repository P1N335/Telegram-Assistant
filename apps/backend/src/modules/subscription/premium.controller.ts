import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import type { EntitlementService } from "./entitlement.service.js";

/** GET /api/premium — статус подписки текущего пользователя. */
export function createPremiumController(entitlements: EntitlementService): Router {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      res.json({ premium: await entitlements.getStatus(requireUserId(req)) });
    }),
  );
  return router;
}
