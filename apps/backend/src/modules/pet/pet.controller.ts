import { Router } from "express";
import { z } from "zod";
import { PremiumFeature } from "@tpc/shared";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import { requireFeature } from "../subscription/require-feature.js";
import type { EntitlementService } from "../subscription/entitlement.service.js";
import type { PetService } from "./pet.service.js";

const UpdateSchema = z
  .object({ name: z.string().optional(), speciesCode: z.string().min(1).optional() })
  .refine((d) => d.name !== undefined || d.speciesCode !== undefined, {
    message: "Укажите имя или вид",
  });

const CreatePetSchema = z.object({
  name: z.string().optional(),
  speciesCode: z.string().min(1).optional(),
});

/**
 * Питомец: текущее состояние + кастомизация + мульти-петы.
 *  GET   /api/pet                          — активный питомец (с ленивым decay)
 *  GET   /api/pet/customization            — каталог вариантов внешнего вида + текущий выбор (всем)
 *  PATCH /api/pet                          — сменить имя/вид активного (PremiumFeature.PET_CUSTOMIZATION)
 *  GET   /api/pet/collection               — все питомцы пользователя + активный (всем)
 *  POST  /api/pet/collection               — создать доп. питомца (PremiumFeature.MULTI_PET)
 *  POST  /api/pet/collection/:id/activate  — выбрать активного питомца (всем, среди своих)
 */
export function createPetController(petService: PetService, entitlements: EntitlementService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      res.json({ pet: await petService.getView(userId) });
    }),
  );

  router.get(
    "/customization",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      res.json({ customization: await petService.getCustomization(userId) });
    }),
  );

  router.patch(
    "/",
    requireFeature(entitlements, PremiumFeature.PET_CUSTOMIZATION),
    asyncHandler(async (req: AuthedRequest, res) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      const userId = requireUserId(req);
      res.json({ pet: await petService.customize(userId, parsed.data) });
    }),
  );

  router.get(
    "/collection",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      res.json({ collection: await petService.getCollection(userId) });
    }),
  );

  router.post(
    "/collection",
    requireFeature(entitlements, PremiumFeature.MULTI_PET),
    asyncHandler(async (req: AuthedRequest, res) => {
      const parsed = CreatePetSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      const userId = requireUserId(req);
      res.json({ collection: await petService.createPet(userId, parsed.data) });
    }),
  );

  router.post(
    "/collection/:id/activate",
    asyncHandler(async (req: AuthedRequest, res) => {
      const petId = req.params.id;
      if (!petId) throw new ValidationError("Не указан питомец");
      const userId = requireUserId(req);
      res.json({ collection: await petService.activatePet(userId, petId) });
    }),
  );

  return router;
}
