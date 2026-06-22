import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { HabitService } from "./habit.service.js";

const CreateSchema = z.object({
  title: z.string().min(1),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cadence: z.enum(["DAILY", "EVERY_N_DAYS", "WEEKLY"]),
  intervalDays: z.number().int().min(1).optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).optional(),
  xpReward: z.number().int().min(0).max(100).optional(),
  xpPenalty: z.number().int().min(0).max(100).optional(),
});

export function createHabitsController(habitService: HabitService): Router {
  const router = Router();

  // GET /api/habits — привычки на сегодня (со статусом)
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      res.json({ habits: await habitService.listForToday(userId) });
    }),
  );

  // POST /api/habits — создать привычку
  router.post(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      res.status(201).json({ habit: await habitService.createHabit(userId, parsed.data) });
    }),
  );

  // POST /api/habits/:id/complete — отметить выполнение на сегодня
  router.post(
    "/:id/complete",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const id = z.string().min(1).parse(req.params.id);
      res.json({ habit: await habitService.complete(userId, id) });
    }),
  );

  // DELETE /api/habits/:id
  router.delete(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const id = z.string().min(1).parse(req.params.id);
      await habitService.deleteHabit(userId, id);
      res.status(204).end();
    }),
  );

  return router;
}
