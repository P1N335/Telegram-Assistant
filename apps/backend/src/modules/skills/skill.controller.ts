import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { type AuthedRequest, requireUserId } from "../../shared/http/auth.middleware.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { SkillService } from "./skill.service.js";

const CreateSchema = z
  .object({ code: z.string().min(1).optional(), name: z.string().min(1).optional(), icon: z.string().optional() })
  .refine((d) => d.code || d.name, { message: "Нужен code (шаблон) или name (кастомный)" });

export function createSkillsController(skills: SkillService): Router {
  const router = Router();

  // GET /api/skills — скиллы пользователя
  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      res.json({ skills: await skills.listSkills(requireUserId(req)) });
    }),
  );

  // GET /api/skills/roadmap — каталог шаблонов со статусом «добавлен»
  router.get(
    "/roadmap",
    asyncHandler(async (req: AuthedRequest, res) => {
      res.json({ roadmap: await skills.listRoadmap(requireUserId(req)) });
    }),
  );

  // POST /api/skills — добавить скилл
  router.post(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
      res.status(201).json({ skill: await skills.addSkill(requireUserId(req), parsed.data) });
    }),
  );

  return router;
}
