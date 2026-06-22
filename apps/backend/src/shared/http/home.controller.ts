import { Router } from "express";
import type { HomeResponse } from "@tpc/shared";
import { asyncHandler } from "./async-handler.js";
import { type AuthedRequest, requireUserId } from "./auth.middleware.js";
import { UserService } from "../../modules/users/user.service.js";
import type { TaskService } from "../../modules/tasks/task.service.js";
import type { PetService } from "../../modules/pet/pet.service.js";
import type { EntitlementService } from "../../modules/subscription/entitlement.service.js";

/**
 * Фасад главного экрана Mini App: профиль + статистика + задачи + питомец + премиум-статус.
 */
export function createHomeController(
  userService: UserService,
  taskService: TaskService,
  petService: PetService,
  entitlements: EntitlementService,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const userId = requireUserId(req);
      const [user, stats, tasks, pet, premium] = await Promise.all([
        userService.getById(userId),
        userService.getStatistics(userId),
        taskService.listForDay(userId),
        petService.getView(userId),
        entitlements.getStatus(userId),
      ]);
      const body: HomeResponse = {
        user: UserService.toDto(user),
        statistics: UserService.toStatisticsDto(stats),
        tasks,
        pet,
        premium,
      };
      res.json(body);
    }),
  );

  return router;
}
