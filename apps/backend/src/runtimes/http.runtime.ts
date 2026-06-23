import express from "express";
import { pinoHttp } from "pino-http";
import type { AppContainer } from "../shared/di/container.js";
import { createAuthMiddleware } from "../shared/http/auth.middleware.js";
import { createCors } from "../shared/http/cors.js";
import { errorHandler } from "../shared/http/error-handler.js";
import { createAuthController } from "../modules/users/auth.controller.js";
import { createUsersController } from "../modules/users/users.controller.js";
import { createTasksController } from "../modules/tasks/tasks.controller.js";
import { createSubtasksController } from "../modules/tasks/subtasks.controller.js";
import { createPetController } from "../modules/pet/pet.controller.js";
import { createHabitsController } from "../modules/habits/habit.controller.js";
import { createAchievementsController } from "../modules/gamification/achievements.controller.js";
import { createSkillsController } from "../modules/skills/skill.controller.js";
import { createLeaderboardController } from "../modules/leaderboard/leaderboard.controller.js";
import { createPremiumController } from "../modules/subscription/premium.controller.js";
import { createAdminController } from "../modules/subscription/admin.controller.js";
import { createHomeController } from "../shared/http/home.controller.js";

/**
 * HTTP runtime — собирает Express-приложение из feature-контроллеров и DI-контейнера.
 * Публичный роут — только /api/auth/telegram; остальное за JWT-мidдлвэром.
 */
export async function startHttpRuntime(c: AppContainer): Promise<() => Promise<void>> {
  const log = c.logger.child({ runtime: "http" });
  const app = express();

  app.use(createCors(c.env.CORS_ORIGINS)); // до роутов: обрабатывает preflight
  app.use(express.json({ limit: "256kb" }));
  app.use(pinoHttp({ logger: log }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Публичные роуты
  app.use("/api/auth", createAuthController(c.services.auth));

  // Защищённые роуты
  const auth = createAuthMiddleware(c.services.auth);
  app.use("/api/users", auth, createUsersController(c.services.users, c.services.entitlements));
  app.use("/api/tasks", auth, createTasksController(c.services.tasks));
  app.use("/api/subtasks", auth, createSubtasksController(c.services.tasks));
  app.use("/api/pet", auth, createPetController(c.services.pet));
  app.use("/api/habits", auth, createHabitsController(c.services.habits));
  app.use("/api/achievements", auth, createAchievementsController(c.services.achievements));
  app.use("/api/skills", auth, createSkillsController(c.services.skills));
  app.use("/api/leaderboard", auth, createLeaderboardController(c.services.leaderboard));
  app.use("/api/premium", auth, createPremiumController(c.services.entitlements));
  app.use(
    "/api/home",
    auth,
    createHomeController(c.services.users, c.services.tasks, c.services.pet, c.services.entitlements),
  );

  // Admin (защита по x-admin-token внутри; выключено, если ADMIN_TOKEN не задан)
  app.use(
    "/api/admin",
    createAdminController(c.services.entitlements, c.repositories.users, c.env.ADMIN_TOKEN),
  );

  app.use(errorHandler(log));

  const server = app.listen(c.env.PORT, () => log.info({ port: c.env.PORT }, "HTTP runtime запущен"));

  return () =>
    new Promise<void>((resolve) => {
      server.close(() => {
        log.info("HTTP runtime остановлен");
        resolve();
      });
    });
}
