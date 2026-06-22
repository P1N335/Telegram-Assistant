import { getPrisma } from "@tpc/database";
import type { Env } from "./env.js";
import type { Logger } from "../shared/logger.js";
import type { AppContainer } from "../shared/di/container.js";
import { EventBus } from "../shared/events/event-bus.js";
import { createLLMProvider } from "../shared/ai/providers.js";
import { PrismaUserRepository } from "../modules/users/user.repository.prisma.js";
import { PrismaTaskRepository } from "../modules/tasks/task.repository.prisma.js";
import { PrismaReflectionRepository } from "../modules/reflection/reflection.repository.prisma.js";
import { PrismaNotificationRepository } from "../modules/notifications/notification.repository.prisma.js";
import { PrismaGamificationRepository } from "../modules/gamification/gamification.repository.prisma.js";
import { PrismaAchievementRepository } from "../modules/gamification/achievement.repository.prisma.js";
import { GrammyApiSender } from "../modules/notifications/message-sender.js";
import { UserService } from "../modules/users/user.service.js";
import { AuthService } from "../modules/users/auth.service.js";
import { TaskService } from "../modules/tasks/task.service.js";
import { TaskParser } from "../modules/tasks/task.parser.js";
import { ReflectionService } from "../modules/reflection/reflection.service.js";
import { NotificationService } from "../modules/notifications/notification.service.js";
import { SchedulerService } from "../modules/scheduling/scheduler.service.js";
import { GamificationService } from "../modules/gamification/gamification.service.js";
import { registerGamification } from "../modules/gamification/register.js";
import { PrismaPetRepository } from "../modules/pet/pet.repository.prisma.js";
import { PetService } from "../modules/pet/pet.service.js";
import { registerPet } from "../modules/pet/register.js";
import { PrismaHabitRepository } from "../modules/habits/habit.repository.prisma.js";
import { HabitService } from "../modules/habits/habit.service.js";

/**
 * Composition root — единственное место связывания реализаций с сервисами через интерфейсы.
 * Здесь же геймификация подписывается на event-bus (Open/Closed: источники событий о ней не знают).
 */
export function createContainer(env: Env, logger: Logger): AppContainer {
  const prisma = getPrisma();
  const ai = createLLMProvider(env, logger);
  const eventBus = new EventBus(logger);

  // Repositories
  const userRepository = new PrismaUserRepository(prisma);
  const taskRepository = new PrismaTaskRepository(prisma);
  const reflectionRepository = new PrismaReflectionRepository(prisma);
  const notificationRepository = new PrismaNotificationRepository(prisma);
  const gamificationRepository = new PrismaGamificationRepository(prisma);
  const achievementRepository = new PrismaAchievementRepository(prisma);
  const petRepository = new PrismaPetRepository(prisma);
  const habitRepository = new PrismaHabitRepository(prisma);

  // Infra
  const sender = new GrammyApiSender(env.TELEGRAM_BOT_TOKEN);

  // Services
  const userService = new UserService(userRepository, env.DEFAULT_TIMEZONE);
  const authService = new AuthService(env.TELEGRAM_BOT_TOKEN, env.JWT_SECRET, env.JWT_TTL, userService);
  const taskService = new TaskService(taskRepository, userRepository, new TaskParser(), eventBus);
  const reflectionService = new ReflectionService(
    reflectionRepository,
    taskRepository,
    userRepository,
    ai,
    eventBus,
    logger,
  );
  const notificationService = new NotificationService(notificationRepository, sender, logger);
  const schedulerService = new SchedulerService(
    userRepository,
    taskRepository,
    habitRepository,
    notificationService,
    eventBus,
    env,
    logger,
  );
  const gamificationService = new GamificationService(gamificationRepository, achievementRepository, logger);
  const petService = new PetService(petRepository, "cat");
  const habitService = new HabitService(habitRepository, userRepository, eventBus);

  // Подписки на доменные события
  registerGamification(eventBus, gamificationService, {
    users: userRepository,
    notifications: notificationService,
    logger,
  });
  registerPet(eventBus, petService, logger);

  return {
    env,
    logger,
    prisma,
    ai,
    eventBus,
    repositories: {
      users: userRepository,
      tasks: taskRepository,
      reflection: reflectionRepository,
      notifications: notificationRepository,
      gamification: gamificationRepository,
      achievements: achievementRepository,
      pet: petRepository,
      habits: habitRepository,
    },
    services: {
      auth: authService,
      users: userService,
      tasks: taskService,
      reflection: reflectionService,
      notifications: notificationService,
      scheduler: schedulerService,
      gamification: gamificationService,
      pet: petService,
      habits: habitService,
    },
  };
}
