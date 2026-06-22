import type { PrismaClient } from "@tpc/database";
import type { Env } from "../../config/env.js";
import type { Logger } from "../logger.js";
import type { LLMProvider } from "../ai/llm-provider.js";
import type { EventBus } from "../events/event-bus.js";
import type { IUserRepository } from "../../modules/users/user.repository.js";
import type { ITaskRepository } from "../../modules/tasks/task.repository.js";
import type { IReflectionRepository } from "../../modules/reflection/reflection.repository.js";
import type { INotificationRepository } from "../../modules/notifications/notification.repository.js";
import type { IGamificationRepository } from "../../modules/gamification/gamification.repository.js";
import type { IAchievementRepository } from "../../modules/gamification/achievement.repository.js";
import type { IPetRepository } from "../../modules/pet/pet.repository.js";
import type { IHabitRepository } from "../../modules/habits/habit.repository.js";
import type { ISubscriptionRepository } from "../../modules/subscription/subscription.repository.js";
import type { UserService } from "../../modules/users/user.service.js";
import type { AuthService } from "../../modules/users/auth.service.js";
import type { TaskService } from "../../modules/tasks/task.service.js";
import type { ReflectionService } from "../../modules/reflection/reflection.service.js";
import type { NotificationService } from "../../modules/notifications/notification.service.js";
import type { SchedulerService } from "../../modules/scheduling/scheduler.service.js";
import type { GamificationService } from "../../modules/gamification/gamification.service.js";
import type { AchievementService } from "../../modules/gamification/achievement.service.js";
import type { PetService } from "../../modules/pet/pet.service.js";
import type { HabitService } from "../../modules/habits/habit.service.js";
import type { EntitlementService } from "../../modules/subscription/entitlement.service.js";

/**
 * Контейнер зависимостей (composition root собирает его в config/container.ts).
 * Все runtime'ы (http/bot/scheduler) получают один и тот же набор сервисов —
 * единый источник зависимостей, без дублирования инициализации.
 */
export interface AppContainer {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  ai: LLMProvider;
  eventBus: EventBus;
  repositories: {
    users: IUserRepository;
    tasks: ITaskRepository;
    reflection: IReflectionRepository;
    notifications: INotificationRepository;
    gamification: IGamificationRepository;
    achievements: IAchievementRepository;
    pet: IPetRepository;
    habits: IHabitRepository;
    subscriptions: ISubscriptionRepository;
  };
  services: {
    auth: AuthService;
    users: UserService;
    tasks: TaskService;
    reflection: ReflectionService;
    notifications: NotificationService;
    scheduler: SchedulerService;
    gamification: GamificationService;
    achievements: AchievementService;
    pet: PetService;
    habits: HabitService;
    entitlements: EntitlementService;
  };
}
