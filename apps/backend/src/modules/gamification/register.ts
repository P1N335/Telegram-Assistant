import type { Logger } from "../../shared/logger.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { DomainEvent } from "../../shared/events/domain-events.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { NotificationService } from "../notifications/notification.service.js";
import type { GamificationService, GamificationOutcome } from "./gamification.service.js";

export interface GamificationDeps {
  users: IUserRepository;
  notifications: NotificationService;
  logger: Logger;
}

/**
 * Подписывает геймификацию на доменные события и шлёт уведомления о
 * левел-апах/достижениях. Обновление статистики дожидаемся (консистентность ответа),
 * а отправку сообщений запускаем fire-and-forget, чтобы не тормозить запрос.
 */
export function registerGamification(
  bus: EventBus,
  service: GamificationService,
  deps: GamificationDeps,
): void {
  const handle = async (event: DomainEvent) => {
    const outcome = await service.handle(event);
    if (outcome && (outcome.leveledUpTo || outcome.unlocked.length > 0)) {
      void notify(outcome).catch((err) => deps.logger.warn({ err }, "Уведомление геймификации не отправлено"));
    }
  };

  bus.on("PlanCreated", handle);
  bus.on("TaskStatusChanged", handle);
  bus.on("ReflectionSubmitted", handle);
  bus.on("DayCompleted", handle);
  bus.on("HabitCompleted", handle);
  bus.on("HabitMissed", handle);

  async function notify(outcome: GamificationOutcome): Promise<void> {
    const user = await deps.users.findById(outcome.userId);
    if (!user) return;
    const chatId = Number(user.telegramId);

    if (outcome.leveledUpTo) {
      await deps.notifications.sendOnce({
        userId: user.id,
        chatId,
        type: "ACHIEVEMENT_UNLOCKED",
        dedupeKey: `${user.id}:level:${outcome.leveledUpTo}`,
        text: `🎉 Новый уровень — ${outcome.leveledUpTo}! Так держать.`,
      });
    }
    for (const a of outcome.unlocked) {
      await deps.notifications.sendOnce({
        userId: user.id,
        chatId,
        type: "ACHIEVEMENT_UNLOCKED",
        dedupeKey: `${user.id}:ach:${a.code}`,
        text: `${a.icon ?? "🏆"} Достижение разблокировано: ${a.title}`,
      });
    }
  }
}
