import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { TaskService } from "./task.service.js";

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Period = z.enum(["DAY", "WEEK", "MONTH", "YEAR"]);
const Status = z.enum(["PENDING", "COMPLETED", "SKIPPED", "POSTPONED"]);

const PlanSchema = z
  .object({
    text: z.string().optional(),
    tasks: z.array(z.object({ title: z.string().min(1), description: z.string().optional() })).optional(),
    date: DateStr.optional(),
  })
  .refine((d) => d.text || (d.tasks && d.tasks.length > 0), { message: "Нужен text или непустой tasks" });

const SkillCode = z.string().max(100).nullable().optional();

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  period: Period,
  dueDate: z.string().datetime().nullable().optional(),
  date: DateStr.optional(),
  subtasks: z.array(z.string()).optional(),
  skillCode: SkillCode,
});

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  skillCode: SkillCode,
});

export function createTasksController(taskService: TaskService): Router {
  const router = Router();

  // GET /api/tasks?period=DAY&date=YYYY-MM-DD
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const period = req.query.period ? Period.parse(req.query.period) : "DAY";
      const date = req.query.date ? DateStr.parse(req.query.date) : undefined;
      res.json({ tasks: await taskService.listForPeriod(userId, period, date) });
    }),
  );

  // POST /api/tasks — создать одиночную задачу
  router.post(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      res.status(201).json({ task: await taskService.createTask(userId, parsed.data) });
    }),
  );

  // POST /api/tasks/plan — дневной план (бот / списком)
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
      const parsed = z.object({ status: Status }).safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Некорректный статус");
      const id = z.string().min(1).parse(req.params.id);
      res.json({ task: await taskService.setStatus(userId, id, parsed.data.status) });
    }),
  );

  // PATCH /api/tasks/:id — заголовок / дедлайн
  router.patch(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      const id = z.string().min(1).parse(req.params.id);
      res.json({ task: await taskService.updateTask(userId, id, parsed.data) });
    }),
  );

  // DELETE /api/tasks/:id
  router.delete(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const id = z.string().min(1).parse(req.params.id);
      await taskService.deleteTask(userId, id);
      res.status(204).end();
    }),
  );

  // POST /api/tasks/:id/subtasks
  router.post(
    "/:id/subtasks",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const parsed = z.object({ title: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Пустая подзадача");
      const id = z.string().min(1).parse(req.params.id);
      res.status(201).json({ subtask: await taskService.addSubtask(userId, id, parsed.data.title) });
    }),
  );

  return router;
}
