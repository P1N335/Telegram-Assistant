import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { TaskService } from "./task.service.js";

const DateQuery = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const PlanSchema = z
  .object({
    text: z.string().optional(),
    tasks: z.array(z.object({ title: z.string().min(1), description: z.string().optional() })).optional(),
    date: DateQuery.optional(),
  })
  .refine((d) => d.text || (d.tasks && d.tasks.length > 0), {
    message: "Нужен text или непустой tasks",
  });

const StatusSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "SKIPPED", "POSTPONED"]),
});

export function createTasksController(taskService: TaskService): Router {
  const router = Router();

  // GET /api/tasks?date=YYYY-MM-DD
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const date = req.query.date ? DateQuery.parse(req.query.date) : undefined;
      res.json({ tasks: await taskService.listForDay(userId, date) });
    }),
  );

  // POST /api/tasks/plan
  router.post(
    "/plan",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = PlanSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      res.status(201).json({ tasks: await taskService.planDay(userId, parsed.data) });
    }),
  );

  // PATCH /api/tasks/:id/status
  router.patch(
    "/:id/status",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = StatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Некорректный статус");
      const id = z.string().min(1).parse(req.params.id);
      res.json({ task: await taskService.setStatus(userId, id, parsed.data.status) });
    }),
  );

  return router;
}
