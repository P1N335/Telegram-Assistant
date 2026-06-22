import type { Response, NextFunction } from "express";
import type { PremiumFeature } from "@tpc/shared";
import { AppError, UnauthorizedError } from "../../shared/errors/index.js";
import type { AuthedRequest } from "../../shared/http/auth.middleware.js";
import type { EntitlementService } from "./entitlement.service.js";

/**
 * Guard для будущих платных роутов: пускает только при наличии фичи в подписке,
 * иначе 402 FEATURE_LOCKED. Сейчас не навешан ни на один роут (всё бесплатно).
 */
export function requireFeature(entitlements: EntitlementService, feature: PremiumFeature) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.userId) return next(new UnauthorizedError());
    entitlements
      .hasFeature(req.userId, feature)
      .then((ok) => next(ok ? undefined : new AppError(402, "Доступно по подписке Premium", "FEATURE_LOCKED")))
      .catch(next);
  };
}
