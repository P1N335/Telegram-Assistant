import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import type { PetService } from "./pet.service.js";

/** GET /api/pet — текущее состояние питомца (с ленивым decay). */
export function createPetController(petService: PetService): Router {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      res.json({ pet: await petService.getView(userId) });
    }),
  );
  return router;
}
