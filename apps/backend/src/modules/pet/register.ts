import type { Logger } from "../../shared/logger.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import { TaskStatus } from "@tpc/shared";
import type { PetService, PetReward } from "./pet.service.js";

/** Награды питомцу за активность пользователя (конфиг). */
const REWARDS = {
  plan: { xp: 10, moodBoost: 10, energyBoost: 5 },
  taskDone: { xp: 5, moodBoost: 5, energyBoost: 3 },
  reflection: { xp: 10, moodBoost: 10, energyBoost: 10 },
  dayComplete: { xp: 20, moodBoost: 15, energyBoost: 10 },
} satisfies Record<string, PetReward>;

/**
 * Питомец растёт на тех же доменных событиях, что и геймификация — отдельным подписчиком.
 * Награды fire-and-forget: точное состояние не критично для немедленного ответа.
 */
export function registerPet(bus: EventBus, pet: PetService, logger: Logger): void {
  const safe = (p: Promise<void>) => void p.catch((err) => logger.warn({ err }, "pet reward failed"));

  bus.on("PlanCreated", (e) => safe(pet.reward(e.userId, REWARDS.plan)));
  bus.on("ReflectionSubmitted", (e) => safe(pet.reward(e.userId, REWARDS.reflection)));
  bus.on("DayCompleted", (e) => safe(pet.reward(e.userId, REWARDS.dayComplete)));
  bus.on("TaskStatusChanged", (e) => {
    if (e.status === TaskStatus.COMPLETED && e.previousStatus !== TaskStatus.COMPLETED) {
      safe(pet.reward(e.userId, REWARDS.taskDone));
    }
  });
}
