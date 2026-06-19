import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { TaskService } from "./task.service.js";

const UpdateSchema = z
  .object({ title: z.string().min(1).optional(), isDone: z.boolean().optional() })
  .refine((d) => d.title !== undefined || d.isDone !== undefined, { message: "Нечего обновлять" });

/** Роуты подзадач: /api/subtasks/:id (PATCH/DELETE). */
export function createSubtasksController(taskService: TaskService): Router {
  const router = Router();

  router.patch(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      const id = z.string().min(1).parse(req.params.id);
      res.json({ subtask: await taskService.updateSubtask(userId, id, parsed.data) });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const id = z.string().min(1).parse(req.params.id);
      await taskService.deleteSubtask(userId, id);
      res.status(204).end();
    }),
  );

  return router;
}
